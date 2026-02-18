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

        // Hard filters: faith / politics only applied if caller specified them
        if (!string.IsNullOrWhiteSpace(query.Faith))
            baseQuery = baseQuery.Where(p => p.Faith == query.Faith);
        if (!string.IsNullOrWhiteSpace(query.PoliticalLeaning))
            baseQuery = baseQuery.Where(p => p.PoliticalLeaning == query.PoliticalLeaning);

        var profiles = await baseQuery.ToListAsync();

        // Score by tag overlap (in memory for MVP; optimize later)
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
            .Select(x => MapToDto(x.Profile))
            .ToList();

        return scored;
    }

    public static ProfileDto MapToDto(Profile p) => new(
        p.Id, p.UserId, p.DisplayName, p.AnimalAvatarUrl, p.AnimalType,
        p.Tags.Where(t => t.Category == TagCategory.Music).Select(t => t.Value).ToList(),
        p.Tags.Where(t => t.Category == TagCategory.Hobby).Select(t => t.Value).ToList(),
        p.Faith, p.PoliticalLeaning, p.LayoutJson, p.CreatedAt
    );
}
