using System.Text.Json;
using DatingApi.Data;
using DatingApi.Domain;
using DatingApi.DTOs;
using DatingApi.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DatingApi.Services;

public class MatchingService(AppDbContext db, IOptions<FeatureFlagsOptions> featureFlagsOptions)
{
    private readonly FeatureFlagsOptions featureFlags = featureFlagsOptions.Value;

    private sealed record ScoredProfile(Profile Profile, int Score, List<string> Reasons);

    /// Returns profiles sorted by tag overlap score, filtered by optional criteria.
    public async Task<List<ProfileDto>> SuggestAsync(string requestingUserId, SuggestQuery query)
    {
        return await SuggestInternalAsync(requestingUserId, query);
    }

    public async Task<List<ProfileDto>> TopPicksAsync(string requestingUserId, SuggestQuery query)
    {
        var topPickQuery = query with { Page = 0, PageSize = Math.Clamp(query.PageSize, 1, 10) };
        return await SuggestInternalAsync(requestingUserId, topPickQuery);
    }

    private async Task<List<ProfileDto>> SuggestInternalAsync(string requestingUserId, SuggestQuery query)
    {
        // Fetch the requesting user's profile for scoring
        var me = await db.Profiles
            .Include(p => p.Tags)
            .FirstOrDefaultAsync(p => p.UserId == requestingUserId);

        var baseQuery = db.Profiles
            .Include(p => p.Tags)
            .Where(p => p.UserId != requestingUserId);

        // LookingFor is still a hard filter — either you're open to them or you're not
        if (!string.IsNullOrWhiteSpace(query.LookingFor) && query.LookingFor != "Everyone")
            baseQuery = baseQuery.Where(p => p.Gender == query.LookingFor);

        var profiles = await baseQuery.ToListAsync();

        // Pre-fetch in one query each — avoids N+1
        var likedUserIds = await db.Likes
            .Where(l => l.LikerId == requestingUserId)
            .Select(l => l.LikeeId)
            .ToHashSetAsync();

        var matchedUserIds = await db.Matches
            .Where(m => m.User1Id == requestingUserId || m.User2Id == requestingUserId)
            .Select(m => m.User1Id == requestingUserId ? m.User2Id : m.User1Id)
            .ToHashSetAsync();

        // Use the requesting user's own tags as the baseline for scoring
        var myMusic = me?.Tags
            .Where(t => t.Category == TagCategory.Music)
            .Select(t => t.Value)
            .ToHashSet() ?? [];

        var myHobbies = me?.Tags
            .Where(t => t.Category == TagCategory.Hobby)
            .Select(t => t.Value)
            .ToHashSet() ?? [];

        var scored = profiles
            .Select(p =>
            {
                var musicScore = p.Tags.Count(t => t.Category == TagCategory.Music && myMusic.Contains(t.Value)) * 2;
                var hobbyScore = p.Tags.Count(t => t.Category == TagCategory.Hobby && myHobbies.Contains(t.Value)) * 3;
                var faithScore = (!string.IsNullOrWhiteSpace(me?.Faith) && me.Faith == p.Faith) ? 4 : 0;
                var politicScore = (!string.IsNullOrWhiteSpace(me?.PoliticalLeaning) && me.PoliticalLeaning == p.PoliticalLeaning) ? 3 : 0;
                var sharedMusicCount = p.Tags.Count(t => t.Category == TagCategory.Music && myMusic.Contains(t.Value));
                var sharedHobbyCount = p.Tags.Count(t => t.Category == TagCategory.Hobby && myHobbies.Contains(t.Value));
                var profileCompletenessScore =
                    (string.IsNullOrWhiteSpace(p.Faith) ? 0 : 1)
                    + (string.IsNullOrWhiteSpace(p.PoliticalLeaning) ? 0 : 1)
                    + (p.Tags.Count >= 5 ? 1 : 0)
                    + (!string.IsNullOrWhiteSpace(p.AnimalAvatarUrl) ? 1 : 0);

                var profileAgeDays = (DateTime.UtcNow - p.CreatedAt).TotalDays;
                var freshnessScore = profileAgeDays <= 7 ? 2 : profileAgeDays <= 30 ? 1 : 0;

                var baselineScore = musicScore + hobbyScore + faithScore + politicScore;
                var scoreV2 = baselineScore + profileCompletenessScore + freshnessScore;
                var finalScore = featureFlags.Matching.ScoreV2 ? scoreV2 : baselineScore;

                var reasons = new List<string>();
                if (sharedHobbyCount > 0) reasons.Add($"{sharedHobbyCount} shared hobbies");
                if (sharedMusicCount > 0) reasons.Add($"{sharedMusicCount} shared music genres");
                if (faithScore > 0) reasons.Add("same faith");
                if (politicScore > 0) reasons.Add("similar politics");
                if (featureFlags.Matching.ScoreV2 && freshnessScore > 0) reasons.Add("active recently");
                if (featureFlags.Matching.ScoreV2 && reasons.Count == 0) reasons.Add("profile fit");

                return new ScoredProfile(p, finalScore, reasons.Take(2).ToList());
            })
            .OrderByDescending(x => x.Score)
            .Skip(query.Page * query.PageSize)
            .Take(query.PageSize)
            .Select(x => MapToDto(x.Profile, likedUserIds, matchedUserIds, x.Score, x.Reasons))
            .ToList();

        return scored;
    }

    public static ProfileDto MapToDto(Profile p) =>
    MapToDto(p, [], []);

    public static ProfileDto MapToDto(
        Profile p,
        HashSet<string> likedUserIds,
        HashSet<string> matchedUserIds,
        int? compatibilityScore = null,
        List<string>? compatibilityReasons = null) => new(
    p.Id, p.UserId, p.DisplayName, p.AnimalAvatarUrl, p.AnimalType, p.Gender, p.LookingFor,
    p.Tags.Where(t => t.Category == TagCategory.Music).Select(t => t.Value).ToList(),
    p.Tags.Where(t => t.Category == TagCategory.Hobby).Select(t => t.Value).ToList(),
    p.Faith, p.PoliticalLeaning,
    JsonSerializer.Deserialize<ProfileLayoutDto>(p.LayoutJson) ?? new ProfileLayoutDto(),
    p.CreatedAt,
    matchedUserIds.Contains(p.UserId) ? LikeStatus.Matched :
    likedUserIds.Contains(p.UserId) ? LikeStatus.Liked :
    LikeStatus.None,
    compatibilityScore,
    compatibilityReasons
);

}
