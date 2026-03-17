using System.Security.Claims;
using System.Text.Json;
using DatingApi.Data;
using DatingApi.Domain;
using DatingApi.DTOs;
using DatingApi.Features;
using DatingApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
namespace DatingApi.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ProfilesController(
    AppDbContext db,
    MatchingService matching,
    IOptions<FeatureFlagsOptions> featureFlagsOptions) : ControllerBase
{
    private readonly FeatureFlagsOptions featureFlags = featureFlagsOptions.Value;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProfileDto>> Get(string id)
    {
        var profile = await db.Profiles.Include(p => p.Tags).FirstOrDefaultAsync(p => p.Id == id);
        if (profile == null) return NotFound();

        // Only resolve like status if the request is authenticated
        var requestingUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (requestingUserId == null)
            return MatchingService.MapToDto(profile);

        var likedUserIds = await db.Likes
            .Where(l => l.LikerId == requestingUserId)
            .Select(l => l.LikeeId)
            .ToHashSetAsync();

        var matchedUserIds = await db.Matches
            .Where(m => m.User1Id == requestingUserId || m.User2Id == requestingUserId)
            .Select(m => m.User1Id == requestingUserId ? m.User2Id : m.User1Id)
            .ToHashSetAsync();

        return MatchingService.MapToDto(profile, likedUserIds, matchedUserIds);
    }


    [HttpPost]
    public async Task<ActionResult<ProfileDto>> Create(CreateProfileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AnimalAvatarUrl))
            return BadRequest("Animal avatar is required.");

        var profile = new Profile
        {
            UserId = UserId,
            DisplayName = request.DisplayName,
            AnimalAvatarUrl = request.AnimalAvatarUrl,
            AnimalType = request.AnimalType,
            Faith = request.Faith,
            PoliticalLeaning = request.PoliticalLeaning,
            Gender = request.Gender,
            LookingFor = request.LookingFor,
            LayoutJson = JsonSerializer.Serialize(request.Layout),
            Tags = request.MusicGenres
                .Select(g => new ProfileTag { Category = TagCategory.Music, Value = g })
                .Concat(request.Hobbies.Select(h => new ProfileTag { Category = TagCategory.Hobby, Value = h }))
                .ToList()
        };

        db.Profiles.Add(profile);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = profile.Id }, MatchingService.MapToDto(profile));
    }

    [HttpPut("me")]
    public async Task<ActionResult<ProfileDto>> Update(UpdateProfileRequest request)
    {
        var profile = await db.Profiles.Include(p => p.Tags).FirstOrDefaultAsync(p => p.UserId == UserId);
        if (profile == null) return NotFound();

        profile.DisplayName = request.DisplayName;
        profile.AnimalAvatarUrl = request.AnimalAvatarUrl;
        profile.AnimalType = request.AnimalType;
        profile.Faith = request.Faith;
        profile.PoliticalLeaning = request.PoliticalLeaning;
        profile.Gender = request.Gender;
        profile.LookingFor = request.LookingFor;
        profile.LayoutJson = JsonSerializer.Serialize(request.Layout);

        db.ProfileTags.RemoveRange(profile.Tags);
        profile.Tags = request.MusicGenres
            .Select(g => new ProfileTag { Category = TagCategory.Music, Value = g })
            .Concat(request.Hobbies.Select(h => new ProfileTag { Category = TagCategory.Hobby, Value = h }))
            .ToList();

        await db.SaveChangesAsync();
        return Ok(MatchingService.MapToDto(profile));
    }


    [HttpPost("suggest")]
    public async Task<List<ProfileDto>> Suggest(SuggestQuery query) => await matching.SuggestAsync(UserId, query);

    [HttpPost("top-picks")]
    public async Task<ActionResult<List<ProfileDto>>> TopPicks(SuggestQuery query)
    {
        if (!featureFlags.Matching.TopPicksV1)
            return NotFound("Top picks are not enabled.");

        var topPicks = await matching.TopPicksAsync(UserId, query);
        return Ok(topPicks);
    }

    [HttpGet("me")]
    public async Task<ActionResult<ProfileDto>> GetMe()
    {
        var profile = await db.Profiles
            .Include(p => p.Tags)
            .FirstOrDefaultAsync(p => p.UserId == UserId);

        if (profile == null)
            return NotFound();

        return MatchingService.MapToDto(profile);
    }

    [HttpPost("{userId}/block")]
    public async Task<IActionResult> Block(string userId)
    {
        if (userId == UserId) return BadRequest("You cannot block yourself.");

        var exists = await db.Blocks.AnyAsync(b => b.BlockerId == UserId && b.BlockedId == userId);
        if (exists) return Ok(); // idempotent

        db.Blocks.Add(new Block { BlockerId = UserId, BlockedId = userId });
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("{userId}/block")]
    public async Task<IActionResult> Unblock(string userId)
    {
        var block = await db.Blocks.FindAsync(UserId, userId);
        if (block == null) return Ok(); // idempotent

        db.Blocks.Remove(block);
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("blocked")]
    public async Task<ActionResult<IReadOnlyList<string>>> GetBlocked()
    {
        var ids = await db.Blocks
            .Where(b => b.BlockerId == UserId)
            .Select(b => b.BlockedId)
            .ToListAsync();

        return Ok(ids);
    }

    [HttpPost("{userId}/report")]
    public async Task<IActionResult> ReportUser(string userId, ReportRequest request)
    {
        if (userId == UserId) return BadRequest("You cannot report yourself.");

        if (!Enum.TryParse<ReportReason>(request.Reason, ignoreCase: true, out var reason))
            return BadRequest($"Invalid reason. Valid values: {string.Join(", ", Enum.GetNames<ReportReason>())}");

        db.Reports.Add(new Report
        {
            ReporterId = UserId,
            ReportedId = userId,
            Reason = reason,
            Details = request.Details,
        });

        await db.SaveChangesAsync();
        return Ok();
    }

}
