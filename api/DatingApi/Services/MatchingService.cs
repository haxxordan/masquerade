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
        var baseQuery = db.Profiles
            .Include(p => p.Tags)
            .Where(p => p.UserId != requestingUserId);

        if (!string.IsNullOrWhiteSpace(query.Faith))
            baseQuery = baseQuery.Where(p => p.Faith == query.Faith);
        if (!string.IsNullOrWhiteSpace(query.PoliticalLeaning))
            baseQuery = baseQuery.Where(p => p.PoliticalLeaning == query.PoliticalLeaning);

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

        var desiredMusic = query.MusicGenres ?? [];
        var desiredHobbies = query.Hobbies ?? [];

        var scored = profiles
            .Select(p =>
            {
                var musicScore = p.Tags.Count(t => t.Category == TagCategory.Music && desiredMusic.Contains(t.Value));
                var hobbyScore = p.Tags.Count(t => t.Category == TagCategory.Hobby && desiredHobbies.Contains(t.Value));
                return (Profile: p, Score: musicScore * 2 + hobbyScore);
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
        p.Id, p.UserId, p.DisplayName, p.AnimalAvatarUrl, p.AnimalType,
        p.Tags.Where(t => t.Category == TagCategory.Music).Select(t => t.Value).ToList(),
        p.Tags.Where(t => t.Category == TagCategory.Hobby).Select(t => t.Value).ToList(),
        p.Faith, p.PoliticalLeaning, p.LayoutJson, p.CreatedAt,
        matchedUserIds.Contains(p.UserId) ? LikeStatus.Matched :
        likedUserIds.Contains(p.UserId) ? LikeStatus.Liked :
        LikeStatus.None
    );
}
