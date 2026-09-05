using DatingApi.Auth;
using DatingApi.DTOs;
using DatingApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;

namespace DatingApi.Controllers;

[ApiController]
[Route("api/admin/auth")]
public class AdminAuthController(
    IOptions<AdminAuthOptions> options,
    AdminTokenService tokenService,
    AuthenticationThrottleService throttles) : ControllerBase
{
    private readonly AdminAuthOptions _options = options.Value;

    [HttpPost("login")]
    public async Task<ActionResult<AdminBrowserSessionResponse>> Login(AdminLoginRequest request)
    {
        var throttle = await throttles.ConsumeAsync("admin-login", request.Email?.Trim() ?? string.Empty, HttpContext.Connection.RemoteIpAddress?.ToString());
        if (!throttle.Allowed)
        {
            Response.Headers.RetryAfter = Math.Ceiling(throttle.RetryAfter.TotalSeconds).ToString(System.Globalization.CultureInfo.InvariantCulture);
            return StatusCode(StatusCodes.Status429TooManyRequests, "Too many attempts. Please try again later.");
        }
        if (!_options.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Admin auth is not configured.");

        var validEmail = string.Equals(request.Email, _options.Email, StringComparison.OrdinalIgnoreCase);
        var validPassword = new PasswordHasher<AdminAuthOptions>().VerifyHashedPassword(
            _options, _options.PasswordHash, request.Password) != PasswordVerificationResult.Failed;

        if (!validEmail || !validPassword)
            return Unauthorized("Invalid credentials");

        Response.Cookies.Append("__Host-masq-admin-access", tokenService.CreateToken(), new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddHours(12),
        });
        Response.Cookies.Append("__Host-masq-admin-csrf", Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32)), new CookieOptions
        {
            HttpOnly = false,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddHours(12),
        });
        return new AdminBrowserSessionResponse(_options.Email);
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        foreach (var name in new[] { "__Host-masq-admin-access", "__Host-masq-admin-csrf" })
            Response.Cookies.Delete(name, new CookieOptions { Secure = true, SameSite = SameSiteMode.Strict, Path = "/" });
        return NoContent();
    }

    [Authorize(Policy = AdminAuthConstants.Policy)]
    [HttpGet("session")]
    public ActionResult<AdminBrowserSessionResponse> Session() => new AdminBrowserSessionResponse(_options.Email);
}
