using DatingApi.Data;
using DatingApi.Domain;
using DatingApi.DTOs;
using Microsoft.EntityFrameworkCore;

namespace DatingApi.Services;

public class ConversationNudgeService(AppDbContext db)
{
    private static readonly TimeSpan UnseenStaleAfter = TimeSpan.FromHours(12);
    private static readonly TimeSpan SeenNoReplyStaleAfter = TimeSpan.FromHours(6);
    private static readonly TimeSpan NudgeCooldown = TimeSpan.FromHours(24);

    private sealed record ConversationReadSnapshot(
        DateTime? FirstMessageAt,
        DateTime? FirstReplyAt,
        DateTime? FirstReadAt,
        bool IsSeenNoReply,
        bool IsStale);

    public async Task RecordMessageAsync(Match match, string senderId, DateTime sentAt)
    {
        var state = await db.ConversationStates.FindAsync(match.Id);
        if (state == null)
        {
            state = new ConversationState { MatchId = match.Id };
            db.ConversationStates.Add(state);
        }

        if (!state.FirstMessageAt.HasValue)
        {
            state.FirstMessageAt = sentAt;
        }
        else if (!state.FirstReplyAt.HasValue)
        {
            var firstSenderId = await db.Messages
                .Where(m => m.MatchId == match.Id)
                .OrderBy(m => m.SentAt)
                .Select(m => m.SenderId)
                .FirstOrDefaultAsync();

            if (!string.IsNullOrWhiteSpace(firstSenderId) && !string.Equals(firstSenderId, senderId, StringComparison.Ordinal))
            {
                state.FirstReplyAt = sentAt;
            }
        }

        state.IsStale = false;

        match.LastMessageAt = sentAt;
        match.MessageCount += 1;
    }

    public async Task<ConversationStateDto> GetStateAsync(Match match, string requesterUserId)
    {
        var state = await db.ConversationStates.FindAsync(match.Id);
        var lastNudgedAt = state?.LastNudgedAt;

        var snapshot = await BuildReadSnapshotAsync(match.Id);
        var firstMessageAt = snapshot.FirstMessageAt ?? state?.FirstMessageAt;
        var firstReplyAt = snapshot.FirstReplyAt ?? state?.FirstReplyAt;

        var isStale = snapshot.IsStale;
        var canNudge = ComputeCanNudge(isStale, lastNudgedAt);
        var suggestedNudge = await BuildSuggestedNudgeAsync(match, requesterUserId, snapshot.IsSeenNoReply);

        if (state != null)
        {
            state.IsStale = isStale;
            await db.SaveChangesAsync();
        }

        return new ConversationStateDto(
            match.Id,
            firstMessageAt,
            firstReplyAt,
            snapshot.FirstReadAt,
            lastNudgedAt,
            isStale,
            snapshot.IsSeenNoReply,
            canNudge,
            suggestedNudge);
    }

    public async Task<NudgeResponseDto?> SendNudgeAsync(Match match, string requesterUserId)
    {
        var state = await db.ConversationStates.FindAsync(match.Id);
        if (state == null)
        {
            state = new ConversationState { MatchId = match.Id };
            db.ConversationStates.Add(state);
        }

        var snapshot = await BuildReadSnapshotAsync(match.Id);
        var isStale = snapshot.IsStale;
        var canNudge = ComputeCanNudge(isStale, state.LastNudgedAt);
        if (!canNudge)
            return null;

        var nudgeText = await BuildSuggestedNudgeAsync(match, requesterUserId, snapshot.IsSeenNoReply);

        var message = new Message
        {
            MatchId = match.Id,
            SenderId = requesterUserId,
            Content = nudgeText,
            Kind = MessageKind.Nudge,
            MetadataJson = "{\"type\":\"stale-nudge\"}"
        };

        db.Messages.Add(message);
        await db.SaveChangesAsync();

        await RecordMessageAsync(match, requesterUserId, message.SentAt);
        state.LastNudgedAt = DateTime.UtcNow;

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

        var conversationState = await GetStateAsync(match, requesterUserId);
        return new NudgeResponseDto(dto, conversationState);
    }

    private static bool ComputeIsStale(DateTime? firstMessageAt, DateTime? firstReplyAt, DateTime? firstReadAt)
    {
        if (!firstMessageAt.HasValue)
            return false;

        if (firstReplyAt.HasValue)
            return false;

        if (firstReadAt.HasValue)
            return DateTime.UtcNow - firstReadAt.Value >= SeenNoReplyStaleAfter;

        return DateTime.UtcNow - firstMessageAt.Value >= UnseenStaleAfter;
    }

    private static bool ComputeCanNudge(bool isStale, DateTime? lastNudgedAt)
    {
        if (!isStale)
            return false;

        if (!lastNudgedAt.HasValue)
            return true;

        return DateTime.UtcNow - lastNudgedAt.Value >= NudgeCooldown;
    }

    private async Task<string> BuildSuggestedNudgeAsync(Match match, string requesterUserId, bool isSeenNoReply)
    {
        var otherUserId = match.User1Id == requesterUserId ? match.User2Id : match.User1Id;

        var requester = await db.Profiles
            .Include(p => p.Tags)
            .FirstOrDefaultAsync(p => p.UserId == requesterUserId);

        var other = await db.Profiles
            .Include(p => p.Tags)
            .FirstOrDefaultAsync(p => p.UserId == otherUserId);

        if (requester == null || other == null)
            return isSeenNoReply
                ? "Thanks for reading my last message. No rush, but I'd still love to hear from you."
                : "Hey, just checking in. How's your day going?";

        var requesterHobbies = requester.Tags
            .Where(t => t.Category == TagCategory.Hobby)
            .Select(t => t.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var sharedHobby = other.Tags
            .Where(t => t.Category == TagCategory.Hobby && requesterHobbies.Contains(t.Value))
            .Select(t => t.Value)
            .FirstOrDefault();

        if (!string.IsNullOrWhiteSpace(sharedHobby))
        {
            if (isSeenNoReply)
                return $"Saw you checked my last message. Still up for talking about {sharedHobby}?";

            return $"Still up for talking about {sharedHobby}? I'd love to hear your take.";
        }

        if (isSeenNoReply)
            return $"Hey {other.DisplayName}, thanks for checking my message. Want to keep this going?";

        return $"Hey {other.DisplayName}, wanted to follow up. Hope your week is going well.";
    }

    private async Task<ConversationReadSnapshot> BuildReadSnapshotAsync(string matchId)
    {
        var firstMessage = await db.Messages
            .AsNoTracking()
            .Where(m => m.MatchId == matchId)
            .OrderBy(m => m.SentAt)
            .Select(m => new { m.SenderId, m.SentAt, m.ReadAt })
            .FirstOrDefaultAsync();

        if (firstMessage == null)
            return new ConversationReadSnapshot(null, null, null, false, false);

        var firstReplyAt = await db.Messages
            .AsNoTracking()
            .Where(m => m.MatchId == matchId && m.SentAt > firstMessage.SentAt && m.SenderId != firstMessage.SenderId)
            .OrderBy(m => m.SentAt)
            .Select(m => (DateTime?)m.SentAt)
            .FirstOrDefaultAsync();

        var firstReadAt = firstMessage.ReadAt;
        var isSeenNoReply = firstReadAt.HasValue && !firstReplyAt.HasValue;
        var isStale = ComputeIsStale(firstMessage.SentAt, firstReplyAt, firstReadAt);

        return new ConversationReadSnapshot(firstMessage.SentAt, firstReplyAt, firstReadAt, isSeenNoReply, isStale);
    }
}
