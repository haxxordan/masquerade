using System.Security.Claims;
using DatingApi.Controllers;
using DatingApi.Data;
using DatingApi.Domain;
using DatingApi.Features;
using DatingApi.Services;
using DatingApi.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
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
        Assert.All(suggestions, suggestion =>
        {
            Assert.False(string.IsNullOrWhiteSpace(suggestion));
            Assert.True(suggestion.Length <= 120);
        });
        Assert.Equal(suggestions.Count, suggestions.Distinct(StringComparer.OrdinalIgnoreCase).Count());
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

    [Fact]
    public async Task GetMatches_ReturnsPassiveConversationHealthWithNudgesFlagDisabled()
    {
        await using var db = CreateContext();
        var now = DateTime.UtcNow;

        db.Profiles.AddRange(
            CreateProfile("u2", "Unread", "owl"),
            CreateProfile("u3", "Waiting", "fox"),
            CreateProfile("u4", "Seen", "cat"),
            CreateProfile("u5", "Stale", "lynx"),
            CreateProfile("u6", "Replied", "otter"),
            CreateProfile("u7", "New", "moth"),
            CreateProfile("u8", "Cooldown", "hare"));

        db.Matches.AddRange(
            CreateMatchWithOther("match-unread", "u2", now.AddDays(-2)),
            CreateMatchWithOther("match-waiting", "u3", now.AddDays(-2)),
            CreateMatchWithOther("match-seen", "u4", now.AddDays(-2)),
            CreateMatchWithOther("match-stale", "u5", now.AddDays(-2)),
            CreateMatchWithOther("match-replied", "u6", now.AddDays(-2)),
            CreateMatchWithOther("match-new", "u7", now.AddHours(-2)),
            CreateMatchWithOther("match-cooldown", "u8", now.AddDays(-2)));

        db.Messages.AddRange(
            new Message { Id = "unread-message", MatchId = "match-unread", SenderId = "u2", Content = "hello", SentAt = now.AddMinutes(-30) },
            new Message { Id = "waiting-message", MatchId = "match-waiting", SenderId = "u1", Content = "hello", SentAt = now.AddMinutes(-30) },
            new Message { Id = "seen-message", MatchId = "match-seen", SenderId = "u1", Content = "hello", SentAt = now.AddHours(-2), ReadAt = now.AddHours(-1) },
            new Message { Id = "stale-message", MatchId = "match-stale", SenderId = "u1", Content = "hello", SentAt = now.AddHours(-13) },
            new Message { Id = "reply-first", MatchId = "match-replied", SenderId = "u1", Content = "hello", SentAt = now.AddHours(-2), ReadAt = now.AddHours(-1) },
            new Message { Id = "reply-second", MatchId = "match-replied", SenderId = "u6", Content = "hi", SentAt = now.AddMinutes(-45), ReadAt = now.AddMinutes(-30) },
            new Message { Id = "cooldown-message", MatchId = "match-cooldown", SenderId = "u1", Content = "hello", SentAt = now.AddHours(-13) });

        db.ConversationStates.Add(new ConversationState
        {
            MatchId = "match-cooldown",
            LastNudgedAt = now.AddHours(-1),
        });

        await db.SaveChangesAsync();

        var controller = CreateMatchesController(db, new FeatureFlagsOptions
        {
            Messaging = new MessagingFeatureFlags { StallNudgesV1 = false },
        });

        var response = await controller.GetMatches();
        var matches = Assert.IsType<List<MatchDto>>(response.Value);
        var byId = matches.ToDictionary(match => match.Id);

        Assert.Equal(ConversationStatus.Unread, byId["match-unread"].ConversationStatus);
        Assert.Equal("unread", byId["match-unread"].ConversationStatusLabel);
        Assert.True(byId["match-unread"].HasUnread);

        Assert.Equal(ConversationStatus.WaitingForThem, byId["match-waiting"].ConversationStatus);
        Assert.Equal("waiting for reply", byId["match-waiting"].ConversationStatusLabel);

        Assert.Equal(ConversationStatus.SeenNoReply, byId["match-seen"].ConversationStatus);
        Assert.Equal("seen, no reply", byId["match-seen"].ConversationStatusLabel);

        Assert.Equal(ConversationStatus.Stale, byId["match-stale"].ConversationStatus);
        Assert.Equal("needs a nudge", byId["match-stale"].ConversationStatusLabel);
        Assert.True(byId["match-stale"].CanNudge);

        Assert.Equal(ConversationStatus.Replied, byId["match-replied"].ConversationStatus);
        Assert.Equal("replied", byId["match-replied"].ConversationStatusLabel);

        Assert.Equal(ConversationStatus.NewMatch, byId["match-new"].ConversationStatus);
        Assert.Equal("new match", byId["match-new"].ConversationStatusLabel);

        Assert.Equal(ConversationStatus.Stale, byId["match-cooldown"].ConversationStatus);
        Assert.Equal("nudge sent", byId["match-cooldown"].ConversationStatusLabel);
        Assert.False(byId["match-cooldown"].CanNudge);
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

    private static Match CreateMatchWithOther(string id, string otherUserId, DateTime createdAt) => new()
    {
        Id = id,
        User1Id = "u1",
        User2Id = otherUserId,
        Status = MatchStatus.Matched,
        CreatedAt = createdAt,
    };

    private static MatchesController CreateMatchesController(AppDbContext db, FeatureFlagsOptions featureFlags)
    {
        var controller = new MatchesController(
            db,
            hub: null!,
            new SmartOpenersService(db),
            new ConversationNudgeService(db),
            Options.Create(featureFlags));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity([
                    new Claim(ClaimTypes.NameIdentifier, "u1"),
                ], "test")),
            },
        };

        return controller;
    }

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
