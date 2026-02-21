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
    string Gender,
    string LookingFor,
    ProfileLayoutDto Layout
);

public record UpdateProfileRequest(
    string DisplayName,
    string AnimalAvatarUrl,
    string AnimalType,
    List<string> MusicGenres,
    List<string> Hobbies,
    string? Faith,
    string? PoliticalLeaning,
    string Gender,
    string LookingFor,
    ProfileLayoutDto Layout
);

public record ProfileWidgetDto
{
    public string Id { get; set; } = "";
    public string Type { get; set; } = "";
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public int Order { get; set; }
}

public record ProfileLayoutDto
{
    public string Theme { get; set; } = "dark";
    public string AccentColor { get; set; } = "#ff6699";
    public List<ProfileWidgetDto> Widgets { get; set; } = [];
}

public record ProfileDto(
    string Id,
    string UserId,
    string DisplayName,
    string AnimalAvatarUrl,
    string AnimalType,
    string Gender,
    string LookingFor,
    List<string> MusicGenres,
    List<string> Hobbies,
    string? Faith,
    string? PoliticalLeaning,
    ProfileLayoutDto Layout,
    DateTime CreatedAt,
    LikeStatus LikeStatus = LikeStatus.None
);


public record SuggestQuery(
    List<string>? MusicGenres,
    List<string>? Hobbies,
    string? Faith,
    string? PoliticalLeaning,
    string? LookingFor,
    int Page = 0,
    int PageSize = 20
);
