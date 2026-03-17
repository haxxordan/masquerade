namespace DatingApi.Domain;

public enum ReportReason { Spam, Harassment, FakeProfile, Other }

public class Report
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ReporterId { get; set; } = string.Empty;
    public string ReportedId { get; set; } = string.Empty;
    public ReportReason Reason { get; set; }
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsReviewed { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? AdminNote { get; set; }
}
