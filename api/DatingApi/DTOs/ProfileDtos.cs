using DatingApi.Domain;

namespace DatingApi.DTOs;

public record CreateProfileRequest(
    string DisplayName,
    string AnimalAvatarUrl,
    string AnimalType,
    List<string> MusicGenres,
    List<string> Hobbies,
    string? Faith,
    string? PoliticalLeaning,
    string LayoutJson
);

public record ProfileDto(
    string Id,
    string UserId,
    string DisplayName,
    string AnimalAvatarUrl,
    string AnimalType,
    List<string> MusicGenres,
    List<string> Hobbies,
    string? Faith,
    string? PoliticalLeaning,
    string LayoutJson,
    DateTime CreatedAt,
    LikeStatus LikeStatus = LikeStatus.None
);

public record SuggestQuery(
    List<string>? MusicGenres,
    List<string>? Hobbies,
    string? Faith,
    string? PoliticalLeaning,
    int Page = 0,
    int PageSize = 20
);
