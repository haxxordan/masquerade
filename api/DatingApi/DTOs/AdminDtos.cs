namespace DatingApi.DTOs;

public sealed record AdminLoginRequest(string Email, string Password);

public sealed record AdminAuthResponse(string Token, string Email);

public sealed record AdminDashboardSummaryDto(
    int TotalUsers,
    int TotalProfiles,
    int TotalLikes,
    int TotalMatches,
    int TotalMessages);

public sealed record AdminUserListItemDto(
    string UserId,
    string Email,
    bool HasProfile,
    string? ProfileId,
    string? DisplayName,
    string? AnimalType,
    string? Gender,
    string? LookingFor,
    DateTime? ProfileCreatedAt,
    int LikesSent,
    int LikesReceived,
    int MatchesCount);

public sealed record AdminRelatedUserDto(
    string UserId,
    string Email,
    string? ProfileId,
    string? DisplayName,
    string? AnimalType);

public sealed record AdminLikeDetailDto(
    DateTime CreatedAt,
    AdminRelatedUserDto OtherUser);

public sealed record AdminMatchDetailDto(
    string MatchId,
    string Status,
    DateTime CreatedAt,
    int MessageCount,
    AdminRelatedUserDto OtherUser);

public sealed record AdminUserDetailDto(
    string UserId,
    string Email,
    bool HasProfile,
    string? ProfileId,
    string? DisplayName,
    string? AnimalType,
    string? Gender,
    string? LookingFor,
    DateTime? ProfileCreatedAt,
    IReadOnlyList<AdminLikeDetailDto> LikesSent,
    IReadOnlyList<AdminLikeDetailDto> LikesReceived,
    IReadOnlyList<AdminMatchDetailDto> Matches);