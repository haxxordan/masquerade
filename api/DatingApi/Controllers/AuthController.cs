using DatingApi.Domain;
using DatingApi.DTOs;
using DatingApi.Services;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace DatingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(UserManager<AppUser> userManager, SessionService sessions, AuthenticationThrottleService throttles) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var throttle = await throttles.ConsumeAsync("register", request.Email?.Trim() ?? string.Empty, HttpContext.Connection.RemoteIpAddress?.ToString());
        if (!throttle.Allowed) return TooManyRequests(throttle);
        if (!TryNormalizeEmail(request.Email, out var email))
            return BadRequest("A valid email address is required.");

        var user = new AppUser { UserName = email, Email = email };
        var result = await userManager.CreateAsync(user, request.Password);

        // Do not disclose whether this address is already registered. Email
        // verification is intentionally deferred, so new accounts sign in via
        // the normal login endpoint rather than receiving a registration token.
        if (!result.Succeeded && !result.Errors.All(e => e.Code == "DuplicateEmail" || e.Code == "DuplicateUserName"))
            return BadRequest(result.Errors.Select(e => e.Description));

        return Accepted();
    }

    [HttpPost("login")]
    public async Task<ActionResult<BrowserSessionResponse>> Login(LoginRequest request)
    {
        var throttle = await throttles.ConsumeAsync("login", request.Email?.Trim() ?? string.Empty, HttpContext.Connection.RemoteIpAddress?.ToString());
        if (!throttle.Allowed) return TooManyRequests(throttle);
        if (!TryNormalizeEmail(request.Email, out var email)) return Unauthorized("Invalid credentials");
        var user = await userManager.FindByEmailAsync(email);
        if (user == null) return Unauthorized("Invalid credentials");

        var valid = await userManager.CheckPasswordAsync(user, request.Password);
        if (!valid) return Unauthorized("Invalid credentials");

        var issued = await sessions.CreateAsync(user);
        SetBrowserCookies(issued);
        return new BrowserSessionResponse(user.Email!);
    }

    [HttpPost("mobile/login")]
    public async Task<ActionResult<MobileAuthResponse>> MobileLogin(LoginRequest request)
    {
        var throttle = await throttles.ConsumeAsync("login", request.Email?.Trim() ?? string.Empty, HttpContext.Connection.RemoteIpAddress?.ToString());
        if (!throttle.Allowed) return TooManyRequests(throttle);
        if (!TryNormalizeEmail(request.Email, out var email)) return Unauthorized("Invalid credentials");
        var user = await userManager.FindByEmailAsync(email);
        if (user == null || !await userManager.CheckPasswordAsync(user, request.Password))
            return Unauthorized("Invalid credentials");

        var issued = await sessions.CreateAsync(user);
        return new MobileAuthResponse(issued.AccessToken, issued.RefreshToken, issued.Email, issued.AccessExpiresAt);
    }

    [Authorize]
    [HttpGet("session")]
    public ActionResult<BrowserSessionResponse> Session() =>
        new BrowserSessionResponse(User.FindFirstValue(ClaimTypes.Email) ?? string.Empty);

    [HttpPost("refresh")]
    public async Task<ActionResult<BrowserSessionResponse>> Refresh()
    {
        if (!Request.Cookies.TryGetValue("__Host-masq-refresh", out var refreshToken))
            return Unauthorized();

        var issued = await sessions.RotateAsync(refreshToken);
        if (issued == null) return Unauthorized();
        SetBrowserCookies(issued);
        return new BrowserSessionResponse(issued.Email);
    }

    [HttpPost("mobile/refresh")]
    public async Task<ActionResult<MobileAuthResponse>> MobileRefresh([FromBody] string refreshToken)
    {
        var issued = await sessions.RotateAsync(refreshToken);
        if (issued == null) return Unauthorized();
        return new MobileAuthResponse(issued.AccessToken, issued.RefreshToken, issued.Email, issued.AccessExpiresAt);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var sessionId = User.FindFirstValue("sid");
        if (!string.IsNullOrWhiteSpace(sessionId))
            await sessions.RevokeAsync(sessionId);
        DeleteBrowserCookies();
        return NoContent();
    }

    private void SetBrowserCookies(IssuedSession issued)
    {
        var csrf = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
        Response.Cookies.Append("__Host-masq-access", issued.AccessToken, CookieOptions(httpOnly: true, expires: issued.AccessExpiresAt));
        Response.Cookies.Append("__Host-masq-refresh", issued.RefreshToken, CookieOptions(httpOnly: true, expires: DateTimeOffset.UtcNow.AddDays(30)));
        Response.Cookies.Append("__Host-masq-csrf", csrf, CookieOptions(httpOnly: false, expires: DateTimeOffset.UtcNow.AddDays(30)));
    }

    private void DeleteBrowserCookies()
    {
        foreach (var name in new[] { "__Host-masq-access", "__Host-masq-refresh", "__Host-masq-csrf" })
            Response.Cookies.Delete(name, new CookieOptions { Secure = true, SameSite = SameSiteMode.Strict, Path = "/" });
    }

    private static CookieOptions CookieOptions(bool httpOnly, DateTimeOffset expires) => new()
    {
        HttpOnly = httpOnly,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Path = "/",
        Expires = expires,
    };

    private static bool TryNormalizeEmail(string? value, out string email)
    {
        email = value?.Trim() ?? string.Empty;
        return email.Length <= 256 && new EmailAddressAttribute().IsValid(email);
    }

    private ActionResult TooManyRequests(ThrottleResult throttle)
    {
        Response.Headers.RetryAfter = Math.Ceiling(throttle.RetryAfter.TotalSeconds).ToString(System.Globalization.CultureInfo.InvariantCulture);
        return StatusCode(StatusCodes.Status429TooManyRequests, "Too many attempts. Please try again later.");
    }
}
