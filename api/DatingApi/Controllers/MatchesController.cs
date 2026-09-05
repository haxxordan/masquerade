using System.Security.Claims;
using DatingApi.Data;
using DatingApi.Domain;
using DatingApi.DTOs;
using DatingApi.Features;
using DatingApi.Hubs;
using DatingApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DatingApi.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MatchesController(
    AppDbContext db,
    IHubContext<MatchHub> hub,
    SmartOpenersService smartOpeners,
    ConversationNudgeService nudgeService,
    RelationshipVisibilityService visibility,
    IOptions<FeatureFlagsOptions> featureFlagsOptions) : ControllerBase
{
    private static readonly TimeSpan NewMatchWindow = TimeSpan.FromDays(7);
    private static readonly TimeSpan UnseenStaleAfter = TimeSpan.FromHours(12);
    private static readonly TimeSpan SeenNoReplyStaleAfter = TimeSpan.FromHours(6);
    private static readonly TimeSpan NudgeCooldown = TimeSpan.FromHours(24);
    private readonly FeatureFlagsOptions featureFlags = featureFlagsOptions.Value;
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

        if (likeeUserId == UserId)
            return BadRequest("You cannot like yourself.");

        if (!await visibility.CanInteractAsync(UserId, likeeUserId))
            return NotFound("Profile not found.");

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
            if (mutual)
            {
                var (user1Id, user2Id) = string.CompareOrdinal(UserId, likeeUserId) < 0
                    ? (UserId, likeeUserId)
                    : (likeeUserId, UserId);
                match = new Match { User1Id = user1Id, User2Id = user2Id, Status = MatchStatus.Matched };
                db.Matches.Add(match);
                await db.SaveChangesAsync();

                // Build full MatchDto for both sides — avoids extra HTTP call on the client
                var currentUserProfile = await db.Profiles
                    .Include(p => p.Tags)
                    .FirstOrDefaultAsync(p => p.UserId == UserId);

                var matchDtoForLikee = new MatchDto(
                    match.Id, match.Status.ToString(), match.CreatedAt,
                    currentUserProfile != null ? MatchingService.MapToDto(currentUserProfile) : null,
                    ConversationStatus: ConversationStatus.NewMatch,
                    ConversationStatusLabel: "new match"
                );
                var matchDtoForLiker = new MatchDto(
                    match.Id, match.Status.ToString(), match.CreatedAt,
                    MatchingService.MapToDto(likeeProfile),
                    ConversationStatus: ConversationStatus.NewMatch,
                    ConversationStatusLabel: "new match"
                );

                await hub.Clients.User(UserId).SendAsync("NewMatch", matchDtoForLiker);
                await hub.Clients.User(likeeUserId).SendAsync("NewMatch", matchDtoForLikee);
            }
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

        if (!await visibility.CanInteractAsync(UserId, likeeUserId))
            return NotFound();

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

        matches = matches.Where(m => !db.Blocks.Any(b =>
            (b.BlockerId == m.User1Id && b.BlockedId == m.User2Id) ||
            (b.BlockerId == m.User2Id && b.BlockedId == m.User1Id))).ToList();

        var matchIds = matches.Select(m => m.Id).ToHashSet();

        var otherUserIds = matches
            .Select(m => m.User1Id == UserId ? m.User2Id : m.User1Id)
            .ToHashSet();

        var otherProfiles = await db.Profiles
            .Include(p => p.Tags)
            .Where(p => otherUserIds.Contains(p.UserId))
            .ToDictionaryAsync(p => p.UserId);

        var matchesWithUnread = await db.Messages
            .Where(m => matchIds.Contains(m.MatchId) && m.SenderId != UserId && m.ReadAt == null)
            .Select(m => m.MatchId)
            .Distinct()
            .ToHashSetAsync();

        var matchMessages = await db.Messages
            .AsNoTracking()
            .Where(m => matchIds.Contains(m.MatchId))
            .OrderBy(m => m.SentAt)
            .ToListAsync();

        var messagesByMatchId = matchMessages
            .GroupBy(m => m.MatchId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var statesByMatchId = await db.ConversationStates
            .AsNoTracking()
            .Where(s => matchIds.Contains(s.MatchId))
            .ToDictionaryAsync(s => s.MatchId);

        var now = DateTime.UtcNow;

        return matches.Select(m =>
        {
            var otherUserId = m.User1Id == UserId ? m.User2Id : m.User1Id;
            var otherProfile = otherProfiles.GetValueOrDefault(otherUserId);
            messagesByMatchId.TryGetValue(m.Id, out var matchMessages);
            statesByMatchId.TryGetValue(m.Id, out var conversationState);
            var health = BuildConversationHealth(m, matchMessages ?? [], conversationState, UserId, now);

            return new MatchDto(
                m.Id,
                m.Status.ToString(),
                m.CreatedAt,
                otherProfile != null ? MatchingService.MapToDto(otherProfile) : null,
                m.CompatibilityScore,
                DeserializeCompatibilityReasons(m.CompatibilityReasonsJson),
                m.LastMessageAt,
                m.MessageCount,
                HasUnread: matchesWithUnread.Contains(m.Id)
                    || health.Status == ConversationStatus.Unread,
                ConversationStatus: health.Status,
                ConversationStatusLabel: health.Label,
                CanNudge: health.CanNudge
            );
        }).ToList();
    }

    private sealed record ConversationHealth(ConversationStatus Status, string Label, bool CanNudge);

    private static ConversationHealth BuildConversationHealth(
        Match match,
        IReadOnlyList<Message> messages,
        ConversationState? state,
        string requesterUserId,
        DateTime now)
    {
        if (messages.Count == 0)
        {
            var isNew = now - match.CreatedAt <= NewMatchWindow;
            return isNew
                ? new ConversationHealth(ConversationStatus.NewMatch, "new match", false)
                : new ConversationHealth(ConversationStatus.NoMessages, "no messages yet", false);
        }

        var firstMessage = messages[0];
        var firstReply = messages
            .FirstOrDefault(m => m.SentAt > firstMessage.SentAt && m.SenderId != firstMessage.SenderId);
        var lastMessage = messages[^1];
        var hasUnread = messages.Any(m => m.SenderId != requesterUserId && m.ReadAt == null);

        var firstMessageAt = state?.FirstMessageAt ?? firstMessage.SentAt;
        var firstReplyAt = state?.FirstReplyAt ?? firstReply?.SentAt;
        var firstReadAt = firstMessage.ReadAt;
        var isSeenNoReply = firstReadAt.HasValue && !firstReplyAt.HasValue;
        var isStale = ComputeIsStale(firstMessageAt, firstReplyAt, firstReadAt, now) || state?.IsStale == true;
        var canNudge = ComputeCanNudge(isStale, state?.LastNudgedAt, now);

        if (hasUnread)
            return new ConversationHealth(ConversationStatus.Unread, "unread", canNudge);

        if (isStale)
            return new ConversationHealth(ConversationStatus.Stale, canNudge ? "needs a nudge" : "nudge sent", canNudge);

        if (lastMessage.SenderId == requesterUserId)
        {
            if (lastMessage.ReadAt.HasValue || isSeenNoReply)
                return new ConversationHealth(ConversationStatus.SeenNoReply, "seen, no reply", canNudge);

            return new ConversationHealth(ConversationStatus.WaitingForThem, "waiting for reply", canNudge);
        }

        return new ConversationHealth(ConversationStatus.Replied, "replied", canNudge);
    }

    private static bool ComputeIsStale(DateTime? firstMessageAt, DateTime? firstReplyAt, DateTime? firstReadAt, DateTime now)
    {
        if (!firstMessageAt.HasValue || firstReplyAt.HasValue)
            return false;

        if (firstReadAt.HasValue)
            return now - firstReadAt.Value >= SeenNoReplyStaleAfter;

        return now - firstMessageAt.Value >= UnseenStaleAfter;
    }

    private static bool ComputeCanNudge(bool isStale, DateTime? lastNudgedAt, DateTime now)
    {
        if (!isStale)
            return false;

        if (!lastNudgedAt.HasValue)
            return true;

        return now - lastNudgedAt.Value >= NudgeCooldown;
    }

    private static List<string>? DeserializeCompatibilityReasons(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return null;

        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<List<string>>(json);
        }
        catch
        {
            return null;
        }
    }


    [HttpGet("{matchId}/messages")]
    public async Task<ActionResult<List<MessageDto>>> GetMessages(string matchId)
    {
        var match = await db.Matches.FindAsync(matchId);
        if (match == null || !await visibility.CanAccessMatchAsync(UserId, match))
            return NotFound();

        return await db.Messages
            .Where(m => m.MatchId == matchId)
            .OrderBy(m => m.SentAt)
            .Select(m => new MessageDto(m.Id, m.MatchId, m.SenderId == UserId, m.Content, m.SentAt, m.Kind, m.MetadataJson, m.ReadAt))
            .ToListAsync();
    }

    [HttpPost("{matchId}/read")]
    public async Task<ActionResult<object>> MarkRead(string matchId)
    {
        var match = await db.Matches.FindAsync(matchId);
        if (match == null || !await visibility.CanAccessMatchAsync(UserId, match))
            return NotFound();

        var now = DateTime.UtcNow;
        var unreadIncoming = await db.Messages
            .Where(m => m.MatchId == matchId && m.SenderId != UserId && m.ReadAt == null)
            .ToListAsync();

        if (unreadIncoming.Count > 0)
        {
            foreach (var message in unreadIncoming)
                message.ReadAt = now;

            await db.SaveChangesAsync();

            var recipientId = match.User1Id == UserId ? match.User2Id : match.User1Id;
            await hub.Clients.User(recipientId).SendAsync("MessagesRead", new { matchId, readAt = now });
        }

        return Ok(new { readAt = now });
    }

    [HttpGet("{matchId}/state")]
    public async Task<ActionResult<ConversationStateDto>> GetState(string matchId)
    {
        if (!featureFlags.Messaging.StallNudgesV1)
            return NotFound("Conversation nudges are not enabled.");

        var match = await db.Matches.FindAsync(matchId);
        if (match == null)
            return NotFound();

        if (!await visibility.CanAccessMatchAsync(UserId, match))
            return NotFound();

        var state = await nudgeService.GetStateAsync(match, UserId);
        return Ok(state);
    }

    [HttpGet("{matchId}/openers")]
    public async Task<ActionResult<OpenerSuggestionsDto>> GetOpeners(string matchId)
    {
        if (!featureFlags.Messaging.SmartOpenersV1)
            return NotFound("Smart openers are not enabled.");

        var match = await db.Matches.FindAsync(matchId);
        if (match == null)
            return NotFound();

        if (!await visibility.CanAccessMatchAsync(UserId, match))
            return NotFound();

        var suggestions = await smartOpeners.GenerateForMatchAsync(UserId, match);
        return Ok(new OpenerSuggestionsDto(suggestions));
    }

    [HttpPost("{matchId}/nudge")]
    public async Task<ActionResult<NudgeResponseDto>> SendNudge(string matchId)
    {
        if (!featureFlags.Messaging.StallNudgesV1)
            return NotFound("Conversation nudges are not enabled.");

        var match = await db.Matches.FindAsync(matchId);
        if (match == null)
            return NotFound();

        if (!await visibility.CanAccessMatchAsync(UserId, match))
            return NotFound();

        var response = await nudgeService.SendNudgeAsync(match, UserId);
        if (response == null)
            return BadRequest("This conversation is not eligible for a nudge yet.");

        var recipientId = match.User1Id == UserId ? match.User2Id : match.User1Id;
        await hub.Clients.User(recipientId).SendAsync("NewMessage", response.Message with { IsMine = false });

        return Ok(response);
    }

    [HttpPost("{matchId}/messages")]
    public async Task<ActionResult<MessageDto>> SendMessage(string matchId, SendMessageRequest request)
    {
        var match = await db.Matches.FindAsync(matchId);
        if (match == null || !await visibility.CanAccessMatchAsync(UserId, match))
            return NotFound();

        if (!MessageValidation.TryNormalize(request.Content, out var content))
            return BadRequest($"Message content must contain 1 to {MessageValidation.MaxLength} non-whitespace characters.");

        var message = new Message { MatchId = matchId, SenderId = UserId, Content = content };
        db.Messages.Add(message);
        await db.SaveChangesAsync();

        await nudgeService.RecordMessageAsync(match, UserId, message.SentAt);
        await db.SaveChangesAsync();

        var dto = new MessageDto(
            message.Id,
            message.MatchId,
            IsMine: true,
            message.Content,
            message.SentAt,
            message.Kind,
            message.MetadataJson,
            message.ReadAt);
        var recipientId = match.User1Id == UserId ? match.User2Id : match.User1Id;
        await hub.Clients.User(recipientId).SendAsync("NewMessage", dto with { IsMine = false });

        return dto;
    }
}
