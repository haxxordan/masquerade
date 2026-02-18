namespace DatingApi.Domain;

public enum MatchStatus { Pending, Matched, Rejected }

public class Match
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string User1Id { get; set; } = string.Empty;
    public string User2Id { get; set; } = string.Empty;
    public MatchStatus Status { get; set; } = MatchStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<Message> Messages { get; set; } = [];
}
