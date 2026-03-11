using DatingApi.Auth;
using DatingApi.Data;
using DatingApi.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DatingApi.Controllers;

[Authorize(AuthenticationSchemes = AdminAuthConstants.Scheme, Policy = AdminAuthConstants.Policy)]
[ApiController]
[Route("api/admin")]
public class AdminController(AppDbContext db) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<AdminDashboardSummaryDto>> GetSummary()
    {
        var summary = new AdminDashboardSummaryDto(
            await db.Users.AsNoTracking().CountAsync(),
            await db.Profiles.AsNoTracking().CountAsync(),
            await db.Likes.AsNoTracking().CountAsync(),
            await db.Matches.AsNoTracking().CountAsync(),
            await db.Messages.AsNoTracking().CountAsync());

        return Ok(summary);
    }

    [HttpGet("users")]
    public async Task<ActionResult<IReadOnlyList<AdminUserListItemDto>>> GetUsers()
    {
        var users = await db.Users
            .AsNoTracking()
            .Select(user => new { user.Id, Email = user.Email ?? string.Empty })
            .OrderBy(user => user.Email)
            .ToListAsync();

        var profilesByUserId = await db.Profiles
            .AsNoTracking()
            .ToDictionaryAsync(profile => profile.UserId);

        var likes = await db.Likes.AsNoTracking().ToListAsync();
        var matches = await db.Matches.AsNoTracking().ToListAsync();

        var likesSentCounts = likes
            .GroupBy(like => like.LikerId)
            .ToDictionary(group => group.Key, group => group.Count());

        var likesReceivedCounts = likes
            .GroupBy(like => like.LikeeId)
            .ToDictionary(group => group.Key, group => group.Count());

        var matchesCountByUserId = matches
            .SelectMany(match => new[] { match.User1Id, match.User2Id })
            .GroupBy(userId => userId)
            .ToDictionary(group => group.Key, group => group.Count());

        return Ok(users.Select(user =>
        {
            profilesByUserId.TryGetValue(user.Id, out var profile);

            return new AdminUserListItemDto(
                user.Id,
                user.Email,
                profile != null,
                profile?.Id,
                profile?.DisplayName,
                profile?.AnimalType,
                profile?.Gender,
                profile?.LookingFor,
                profile?.CreatedAt,
                likesSentCounts.GetValueOrDefault(user.Id),
                likesReceivedCounts.GetValueOrDefault(user.Id),
                matchesCountByUserId.GetValueOrDefault(user.Id));
        }).ToList());
    }

    [HttpGet("users/{userId}")]
    public async Task<ActionResult<AdminUserDetailDto>> GetUser(string userId)
    {
        var user = await db.Users
            .AsNoTracking()
            .Select(x => new { x.Id, Email = x.Email ?? string.Empty })
            .FirstOrDefaultAsync(x => x.Id == userId);

        if (user == null)
            return NotFound();

        var profile = await db.Profiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId);

        var likesSent = await db.Likes
            .AsNoTracking()
            .Where(x => x.LikerId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new { x.CreatedAt, OtherUserId = x.LikeeId })
            .ToListAsync();

        var likesReceived = await db.Likes
            .AsNoTracking()
            .Where(x => x.LikeeId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new { x.CreatedAt, OtherUserId = x.LikerId })
            .ToListAsync();

        var matches = await db.Matches
            .AsNoTracking()
            .Where(match => match.User1Id == userId || match.User2Id == userId)
            .OrderByDescending(match => match.CreatedAt)
            .Select(match => new
            {
                match.Id,
                match.Status,
                match.CreatedAt,
                OtherUserId = match.User1Id == userId ? match.User2Id : match.User1Id,
                MessageCount = match.Messages.Count
            })
            .ToListAsync();

        var relatedUserIds = likesSent.Select(x => x.OtherUserId)
            .Concat(likesReceived.Select(x => x.OtherUserId))
            .Concat(matches.Select(x => x.OtherUserId))
            .Distinct()
            .ToList();

        var relatedUsers = await db.Users
            .AsNoTracking()
            .Where(x => relatedUserIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Email ?? string.Empty);

        var relatedProfiles = await db.Profiles
            .AsNoTracking()
            .Where(x => relatedUserIds.Contains(x.UserId))
            .ToDictionaryAsync(x => x.UserId);

        var dto = new AdminUserDetailDto(
            user.Id,
            user.Email,
            profile != null,
            profile?.Id,
            profile?.DisplayName,
            profile?.AnimalType,
            profile?.Gender,
            profile?.LookingFor,
            profile?.CreatedAt,
            likesSent.Select(x => new AdminLikeDetailDto(x.CreatedAt, MapRelatedUser(x.OtherUserId, relatedUsers, relatedProfiles))).ToList(),
            likesReceived.Select(x => new AdminLikeDetailDto(x.CreatedAt, MapRelatedUser(x.OtherUserId, relatedUsers, relatedProfiles))).ToList(),
            matches.Select(x => new AdminMatchDetailDto(
                x.Id,
                x.Status.ToString(),
                x.CreatedAt,
                x.MessageCount,
                MapRelatedUser(x.OtherUserId, relatedUsers, relatedProfiles))).ToList());

        return Ok(dto);
    }

    private static AdminRelatedUserDto MapRelatedUser(
        string userId,
        IReadOnlyDictionary<string, string> users,
        IReadOnlyDictionary<string, Domain.Profile> profiles)
    {
        users.TryGetValue(userId, out var email);
        profiles.TryGetValue(userId, out var profile);

        return new AdminRelatedUserDto(
            userId,
            email ?? string.Empty,
            profile?.Id,
            profile?.DisplayName,
            profile?.AnimalType);
    }
}