using System.Text;
using System.Text.Json.Serialization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using DatingApi.Auth;
using DatingApi.Data;
using DatingApi.Domain;
using DatingApi.Features;
using DatingApi.Hubs;
using DatingApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(opts =>
        opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.Configure<AdminAuthOptions>(builder.Configuration.GetSection("AdminAuth"));
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<FeatureFlagsOptions>(builder.Configuration.GetSection("FeatureFlags"));
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("bearerAuth", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "JWT Authorization header using the Bearer scheme."
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "bearerAuth"
                }
            },
            new string[] {}
        }
    });
});

var configuredCorsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(opts => opts.AddDefaultPolicy(policy =>
{
    var origins = builder.Environment.IsDevelopment()
        ? new[] { "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:19006" }
        : configuredCorsOrigins;
    if (origins.Length > 0)
        policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
}));

// PostgreSQL + EF Core
builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// Identity
builder.Services.AddIdentityCore<AppUser>(opts =>
    {
        opts.SignIn.RequireConfirmedAccount = false;
        opts.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// JWT
var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "masquerade-api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "masquerade-clients";
if (string.IsNullOrWhiteSpace(jwtKey))
    throw new InvalidOperationException("Jwt:Key must be configured through the deployment secret manager.");
var adminAuth = builder.Configuration.GetSection("AdminAuth").Get<AdminAuthOptions>() ?? new();
var adminJwtKey = adminAuth.JwtKey;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new()
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
        // Allow token via query string for SignalR WebSocket connections
        opts.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) &&
                    ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                {
                    ctx.Token = token;
                }
                else if (ctx.Request.Cookies.TryGetValue("__Host-masq-access", out var cookieToken))
                {
                    ctx.Token = cookieToken;
                }
                return Task.CompletedTask;
            },
            OnTokenValidated = async ctx =>
            {
                var sessionId = ctx.Principal?.FindFirst("sid")?.Value;
                var tokenId = ctx.Principal?.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
                if (string.IsNullOrWhiteSpace(sessionId) || string.IsNullOrWhiteSpace(tokenId))
                {
                    ctx.Fail("A session-backed token is required.");
                    return;
                }

                var sessionService = ctx.HttpContext.RequestServices.GetRequiredService<SessionService>();
                if (!await sessionService.IsActiveAsync(sessionId, tokenId))
                    ctx.Fail("Session has expired or been revoked.");
            }
        };
    })
    .AddJwtBearer(AdminAuthConstants.Scheme, opts =>
    {
        var signingKey = string.IsNullOrWhiteSpace(adminJwtKey)
            ? Convert.ToBase64String(RandomNumberGenerator.GetBytes(64))
            : adminJwtKey;

        opts.TokenValidationParameters = new()
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["AdminAuth:Issuer"] ?? "masquerade-admin-api",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["AdminAuth:Audience"] ?? "masquerade-admin-clients",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
        opts.Events = new JwtBearerEvents
        {
            OnTokenValidated = ctx =>
            {
                if (!adminAuth.IsConfigured) ctx.Fail("Admin authentication is not configured.");
                return Task.CompletedTask;
            },
            OnMessageReceived = ctx =>
            {
                if (ctx.Request.Cookies.TryGetValue("__Host-masq-admin-access", out var cookieToken))
                    ctx.Token = cookieToken;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AdminAuthConstants.Policy, policy =>
    {
        policy.AddAuthenticationSchemes(AdminAuthConstants.Scheme);
        policy.RequireAuthenticatedUser();
        policy.RequireClaim(AdminAuthConstants.ClaimType, AdminAuthConstants.ClaimValue);
    });
});


builder.Services.AddSignalR();
builder.Services.AddScoped<AdminTokenService>();
builder.Services.AddScoped<SessionService>();
builder.Services.AddScoped<AuthenticationThrottleService>();
builder.Services.AddScoped<MatchingService>();
builder.Services.AddScoped<SmartOpenersService>();
builder.Services.AddScoped<ConversationNudgeService>();
builder.Services.AddScoped<RelationshipVisibilityService>();

var app = builder.Build();

if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }

app.UseCors();
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
});
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    if (!app.Environment.IsDevelopment())
        context.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000");
    await next();
});
app.UseAuthentication();
app.UseMiddleware<CookieCsrfMiddleware>();
app.UseAuthorization();
app.MapControllers();
app.MapHub<MatchHub>("/hubs/match");

app.Run();
