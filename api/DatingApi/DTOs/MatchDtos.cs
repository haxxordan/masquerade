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

public record OpenerSuggestionsDto(List<string> Suggestions);
public record ConversationStateDto(
    string MatchId,
    DateTime? FirstMessageAt,
    DateTime? FirstReplyAt,
    DateTime? LastNudgedAt,
    bool IsStale,
    bool CanNudge,
    string SuggestedNudge
);

public record NudgeResponseDto(MessageDto Message, ConversationStateDto State);
public record SendMessageRequest(string Content);
