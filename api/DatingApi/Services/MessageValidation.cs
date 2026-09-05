namespace DatingApi.Services;

public static class MessageValidation
{
    public const int MaxLength = 2_000;

    public static bool TryNormalize(string? content, out string normalized)
    {
        normalized = content?.Trim() ?? string.Empty;
        return normalized.Length is > 0 and <= MaxLength;
    }
}
