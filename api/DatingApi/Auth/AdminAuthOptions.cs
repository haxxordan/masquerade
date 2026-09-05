namespace DatingApi.Auth;

public sealed class AdminAuthOptions
{
    public string Email { get; init; } = string.Empty;
    public string PasswordHash { get; init; } = string.Empty;
    public string JwtKey { get; init; } = string.Empty;
    public string Issuer { get; init; } = "masquerade-admin-api";
    public string Audience { get; init; } = "masquerade-admin-clients";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Email) &&
        !string.IsNullOrWhiteSpace(PasswordHash) &&
        !string.IsNullOrWhiteSpace(JwtKey);
}
