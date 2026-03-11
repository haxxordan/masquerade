using System.Text;
using System.Text.Json.Serialization;
using DatingApi.Auth;
using DatingApi.Data;
using DatingApi.Domain;
using DatingApi.Hubs;
using DatingApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(opts =>
        opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.Configure<AdminAuthOptions>(builder.Configuration.GetSection("AdminAuth"));
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

if (builder.Environment.IsDevelopment())
{
    // CORS — Expo web + Next.js dev servers
    builder.Services.AddCors(opts => opts.AddDefaultPolicy(p =>
        p.WithOrigins("http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:19006")
         .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
}

// PostgreSQL + EF Core
builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// Identity
builder.Services.AddIdentityCore<AppUser>(opts => opts.SignIn.RequireConfirmedAccount = false)
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// JWT
var jwtKey = builder.Configuration["Jwt:Key"]!;
var adminJwtKey = builder.Configuration["AdminAuth:JwtKey"];
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new()
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtKey)),
            ValidateIssuer = false,
            ValidateAudience = false
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
                return Task.CompletedTask;
            }
        };
    })
    .AddJwtBearer(AdminAuthConstants.Scheme, opts =>
    {
        var signingKey = string.IsNullOrWhiteSpace(adminJwtKey)
            ? "admin-auth-not-configured-change-me-before-login"
            : adminJwtKey;

        opts.TokenValidationParameters = new()
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(signingKey)),
            ValidateIssuer = false,
            ValidateAudience = false
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
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<MatchingService>();

var app = builder.Build();

if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<MatchHub>("/hubs/match");

app.Run();
