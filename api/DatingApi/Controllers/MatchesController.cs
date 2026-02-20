using System.Security.Claims;
using DatingApi.Data;
using DatingApi.Domain;
using DatingApi.DTOs;
using DatingApi.Hubs;
using DatingApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace DatingApi.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MatchesController(AppDbContext db, IHubContext<MatchHub> hub) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost("like/{likeeId}")]
    public async Task<ActionResult<LikeResponse>> Like(string likeeId)
    {
        // likeeId coming in is a Profile.Id — resolve it to a UserId
        var likeeProfile = await db.Profiles.FirstOrDefaultAsync(p => p.Id == likeeId);
        if (likeeProfile == null)
            return NotFound("Profile not found.");

        var likerProfile = await db.Profiles.FirstOrDefaultAsync(p => p.UserId == UserId);
        if (likerProfile == null)
            return NotFound("Your profile not found.");

        var likeeUserId = likeeProfile.UserId; // now it's the same type as LikerId

        var existing = await db.Likes
            .FirstOrDefaultAsync(l => l.LikerId == UserId && l.LikeeId == likeeUserId);
        if (existing != null)
            return BadRequest("Already liked.");

        db.Likes.Add(new Like { LikerId = UserId, LikeeId = likeeUserId });

        await db.SaveChangesAsync();

        var mutual = await db.Likes
            .AnyAsync(l => l.LikerId == likeeUserId && l.LikeeId == UserId);

        Match? match = null;
        if (mutual)
        {
            match = new Match { User1Id = UserId, User2Id = likeeUserId, Status = MatchStatus.Matched };
            db.Matches.Add(match);
            await db.SaveChangesAsync();
            await hub.Clients.User(UserId).SendAsync("NewMatch", match.Id);
            await hub.Clients.User(likeeUserId).SendAsync("NewMatch", match.Id);
        }
        else
        {
            await hub.Clients.User(likeeUserId).SendAsync("NewLike", new
            {
                ProfileId = likerProfile?.Id,
                DisplayName = likerProfile?.DisplayName,
                AnimalAvatarUrl = likerProfile?.AnimalAvatarUrl,
            });
        }
        return new LikeResponse(mutual, match?.Id);
    }

    [HttpDelete("like/{likeeId}")]
    public async Task<ActionResult> Unlike(string likeeId)
    {
        var profile = await db.Profiles.FirstOrDefaultAsync(p => p.Id == likeeId);
        if (profile == null) return NotFound("Profile not found.");

        var likeeUserId = profile.UserId;

        var like = await db.Likes.FirstOrDefaultAsync(l => l.LikerId == UserId && l.LikeeId == likeeUserId);
        if (like != null) db.Likes.Remove(like);

        // Remove match + messages if one existed
        var match = await db.Matches
            .Include(m => m.Messages)
            .FirstOrDefaultAsync(m =>
                (m.User1Id == UserId && m.User2Id == likeeUserId) ||
                (m.User1Id == likeeUserId && m.User2Id == UserId));

        if (match != null)
        {
            db.Messages.RemoveRange(match.Messages);
            db.Matches.Remove(match);
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet]
    public async Task<ActionResult<List<MatchDto>>> GetMatches()
    {
        var matches = await db.Matches
            .Where(m => m.Status == MatchStatus.Matched && (m.User1Id == UserId || m.User2Id == UserId))
            .ToListAsync();

        var otherUserIds = matches
            .Select(m => m.User1Id == UserId ? m.User2Id : m.User1Id)
            .ToHashSet();

        var otherProfiles = await db.Profiles
            .Include(p => p.Tags)
            .Where(p => otherUserIds.Contains(p.UserId))
            .ToDictionaryAsync(p => p.UserId);

        return matches.Select(m =>
        {
            var otherUserId = m.User1Id == UserId ? m.User2Id : m.User1Id;
            var otherProfile = otherProfiles.GetValueOrDefault(otherUserId);
            return new MatchDto(
                m.Id,
                m.User1Id,
                m.User2Id,
                m.Status.ToString(),
                m.CreatedAt,
                otherProfile != null ? MatchingService.MapToDto(otherProfile) : null
            );
        }).ToList();
    }


    [HttpGet("{matchId}/messages")]
    public async Task<ActionResult<List<MessageDto>>> GetMessages(string matchId)
    {
        var match = await db.Matches.FindAsync(matchId);
        if (match == null || (match.User1Id != UserId && match.User2Id != UserId))
            return Forbid();

        return await db.Messages
            .Where(m => m.MatchId == matchId)
            .OrderBy(m => m.SentAt)
            .Select(m => new MessageDto(m.Id, m.MatchId, m.SenderId, m.Content, m.SentAt))
            .ToListAsync();
    }

    [HttpPost("{matchId}/messages")]
    public async Task<ActionResult<MessageDto>> SendMessage(string matchId, SendMessageRequest request)
    {
        var match = await db.Matches.FindAsync(matchId);
        if (match == null || (match.User1Id != UserId && match.User2Id != UserId))
            return Forbid();

        var message = new Message { MatchId = matchId, SenderId = UserId, Content = request.Content };
        db.Messages.Add(message);
        await db.SaveChangesAsync();

        var dto = new MessageDto(message.Id, message.MatchId, message.SenderId, message.Content, message.SentAt);
        var recipientId = match.User1Id == UserId ? match.User2Id : match.User1Id;
        await hub.Clients.User(recipientId).SendAsync("NewMessage", dto);

        return dto;
    }
}
