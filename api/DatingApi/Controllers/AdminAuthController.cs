using DatingApi.Auth;
using DatingApi.DTOs;
using DatingApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace DatingApi.Controllers;

[ApiController]
[Route("api/admin/auth")]
public class AdminAuthController(
    IOptions<AdminAuthOptions> options,
    AdminTokenService tokenService) : ControllerBase
{
    private readonly AdminAuthOptions _options = options.Value;

    [HttpPost("login")]
    public ActionResult<AdminAuthResponse> Login(AdminLoginRequest request)
    {
        if (!_options.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Admin auth is not configured.");

        var validEmail = string.Equals(request.Email, _options.Email, StringComparison.OrdinalIgnoreCase);
        var validPassword = string.Equals(request.Password, _options.Password, StringComparison.Ordinal);

        if (!validEmail || !validPassword)
            return Unauthorized("Invalid credentials");

        return new AdminAuthResponse(tokenService.CreateToken(), _options.Email);
    }
}