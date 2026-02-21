using System.Text.Json;
using DatingApi.Data;
using DatingApi.Domain;
using DatingApi.DTOs;
using Microsoft.EntityFrameworkCore;

namespace DatingApi.Services;

public class MatchingService(AppDbContext db)
{
    /// Returns profiles sorted by tag overlap score, filtered by optional criteria.
    public async Task<List<ProfileDto>> SuggestAsync(string requestingUserId, SuggestQuery query)
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

                return (Profile: p, Score: musicScore + hobbyScore + faithScore + politicScore);
            })
            .OrderByDescending(x => x.Score)
            .Skip(query.Page * query.PageSize)
            .Take(query.PageSize)
            .Select(x => MapToDto(x.Profile, likedUserIds, matchedUserIds))
            .ToList();

        return scored;
    }

    public static ProfileDto MapToDto(Profile p) =>
    MapToDto(p, [], []);

    public static ProfileDto MapToDto(Profile p, HashSet<string> likedUserIds, HashSet<string> matchedUserIds) => new(
    p.Id, p.UserId, p.DisplayName, p.AnimalAvatarUrl, p.AnimalType, p.Gender, p.LookingFor,
    p.Tags.Where(t => t.Category == TagCategory.Music).Select(t => t.Value).ToList(),
    p.Tags.Where(t => t.Category == TagCategory.Hobby).Select(t => t.Value).ToList(),
    p.Faith, p.PoliticalLeaning,
    JsonSerializer.Deserialize<ProfileLayoutDto>(p.LayoutJson) ?? new ProfileLayoutDto(),
    p.CreatedAt,
    matchedUserIds.Contains(p.UserId) ? LikeStatus.Matched :
    likedUserIds.Contains(p.UserId) ? LikeStatus.Liked :
    LikeStatus.None
);

}
