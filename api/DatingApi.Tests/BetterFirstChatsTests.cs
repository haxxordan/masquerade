using DatingApi.Data;
using DatingApi.Domain;
using DatingApi.Services;
using Microsoft.EntityFrameworkCore;

namespace DatingApi.Tests;

public class BetterFirstChatsTests
{
    [Fact]
    public async Task SmartOpeners_UseSharedProfileContextBeforeFallbacks()
    {
        await using var db = CreateContext();
        var match = new Match { Id = "match-openers", User1Id = "u1", User2Id = "u2", Status = MatchStatus.Matched };

        db.Matches.Add(match);
        db.Profiles.AddRange(
            CreateProfile("u1", "Avery", "fox", ("Hobby", "climbing"), ("Music", "jazz")),
            CreateProfile("u2", "Blair", "owl", ("Hobby", "climbing"), ("Music", "jazz")));
        await db.SaveChangesAsync();

        var service = new SmartOpenersService(db);
        var suggestions = await service.GenerateForMatchAsync("u1", match);

        Assert.Equal(3, suggestions.Count);
        Assert.Contains(suggestions, suggestion => suggestion.Contains("climbing", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(suggestions, suggestion => suggestion.Contains("jazz", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task ConversationState_MarksUnseenFirstMessageStaleAfterThreshold()
    {
        await using var db = CreateContext();
        var match = CreateMatch("match-unseen");
        db.Matches.Add(match);
        db.Messages.Add(new Message
        {
            Id = "first-message",
            MatchId = match.Id,
            SenderId = "u1",
            Content = "hello",
            SentAt = DateTime.UtcNow.AddHours(-13),
        });
        await db.SaveChangesAsync();

        var service = new ConversationNudgeService(db);
        var state = await service.GetStateAsync(match, "u1");

        Assert.True(state.IsStale);
        Assert.False(state.IsSeenNoReply);
        Assert.True(state.CanNudge);
    }

    [Fact]
    public async Task ConversationState_MarksSeenNoReplyStaleAfterReadThreshold()
    {
        await using var db = CreateContext();
        var match = CreateMatch("match-seen");
        db.Matches.Add(match);
        db.Messages.Add(new Message
        {
            Id = "read-message",
            MatchId = match.Id,
            SenderId = "u1",
            Content = "hello",
            SentAt = DateTime.UtcNow.AddHours(-8),
            ReadAt = DateTime.UtcNow.AddHours(-7),
        });
        await db.SaveChangesAsync();

        var service = new ConversationNudgeService(db);
        var state = await service.GetStateAsync(match, "u1");

        Assert.True(state.IsStale);
        Assert.True(state.IsSeenNoReply);
        Assert.True(state.CanNudge);
    }

    [Fact]
    public async Task SendNudge_CreatesAuthoredNudgeMessageAndAppliesCooldown()
    {
        await using var db = CreateContext();
        var match = CreateMatch("match-nudge");
        db.Matches.Add(match);
        db.Profiles.AddRange(
            CreateProfile("u1", "Avery", "fox", ("Hobby", "climbing")),
            CreateProfile("u2", "Blair", "owl", ("Hobby", "climbing")));
        db.Messages.Add(new Message
        {
            Id = "stale-message",
            MatchId = match.Id,
            SenderId = "u1",
            Content = "hello",
            SentAt = DateTime.UtcNow.AddHours(-13),
        });
        await db.SaveChangesAsync();

        var service = new ConversationNudgeService(db);
        var firstNudge = await service.SendNudgeAsync(match, "u1");
        var secondNudge = await service.SendNudgeAsync(match, "u1");

        Assert.NotNull(firstNudge);
        Assert.Null(secondNudge);
        Assert.Equal(MessageKind.Nudge, firstNudge.Message.Kind);
        Assert.Equal("u1", firstNudge.Message.SenderId);
        Assert.False(firstNudge.State.CanNudge);
        Assert.Equal(2, await db.Messages.CountAsync(x => x.MatchId == match.Id));
    }

    [Fact]
    public async Task RecordMessage_TracksFirstReplyAfterInitialMessage()
    {
        await using var db = CreateContext();
        var match = CreateMatch("match-reply");
        db.Matches.Add(match);
        await db.SaveChangesAsync();

        var service = new ConversationNudgeService(db);
        var firstSentAt = DateTime.UtcNow.AddMinutes(-5);
        var replySentAt = DateTime.UtcNow;

        db.Messages.Add(new Message { MatchId = match.Id, SenderId = "u1", Content = "hello", SentAt = firstSentAt });
        await service.RecordMessageAsync(match, "u1", firstSentAt);
        await db.SaveChangesAsync();

        db.Messages.Add(new Message { MatchId = match.Id, SenderId = "u2", Content = "hi", SentAt = replySentAt });
        await service.RecordMessageAsync(match, "u2", replySentAt);
        await db.SaveChangesAsync();

        var state = await db.ConversationStates.FindAsync(match.Id);
        Assert.NotNull(state);
        Assert.Equal(firstSentAt, state.FirstMessageAt);
        Assert.Equal(replySentAt, state.FirstReplyAt);
        Assert.Equal(2, match.MessageCount);
        Assert.Equal(replySentAt, match.LastMessageAt);
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"better-first-chats-{Guid.NewGuid()}")
            .Options;

        return new AppDbContext(options);
    }

    private static Match CreateMatch(string id) => new()
    {
        Id = id,
        User1Id = "u1",
        User2Id = "u2",
        Status = MatchStatus.Matched,
    };

    private static Profile CreateProfile(string userId, string displayName, string animalType, params (string Category, string Value)[] tags)
    {
        return new Profile
        {
            UserId = userId,
            DisplayName = displayName,
            AnimalType = animalType,
            AnimalAvatarUrl = "https://example.com/avatar.png",
            Tags = tags.Select(tag => new ProfileTag
            {
                Category = tag.Category == "Music" ? TagCategory.Music : TagCategory.Hobby,
                Value = tag.Value,
            }).ToList(),
        };
    }
}
