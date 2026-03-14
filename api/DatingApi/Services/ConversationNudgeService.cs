using DatingApi.Data;
using DatingApi.Domain;
using DatingApi.DTOs;
using Microsoft.EntityFrameworkCore;

namespace DatingApi.Services;

public class ConversationNudgeService(AppDbContext db)
{
    private static readonly TimeSpan StaleAfter = TimeSpan.FromHours(12);
    private static readonly TimeSpan NudgeCooldown = TimeSpan.FromHours(24);

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

        var firstMessageAt = state?.FirstMessageAt;
        var firstReplyAt = state?.FirstReplyAt;
        var lastNudgedAt = state?.LastNudgedAt;

        var isStale = ComputeIsStale(firstMessageAt, firstReplyAt);
        var canNudge = ComputeCanNudge(isStale, lastNudgedAt);
        var suggestedNudge = await BuildSuggestedNudgeAsync(match, requesterUserId);

        if (state != null)
        {
            state.IsStale = isStale;
            await db.SaveChangesAsync();
        }

        return new ConversationStateDto(
            match.Id,
            firstMessageAt,
            firstReplyAt,
            lastNudgedAt,
            isStale,
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

        var isStale = ComputeIsStale(state.FirstMessageAt, state.FirstReplyAt);
        var canNudge = ComputeCanNudge(isStale, state.LastNudgedAt);
        if (!canNudge)
            return null;

        var nudgeText = await BuildSuggestedNudgeAsync(match, requesterUserId);

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
            message.SenderId,
            message.Content,
            message.SentAt,
            message.Kind,
            message.MetadataJson);

        var conversationState = await GetStateAsync(match, requesterUserId);
        return new NudgeResponseDto(dto, conversationState);
    }

    private static bool ComputeIsStale(DateTime? firstMessageAt, DateTime? firstReplyAt)
    {
        if (!firstMessageAt.HasValue)
            return false;

        if (firstReplyAt.HasValue)
            return false;

        return DateTime.UtcNow - firstMessageAt.Value >= StaleAfter;
    }

    private static bool ComputeCanNudge(bool isStale, DateTime? lastNudgedAt)
    {
        if (!isStale)
            return false;

        if (!lastNudgedAt.HasValue)
            return true;

        return DateTime.UtcNow - lastNudgedAt.Value >= NudgeCooldown;
    }

    private async Task<string> BuildSuggestedNudgeAsync(Match match, string requesterUserId)
    {
        var otherUserId = match.User1Id == requesterUserId ? match.User2Id : match.User1Id;

        var requester = await db.Profiles
            .Include(p => p.Tags)
            .FirstOrDefaultAsync(p => p.UserId == requesterUserId);

        var other = await db.Profiles
            .Include(p => p.Tags)
            .FirstOrDefaultAsync(p => p.UserId == otherUserId);

        if (requester == null || other == null)
            return "Hey, just checking in. How's your day going?";

        var requesterHobbies = requester.Tags
            .Where(t => t.Category == TagCategory.Hobby)
            .Select(t => t.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var sharedHobby = other.Tags
            .Where(t => t.Category == TagCategory.Hobby && requesterHobbies.Contains(t.Value))
            .Select(t => t.Value)
            .FirstOrDefault();

        if (!string.IsNullOrWhiteSpace(sharedHobby))
            return $"Still up for talking about {sharedHobby}? I'd love to hear your take.";

        return $"Hey {other.DisplayName}, wanted to follow up. Hope your week is going well.";
    }
}
