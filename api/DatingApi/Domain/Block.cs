namespace DatingApi.Domain;

public class Block
{
    public string BlockerId { get; set; } = string.Empty;
    public string BlockedId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
