namespace DatingApi.Auth;

public sealed class JwtOptions
{
    public string Key { get; init; } = string.Empty;
    public string Issuer { get; init; } = "masquerade-api";
    public string Audience { get; init; } = "masquerade-clients";
    public int AccessTokenMinutes { get; init; } = 15;
    public int RefreshTokenDays { get; init; } = 30;
}
