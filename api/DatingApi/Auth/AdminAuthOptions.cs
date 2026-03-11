namespace DatingApi.Auth;

public sealed class AdminAuthOptions
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string JwtKey { get; init; } = string.Empty;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Email) &&
        !string.IsNullOrWhiteSpace(Password) &&
        !string.IsNullOrWhiteSpace(JwtKey);
}