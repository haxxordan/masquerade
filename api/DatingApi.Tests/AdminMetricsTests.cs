using DatingApi.Controllers;
using DatingApi.Data;
using DatingApi.Domain;
using DatingApi.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DatingApi.Tests;

public class AdminMetricsTests
{
    [Fact]
    public async Task GetEngagementMetrics_ComputesCountsAndRates()
    {
        await using var db = CreateContext();
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

        db.Matches.AddRange(
            new Match { Id = "m1", User1Id = "u1", User2Id = "u2", Status = MatchStatus.Matched, CreatedAt = today.AddDays(-4) },
            new Match { Id = "m2", User1Id = "u3", User2Id = "u4", Status = MatchStatus.Matched, CreatedAt = today.AddDays(-3) },
            new Match { Id = "m3", User1Id = "u5", User2Id = "u6", Status = MatchStatus.Matched, CreatedAt = today.AddDays(-2) });

        db.ConversationStates.AddRange(
            new ConversationState { MatchId = "m1", FirstMessageAt = today.AddDays(-4).AddHours(1), FirstReplyAt = today.AddDays(-4).AddHours(2), IsStale = false },
            new ConversationState { MatchId = "m2", FirstMessageAt = today.AddDays(-3).AddHours(1), IsStale = true },
            new ConversationState { MatchId = "m3", IsStale = false });

        db.Messages.AddRange(
            new Message { Id = "n1", MatchId = "m2", SenderId = "u3", Kind = MessageKind.Nudge, SentAt = today.AddDays(-3).AddHours(3), Content = "nudge" },
            new Message { Id = "r1", MatchId = "m2", SenderId = "u4", Kind = MessageKind.Text, SentAt = today.AddDays(-3).AddHours(4), Content = "reply" },
            new Message { Id = "n2", MatchId = "m3", SenderId = "u5", Kind = MessageKind.Nudge, SentAt = today.AddDays(-2).AddHours(3), Content = "nudge" });

        await db.SaveChangesAsync();

        var controller = new AdminController(db);

        var response = await controller.GetEngagementMetrics();
        var ok = Assert.IsType<OkObjectResult>(response.Result);
        var dto = Assert.IsType<EngagementMetricsDto>(ok.Value);

        Assert.Equal(3, dto.MatchedCount);
        Assert.Equal(2, dto.FirstMessagedCount);
        Assert.Equal(1, dto.FirstRepliedCount);
        Assert.Equal(1, dto.StaleChatCount);
        Assert.Equal(2, dto.NudgesSentCount);
        Assert.Equal(1, dto.NudgesActedCount);
        Assert.Equal(66.67, dto.FirstMessageRatePercent);
        Assert.Equal(50, dto.FirstReplyRatePercent);
        Assert.Equal(50, dto.StaleChatRatePercent);
        Assert.Equal(50, dto.NudgeActedRatePercent);
    }

    [Fact]
    public async Task GetEngagementTrends_AppliesBoundsAndDefaults()
    {
        await using var db = CreateContext();
        var controller = new AdminController(db);

        var response = await controller.GetEngagementTrends(days: 2, granularity: "unknown");
        var ok = Assert.IsType<OkObjectResult>(response.Result);
        var dto = Assert.IsType<EngagementTrendsDto>(ok.Value);

        Assert.Equal("daily", dto.Granularity);
        Assert.Equal(7, dto.WindowDays);
        Assert.Equal(7, dto.Points.Count);
        Assert.All(dto.Points, point =>
        {
            Assert.Equal(0, point.NewMatches);
            Assert.Equal(0, point.FirstMessages);
            Assert.Equal(0, point.FirstReplies);
            Assert.Equal(0, point.NudgesSent);
            Assert.Equal(0, point.NudgesActed);
            Assert.Equal(0, point.FirstMessageRatePercent);
            Assert.Equal(0, point.FirstReplyRatePercent);
            Assert.Equal(0, point.NudgeActedRatePercent);
        });
    }

    [Fact]
    public async Task GetEngagementTrends_WeeklyTracksNudgeActedByPeriod()
    {
        await using var db = CreateContext();
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

        db.Messages.AddRange(
            new Message
            {
                Id = "nudge-period-1",
                MatchId = "match-a",
                SenderId = "u1",
                Kind = MessageKind.Nudge,
                SentAt = today.AddDays(-18).AddHours(2),
                Content = "nudge"
            },
            new Message
            {
                Id = "reply-period-1",
                MatchId = "match-a",
                SenderId = "u2",
                Kind = MessageKind.Text,
                SentAt = today.AddDays(-18).AddHours(4),
                Content = "reply"
            },
            new Message
            {
                Id = "nudge-period-2",
                MatchId = "match-b",
                SenderId = "u3",
                Kind = MessageKind.Nudge,
                SentAt = today.AddDays(-10).AddHours(1),
                Content = "nudge"
            },
            new Message
            {
                Id = "same-sender-followup",
                MatchId = "match-b",
                SenderId = "u3",
                Kind = MessageKind.Text,
                SentAt = today.AddDays(-10).AddHours(2),
                Content = "follow-up"
            });

        await db.SaveChangesAsync();

        var controller = new AdminController(db);
        var response = await controller.GetEngagementTrends(days: 21, granularity: "weekly");
        var ok = Assert.IsType<OkObjectResult>(response.Result);
        var dto = Assert.IsType<EngagementTrendsDto>(ok.Value);

        Assert.Equal("weekly", dto.Granularity);
        Assert.Equal(21, dto.WindowDays);
        Assert.Equal(3, dto.Points.Count);

        Assert.Contains(dto.Points, point => point.NudgesSent == 1 && point.NudgesActed == 1 && point.NudgeActedRatePercent == 100);
        Assert.Contains(dto.Points, point => point.NudgesSent == 1 && point.NudgesActed == 0 && point.NudgeActedRatePercent == 0);
    }

    [Fact]
    public async Task GetEngagementTrends_AttributesActedNudgeToNudgePeriodAcrossWeeklyBoundary()
    {
        await using var db = CreateContext();
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
        var since = today.AddDays(-13);

        // Nudge is sent at the end of week 1; reply arrives in week 2.
        db.Messages.AddRange(
            new Message
            {
                Id = "boundary-nudge",
                MatchId = "match-boundary",
                SenderId = "u1",
                Kind = MessageKind.Nudge,
                SentAt = since.AddDays(6).AddHours(22),
                Content = "nudge"
            },
            new Message
            {
                Id = "boundary-reply",
                MatchId = "match-boundary",
                SenderId = "u2",
                Kind = MessageKind.Text,
                SentAt = since.AddDays(7).AddHours(2),
                Content = "reply"
            });

        await db.SaveChangesAsync();

        var controller = new AdminController(db);
        var response = await controller.GetEngagementTrends(days: 14, granularity: "weekly");
        var ok = Assert.IsType<OkObjectResult>(response.Result);
        var dto = Assert.IsType<EngagementTrendsDto>(ok.Value);

        Assert.Equal("weekly", dto.Granularity);
        Assert.Equal(14, dto.WindowDays);
        Assert.Equal(2, dto.Points.Count);

        var firstWeek = dto.Points[0];
        var secondWeek = dto.Points[1];

        Assert.Equal(1, firstWeek.NudgesSent);
        Assert.Equal(1, firstWeek.NudgesActed);
        Assert.Equal(100, firstWeek.NudgeActedRatePercent);

        Assert.Equal(0, secondWeek.NudgesSent);
        Assert.Equal(0, secondWeek.NudgesActed);
        Assert.Equal(0, secondWeek.NudgeActedRatePercent);
    }

    [Fact]
    public async Task GetEngagementMetrics_HandlesStaleScenariosAndZeroNudgeDenominator()
    {
        await using var db = CreateContext();
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

        db.Matches.AddRange(
            new Match { Id = "s1", User1Id = "u1", User2Id = "u2", Status = MatchStatus.Matched, CreatedAt = today.AddDays(-3) },
            new Match { Id = "s2", User1Id = "u3", User2Id = "u4", Status = MatchStatus.Matched, CreatedAt = today.AddDays(-2) },
            new Match { Id = "s3", User1Id = "u5", User2Id = "u6", Status = MatchStatus.Matched, CreatedAt = today.AddDays(-1) });

        db.ConversationStates.AddRange(
            new ConversationState { MatchId = "s1", IsStale = false },
            new ConversationState { MatchId = "s2", FirstMessageAt = today.AddDays(-2).AddHours(1), IsStale = true },
            new ConversationState { MatchId = "s3", FirstMessageAt = today.AddDays(-1).AddHours(1), FirstReplyAt = today.AddDays(-1).AddHours(2), IsStale = false });

        await db.SaveChangesAsync();

        var controller = new AdminController(db);
        var response = await controller.GetEngagementMetrics();
        var ok = Assert.IsType<OkObjectResult>(response.Result);
        var dto = Assert.IsType<EngagementMetricsDto>(ok.Value);

        Assert.Equal(3, dto.MatchedCount);
        Assert.Equal(2, dto.FirstMessagedCount);
        Assert.Equal(1, dto.FirstRepliedCount);
        Assert.Equal(1, dto.StaleChatCount);
        Assert.Equal(0, dto.NudgesSentCount);
        Assert.Equal(0, dto.NudgesActedCount);

        Assert.Equal(66.67, dto.FirstMessageRatePercent);
        Assert.Equal(50, dto.FirstReplyRatePercent);
        Assert.Equal(50, dto.StaleChatRatePercent);
        Assert.Equal(0, dto.NudgeActedRatePercent);
    }

    [Fact]
    public async Task GetEngagementMetrics_WithNoData_ReturnsZeroRates()
    {
        await using var db = CreateContext();
        var controller = new AdminController(db);

        var response = await controller.GetEngagementMetrics();
        var ok = Assert.IsType<OkObjectResult>(response.Result);
        var dto = Assert.IsType<EngagementMetricsDto>(ok.Value);

        Assert.Equal(0, dto.MatchedCount);
        Assert.Equal(0, dto.FirstMessagedCount);
        Assert.Equal(0, dto.FirstRepliedCount);
        Assert.Equal(0, dto.StaleChatCount);
        Assert.Equal(0, dto.NudgesSentCount);
        Assert.Equal(0, dto.NudgesActedCount);
        Assert.Equal(0, dto.FirstMessageRatePercent);
        Assert.Equal(0, dto.FirstReplyRatePercent);
        Assert.Equal(0, dto.StaleChatRatePercent);
        Assert.Equal(0, dto.NudgeActedRatePercent);
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"dating-api-tests-{Guid.NewGuid()}")
            .Options;

        return new AppDbContext(options);
    }
}
