using System.Security.Claims;
using DatingApi.Data;
using DatingApi.Domain;
using DatingApi.DTOs;
using DatingApi.Hubs;
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
        var existing = await db.Likes.FindAsync(UserId, likeeId);
        if (existing != null) return BadRequest("Already liked.");

        db.Likes.Add(new Like { LikerId = UserId, LikeeId = likeeId });

        // Check mutual like → create match
        var mutual = await db.Likes.AnyAsync(l => l.LikerId == likeeId && l.LikeeId == UserId);
        Match? match = null;

        if (mutual)
        {
            match = new Match { User1Id = UserId, User2Id = likeeId, Status = MatchStatus.Matched };
            db.Matches.Add(match);
            // Notify both users via SignalR
            await hub.Clients.User(UserId).SendAsync("NewMatch", match.Id);
            await hub.Clients.User(likeeId).SendAsync("NewMatch", match.Id);
        }

        await db.SaveChangesAsync();
        return new LikeResponse(mutual, match?.Id);
    }

    [HttpGet]
    public async Task<List<MatchDto>> GetMatches()
    {
        return await db.Matches
            .Where(m => m.Status == MatchStatus.Matched && (m.User1Id == UserId || m.User2Id == UserId))
            .Select(m => new MatchDto(m.Id, m.User1Id, m.User2Id, m.Status.ToString(), m.CreatedAt))
            .ToListAsync();
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
