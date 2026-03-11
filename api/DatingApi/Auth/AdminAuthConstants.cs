namespace DatingApi.Auth;

public static class AdminAuthConstants
{
    public const string Scheme = "AdminBearer";
    public const string Policy = "AdminOnly";
    public const string ClaimType = "admin_portal";
    public const string ClaimValue = "true";
}