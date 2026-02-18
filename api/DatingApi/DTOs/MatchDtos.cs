namespace DatingApi.DTOs;

public record LikeResponse(bool Matched, string? MatchId);

public record MatchDto(
    string Id,
    string User1Id,
    string User2Id,
    string Status,
    DateTime CreatedAt
);

public record MessageDto(string Id, string MatchId, string SenderId, string Content, DateTime SentAt);
public record SendMessageRequest(string Content);
