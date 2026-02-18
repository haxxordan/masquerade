namespace DatingApi.Domain;

public enum TagCategory { Music, Hobby }

public class ProfileTag
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ProfileId { get; set; } = string.Empty;
    public Profile Profile { get; set; } = null!;
    public TagCategory Category { get; set; }
    public string Value { get; set; } = string.Empty;
}
