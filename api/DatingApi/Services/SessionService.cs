using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using DatingApi.Auth;
using DatingApi.Data;
using DatingApi.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DatingApi.Services;

public sealed record IssuedSession(string AccessToken, string RefreshToken, string Email, DateTime AccessExpiresAt);

/// <summary>Issues short-lived access JWTs backed by revocable, rotating refresh sessions.</summary>
public sealed class SessionService(AppDbContext db, IOptions<JwtOptions> jwtOptions)
{
    private readonly JwtOptions jwt = jwtOptions.Value;

    public async Task<IssuedSession> CreateAsync(AppUser user)
    {
        var refreshToken = CreateOpaqueToken();
        var session = new AuthSession
        {
            UserId = user.Id,
            TokenId = Guid.NewGuid().ToString("N"),
            RefreshTokenHash = Hash(refreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(jwt.RefreshTokenDays),
        };
        db.AuthSessions.Add(session);
        await db.SaveChangesAsync();
        return new IssuedSession(CreateAccessToken(user, session), refreshToken, user.Email ?? string.Empty, DateTime.UtcNow.AddMinutes(jwt.AccessTokenMinutes));
    }

    public async Task<IssuedSession?> RotateAsync(string refreshToken)
    {
        var session = await db.AuthSessions.SingleOrDefaultAsync(s => s.RefreshTokenHash == Hash(refreshToken));
        if (session == null) return null;

        // A previously rotated token is a replay signal: revoke the whole family.
        if (session.RevokedAt != null || session.ExpiresAt <= DateTime.UtcNow)
        {
            await RevokeFamilyAsync(session.Id);
            return null;
        }

        var user = await db.Users.FindAsync(session.UserId);
        if (user == null) return null;

        var nextRefreshToken = CreateOpaqueToken();
        var nextSession = new AuthSession
        {
            UserId = user.Id,
            TokenId = Guid.NewGuid().ToString("N"),
            RefreshTokenHash = Hash(nextRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(jwt.RefreshTokenDays),
        };
        session.RevokedAt = DateTime.UtcNow;
        session.ReplacedBySessionId = nextSession.Id;
        db.AuthSessions.Add(nextSession);
        await db.SaveChangesAsync();

        return new IssuedSession(CreateAccessToken(user, nextSession), nextRefreshToken, user.Email ?? string.Empty, DateTime.UtcNow.AddMinutes(jwt.AccessTokenMinutes));
    }

    public async Task RevokeAsync(string sessionId)
    {
        var session = await db.AuthSessions.FindAsync(sessionId);
        if (session == null || session.RevokedAt != null) return;
        await RevokeFamilyAsync(session.Id);
    }

    public Task<bool> IsActiveAsync(string sessionId, string tokenId) =>
        db.AuthSessions.AnyAsync(s => s.Id == sessionId && s.TokenId == tokenId && s.RevokedAt == null && s.ExpiresAt > DateTime.UtcNow);

    private async Task RevokeFamilyAsync(string sessionId)
    {
        var currentId = sessionId;
        while (!string.IsNullOrWhiteSpace(currentId))
        {
            var current = await db.AuthSessions.FindAsync(currentId);
            if (current == null) break;
            if (current.RevokedAt == null) current.RevokedAt = DateTime.UtcNow;
            currentId = current.ReplacedBySessionId ?? string.Empty;
        }
        await db.SaveChangesAsync();
    }

    private string CreateAccessToken(AppUser user, AuthSession session)
    {
        if (string.IsNullOrWhiteSpace(jwt.Key))
            throw new InvalidOperationException("Jwt:Key must be configured.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key));
        var now = DateTime.UtcNow;
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Jti, session.TokenId),
            new Claim("sid", session.Id),
        };
        return new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
            issuer: jwt.Issuer,
            audience: jwt.Audience,
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(jwt.AccessTokenMinutes),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)));
    }

    private static string CreateOpaqueToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(48))
        .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
