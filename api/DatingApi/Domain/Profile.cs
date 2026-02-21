namespace DatingApi.Domain;

public class Profile
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = string.Empty;
    public AppUser User { get; set; } = null!;

    public string DisplayName { get; set; } = string.Empty;
    public string AnimalAvatarUrl { get; set; } = string.Empty;
    public string AnimalType { get; set; } = string.Empty;

    // Tags stored via join table
    public List<ProfileTag> Tags { get; set; } = [];

    public string? Faith { get; set; }
    public string? PoliticalLeaning { get; set; }

    public string Gender { get; set; } = string.Empty;
    public string LookingFor { get; set; } = string.Empty;

    // Stored as JSONB in Postgres
    public string LayoutJson { get; set; } = "{}";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
