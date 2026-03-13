using DatingApi.Domain;

namespace DatingApi.DTOs;

public record LikeResponse(bool Matched, string? MatchId);

public record MatchDto(
    string Id,
    string User1Id,
    string User2Id,
    string Status,
    DateTime CreatedAt,
    ProfileDto? OtherProfile = null,
    int? CompatibilityScore = null,
    List<string>? CompatibilityReasons = null,
    DateTime? LastMessageAt = null,
    int? MessageCount = null
);

public record MessageDto(
    string Id,
    string MatchId,
    string SenderId,
    string Content,
    DateTime SentAt,
    MessageKind Kind = MessageKind.Text,
    string? MetadataJson = null
);
public record SendMessageRequest(string Content);
