using DatingApi.Data;
using DatingApi.Domain;
using Microsoft.EntityFrameworkCore;

namespace DatingApi.Services;

public class SmartOpenersService(AppDbContext db)
{
    public async Task<List<string>> GenerateForMatchAsync(string requesterUserId, Match match)
    {
        var otherUserId = match.User1Id == requesterUserId ? match.User2Id : match.User1Id;

        var myProfile = await db.Profiles
            .Include(p => p.Tags)
            .FirstOrDefaultAsync(p => p.UserId == requesterUserId);

        var otherProfile = await db.Profiles
            .Include(p => p.Tags)
            .FirstOrDefaultAsync(p => p.UserId == otherUserId);

        if (myProfile == null || otherProfile == null)
            return [
                "Hey! What has your day been like so far?",
                "What kind of connection are you hoping to find here?",
                "What are you looking forward to this week?"
            ];

        var myHobbies = myProfile.Tags
            .Where(t => t.Category == TagCategory.Hobby)
            .Select(t => t.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var myMusic = myProfile.Tags
            .Where(t => t.Category == TagCategory.Music)
            .Select(t => t.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var sharedHobbies = otherProfile.Tags
            .Where(t => t.Category == TagCategory.Hobby && myHobbies.Contains(t.Value))
            .Select(t => t.Value)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var sharedMusic = otherProfile.Tags
            .Where(t => t.Category == TagCategory.Music && myMusic.Contains(t.Value))
            .Select(t => t.Value)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var suggestions = new List<string>();

        if (sharedHobbies.Count > 0)
        {
            suggestions.Add($"You both like {sharedHobbies[0]}. What's your favorite thing about it?");
        }

        if (sharedMusic.Count > 0)
        {
            suggestions.Add($"We both listen to {sharedMusic[0]}. Got a go-to track right now?");
        }

        if (!string.IsNullOrWhiteSpace(otherProfile.AnimalType))
        {
            suggestions.Add($"{otherProfile.AnimalType} is an elite choice. Why did you pick it?");
        }

        if (!string.IsNullOrWhiteSpace(myProfile.Faith) &&
            string.Equals(myProfile.Faith, otherProfile.Faith, StringComparison.OrdinalIgnoreCase))
        {
            suggestions.Add("I noticed we share a similar faith. How does that shape your day-to-day?");
        }

        if (!string.IsNullOrWhiteSpace(myProfile.PoliticalLeaning) &&
            string.Equals(myProfile.PoliticalLeaning, otherProfile.PoliticalLeaning, StringComparison.OrdinalIgnoreCase))
        {
            suggestions.Add("Looks like we see the world in similar ways. What's an issue you care about most?");
        }

        suggestions.Add("What's one thing most people get wrong about you?");
        suggestions.Add("What's your ideal low-key first date?");

        return suggestions
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(3)
            .ToList();
    }
}
