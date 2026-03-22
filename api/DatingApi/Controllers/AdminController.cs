using DatingApi.Auth;
using DatingApi.Data;
using DatingApi.Domain;
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
    private sealed record NudgeEvent(string MatchId, string SenderId, DateTime SentAt);
    private sealed record ReplyEvent(string MatchId, string SenderId, DateTime SentAt);

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

    [HttpGet("metrics/funnel")]
    public async Task<ActionResult<FunnelMetricsDto>> GetFunnelMetrics()
    {
        var matchedCount = await db.Matches.AsNoTracking().CountAsync();
        var firstMessagedCount = await db.ConversationStates.AsNoTracking().CountAsync(x => x.FirstMessageAt != null);
        var firstRepliedCount = await db.ConversationStates.AsNoTracking().CountAsync(x => x.FirstReplyAt != null);
        var staleChatCount = await db.ConversationStates.AsNoTracking().CountAsync(x => x.IsStale);
        var nudgesSent = await db.Messages.AsNoTracking()
            .Where(x => x.Kind == MessageKind.Nudge)
            .Select(x => new NudgeEvent(x.MatchId, x.SenderId, x.SentAt))
            .ToListAsync();

        var nonNudgeRepliesByMatch = await GetNonNudgeRepliesByMatchAsync();
        var nudgesActedCount = CountActedNudges(nudgesSent, nonNudgeRepliesByMatch, sinceInclusive: null, untilExclusive: null);

        return Ok(new FunnelMetricsDto(
            matchedCount,
            firstMessagedCount,
            firstRepliedCount,
            staleChatCount,
            nudgesSent.Count,
            nudgesActedCount,
            ToPercent(firstMessagedCount, matchedCount),
            ToPercent(firstRepliedCount, firstMessagedCount),
            ToPercent(staleChatCount, firstMessagedCount),
            ToPercent(nudgesActedCount, nudgesSent.Count)));
    }

    [HttpGet("metrics/engagement")]
    public async Task<ActionResult<EngagementMetricsDto>> GetEngagementMetrics()
    {
        var matchedCount = await db.Matches.AsNoTracking().CountAsync();
        var firstMessagedCount = await db.ConversationStates.AsNoTracking().CountAsync(x => x.FirstMessageAt != null);
        var firstRepliedCount = await db.ConversationStates.AsNoTracking().CountAsync(x => x.FirstReplyAt != null);
        var staleChatCount = await db.ConversationStates.AsNoTracking().CountAsync(x => x.IsStale);

        var nudgesSent = await db.Messages.AsNoTracking()
            .Where(x => x.Kind == MessageKind.Nudge)
            .Select(x => new NudgeEvent(x.MatchId, x.SenderId, x.SentAt))
            .ToListAsync();

        var nonNudgeRepliesByMatch = await GetNonNudgeRepliesByMatchAsync();
        var nudgesActedCount = CountActedNudges(nudgesSent, nonNudgeRepliesByMatch, sinceInclusive: null, untilExclusive: null);

        return Ok(new EngagementMetricsDto(
            matchedCount,
            firstMessagedCount,
            firstRepliedCount,
            staleChatCount,
            nudgesSent.Count,
            nudgesActedCount,
            ToPercent(firstMessagedCount, matchedCount),
            ToPercent(firstRepliedCount, firstMessagedCount),
            ToPercent(staleChatCount, firstMessagedCount),
            ToPercent(nudgesActedCount, nudgesSent.Count)));
    }

    [HttpGet("metrics/daily")]
    public async Task<ActionResult<IReadOnlyList<DailyFunnelPointDto>>> GetDailyMetrics()
    {
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
        var since = today.AddDays(-29);

        var recentMatchDates = await db.Matches.AsNoTracking()
            .Where(x => x.CreatedAt >= since)
            .Select(x => x.CreatedAt)
            .ToListAsync();

        var recentStates = await db.ConversationStates.AsNoTracking()
            .Where(x => (x.FirstMessageAt != null && x.FirstMessageAt >= since) ||
                        (x.FirstReplyAt != null && x.FirstReplyAt >= since))
            .Select(x => new { x.FirstMessageAt, x.FirstReplyAt })
            .ToListAsync();

        var recentNudgeDates = await db.Messages.AsNoTracking()
            .Where(x => x.Kind == MessageKind.Nudge && x.SentAt >= since)
            .Select(x => x.SentAt)
            .ToListAsync();

        var matchesByDay = recentMatchDates.GroupBy(d => d.Date).ToDictionary(g => g.Key, g => g.Count());
        var firstMessagesByDay = recentStates
            .Where(s => s.FirstMessageAt.HasValue && s.FirstMessageAt.Value >= since)
            .GroupBy(s => s.FirstMessageAt!.Value.Date)
            .ToDictionary(g => g.Key, g => g.Count());
        var firstRepliesByDay = recentStates
            .Where(s => s.FirstReplyAt.HasValue && s.FirstReplyAt.Value >= since)
            .GroupBy(s => s.FirstReplyAt!.Value.Date)
            .ToDictionary(g => g.Key, g => g.Count());
        var nudgesByDay = recentNudgeDates.GroupBy(d => d.Date).ToDictionary(g => g.Key, g => g.Count());

        var result = Enumerable.Range(0, 30).Select(i =>
        {
            var day = since.AddDays(i);
            return new DailyFunnelPointDto(
                day.ToString("yyyy-MM-dd"),
                matchesByDay.GetValueOrDefault(day),
                firstMessagesByDay.GetValueOrDefault(day),
                firstRepliesByDay.GetValueOrDefault(day),
                nudgesByDay.GetValueOrDefault(day));
        }).ToList();

        return Ok(result);
    }

    [HttpGet("metrics/trends")]
    public async Task<ActionResult<EngagementTrendsDto>> GetEngagementTrends([FromQuery] int days = 30, [FromQuery] string granularity = "daily")
    {
        days = Math.Clamp(days, 7, 180);
        var normalizedGranularity = NormalizeGranularity(granularity);
        var periodSizeDays = normalizedGranularity == "weekly" ? 7 : 1;

        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
        var since = today.AddDays(-(days - 1));
        var untilExclusive = today.AddDays(1);

        var recentMatchDates = await db.Matches.AsNoTracking()
            .Where(x => x.CreatedAt >= since && x.CreatedAt < untilExclusive)
            .Select(x => x.CreatedAt)
            .ToListAsync();

        var recentStates = await db.ConversationStates.AsNoTracking()
            .Where(x =>
                (x.FirstMessageAt != null && x.FirstMessageAt >= since && x.FirstMessageAt < untilExclusive) ||
                (x.FirstReplyAt != null && x.FirstReplyAt >= since && x.FirstReplyAt < untilExclusive))
            .Select(x => new { x.FirstMessageAt, x.FirstReplyAt })
            .ToListAsync();

        var nudgesSent = await db.Messages.AsNoTracking()
            .Where(x => x.Kind == MessageKind.Nudge && x.SentAt >= since && x.SentAt < untilExclusive)
            .Select(x => new NudgeEvent(x.MatchId, x.SenderId, x.SentAt))
            .ToListAsync();

        var nonNudgeRepliesByMatch = await GetNonNudgeRepliesByMatchAsync();

        var matchesByPeriod = GroupByPeriod(recentMatchDates, since, periodSizeDays);
        var firstMessagesByPeriod = GroupByPeriod(
            recentStates
                .Where(s => s.FirstMessageAt.HasValue)
                .Select(s => s.FirstMessageAt!.Value),
            since,
            periodSizeDays);
        var firstRepliesByPeriod = GroupByPeriod(
            recentStates
                .Where(s => s.FirstReplyAt.HasValue)
                .Select(s => s.FirstReplyAt!.Value),
            since,
            periodSizeDays);
        var nudgesByPeriod = GroupByPeriod(nudgesSent.Select(x => x.SentAt), since, periodSizeDays);

        var points = new List<TrendPointDto>();
        for (var periodStart = since; periodStart <= today; periodStart = periodStart.AddDays(periodSizeDays))
        {
            var periodEndExclusive = periodStart.AddDays(periodSizeDays);
            if (periodEndExclusive > untilExclusive)
                periodEndExclusive = untilExclusive;

            var nudgesActed = CountActedNudges(nudgesSent, nonNudgeRepliesByMatch, periodStart, periodEndExclusive);
            var newMatches = matchesByPeriod.GetValueOrDefault(periodStart);
            var firstMessages = firstMessagesByPeriod.GetValueOrDefault(periodStart);
            var firstReplies = firstRepliesByPeriod.GetValueOrDefault(periodStart);
            var nudgesSentCount = nudgesByPeriod.GetValueOrDefault(periodStart);

            points.Add(new TrendPointDto(
                periodStart.ToString("yyyy-MM-dd"),
                newMatches,
                firstMessages,
                firstReplies,
                nudgesSentCount,
                nudgesActed,
                ToPercent(firstMessages, newMatches),
                ToPercent(firstReplies, firstMessages),
                ToPercent(nudgesActed, nudgesSentCount)));
        }

        return Ok(new EngagementTrendsDto(normalizedGranularity, days, points));
    }

    [HttpGet("reports")]
    public async Task<ActionResult<IReadOnlyList<AdminReportDto>>> GetReports()
    {
        var reports = await db.Reports.AsNoTracking()
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var userIds = reports.SelectMany(r => new[] { r.ReporterId, r.ReportedId }).Distinct().ToList();

        var emailsByUserId = await db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Email ?? string.Empty);

        var dtos = reports.Select(r => new AdminReportDto(
            r.Id,
            r.Reason.ToString(),
            r.Details,
            r.ReporterId,
            emailsByUserId.GetValueOrDefault(r.ReporterId),
            r.ReportedId,
            emailsByUserId.GetValueOrDefault(r.ReportedId),
            r.CreatedAt,
            r.IsReviewed,
            r.ReviewedAt,
            r.AdminNote)).ToList();

        return Ok(dtos);
    }

    [HttpPost("reports/{reportId}/review")]
    public async Task<IActionResult> ReviewReport(string reportId, AdminReportReviewRequest request)
    {
        var report = await db.Reports.FindAsync(reportId);
        if (report == null) return NotFound();

        report.IsReviewed = true;
        report.ReviewedAt = DateTime.UtcNow;
        report.AdminNote = request.AdminNote;
        await db.SaveChangesAsync();

        return Ok();
    }

    private static string NormalizeGranularity(string granularity)
    {
        if (string.Equals(granularity, "weekly", StringComparison.OrdinalIgnoreCase))
            return "weekly";

        return "daily";
    }

    private static double ToPercent(int numerator, int denominator)
    {
        if (denominator <= 0)
            return 0;

        return Math.Round((double)numerator / denominator * 100, 2);
    }

    private static Dictionary<DateTime, int> GroupByPeriod(IEnumerable<DateTime> timestamps, DateTime since, int periodSizeDays)
    {
        return timestamps
            .GroupBy(timestamp => GetPeriodStart(DateTime.SpecifyKind(timestamp.Date, DateTimeKind.Utc), since, periodSizeDays))
            .ToDictionary(group => group.Key, group => group.Count());
    }

    private static DateTime GetPeriodStart(DateTime day, DateTime since, int periodSizeDays)
    {
        var offsetDays = (int)(day - since).TotalDays;
        if (offsetDays < 0)
            offsetDays = 0;

        var bucket = offsetDays / periodSizeDays;
        return since.AddDays(bucket * periodSizeDays);
    }

    private static int CountActedNudges(
        IReadOnlyList<NudgeEvent> nudges,
        IReadOnlyDictionary<string, List<ReplyEvent>> repliesByMatch,
        DateTime? sinceInclusive,
        DateTime? untilExclusive)
    {
        var count = 0;

        foreach (var nudge in nudges)
        {
            if (sinceInclusive.HasValue && nudge.SentAt < sinceInclusive.Value)
                continue;

            if (untilExclusive.HasValue && nudge.SentAt >= untilExclusive.Value)
                continue;

            if (!repliesByMatch.TryGetValue(nudge.MatchId, out var replies))
                continue;

            if (replies.Any(reply => reply.SentAt > nudge.SentAt && !string.Equals(reply.SenderId, nudge.SenderId, StringComparison.Ordinal)))
            {
                count += 1;
            }
        }

        return count;
    }

    private async Task<IReadOnlyDictionary<string, List<ReplyEvent>>> GetNonNudgeRepliesByMatchAsync()
    {
        var replies = await db.Messages.AsNoTracking()
            .Where(x => x.Kind != MessageKind.Nudge)
            .Select(x => new ReplyEvent(x.MatchId, x.SenderId, x.SentAt))
            .ToListAsync();

        return replies
            .GroupBy(reply => reply.MatchId)
            .ToDictionary(group => group.Key, group => group.OrderBy(reply => reply.SentAt).ToList());
    }
}