namespace DatingApi.Domain;

public enum MessageKind { Text, System, Nudge }

public class Message
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string MatchId { get; set; } = string.Empty;
    public Match Match { get; set; } = null!;
    public string SenderId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public MessageKind Kind { get; set; } = MessageKind.Text;
    public string MetadataJson { get; set; } = "{}";
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
