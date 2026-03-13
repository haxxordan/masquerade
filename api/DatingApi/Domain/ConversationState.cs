namespace DatingApi.Domain;

public class ConversationState
{
    public string MatchId { get; set; } = string.Empty;
    public Match Match { get; set; } = null!;
    public DateTime? FirstMessageAt { get; set; }
    public DateTime? FirstReplyAt { get; set; }
    public DateTime? LastNudgedAt { get; set; }
    public bool IsStale { get; set; }
}
