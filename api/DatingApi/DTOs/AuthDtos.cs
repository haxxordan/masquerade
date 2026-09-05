namespace DatingApi.DTOs;

public record RegisterRequest(string Email, string Password);
public record LoginRequest(string Email, string Password);
public record BrowserSessionResponse(string Email);
public record MobileAuthResponse(string AccessToken, string RefreshToken, string Email, DateTime AccessExpiresAt);
public record AdminBrowserSessionResponse(string Email);
