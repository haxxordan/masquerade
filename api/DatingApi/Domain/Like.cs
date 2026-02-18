namespace DatingApi.Domain;

public class Like
{
    public string LikerId { get; set; } = string.Empty;
    public string LikeeId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
