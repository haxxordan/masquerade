namespace DatingApi.Domain;

/// <summary>Durable fixed-window bucket keyed by an irreversible identity/IP hash.</summary>
public class AuthenticationThrottle
{
    public string Id { get; set; } = string.Empty;
    public DateTime WindowStartedAt { get; set; }
    public int Attempts { get; set; }
}
