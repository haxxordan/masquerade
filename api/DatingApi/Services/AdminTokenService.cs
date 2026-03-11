using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DatingApi.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DatingApi.Services;

public class AdminTokenService(IOptions<AdminAuthOptions> options)
{
    private readonly AdminAuthOptions _options = options.Value;

    public string CreateToken()
    {
        if (!_options.IsConfigured)
            throw new InvalidOperationException("Admin authentication is not configured.");

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, $"admin:{_options.Email}"),
            new Claim(ClaimTypes.Email, _options.Email),
            new Claim(AdminAuthConstants.ClaimType, AdminAuthConstants.ClaimValue),
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.ASCII.GetBytes(_options.JwtKey)),
            SecurityAlgorithms.HmacSha256Signature);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(12),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}