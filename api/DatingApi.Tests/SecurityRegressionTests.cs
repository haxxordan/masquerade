using System.Security.Claims;
using DatingApi.Controllers;
using DatingApi.Data;
using DatingApi.Domain;
using DatingApi.DTOs;
using DatingApi.Features;
using DatingApi.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DatingApi.Tests;

public class SecurityRegressionTests
{
    [Fact]
    public async Task Profile_read_returns_not_found_when_either_user_has_blocked_the_other()
    {
        await using var db = CreateContext();
        db.Profiles.Add(CreateProfile("u2", "p2"));
        db.Blocks.Add(new Block { BlockerId = "u2", BlockedId = "u1" });
        await db.SaveChangesAsync();

        var controller = Profiles(db, "u1");
        var response = await controller.Get("p2");

        Assert.IsType<NotFoundResult>(response.Result);
    }

    [Fact]
    public async Task Self_like_is_rejected_before_it_can_create_like_or_match()
    {
        await using var db = CreateContext();
        db.Profiles.Add(CreateProfile("u1", "mine"));
        await db.SaveChangesAsync();

        var controller = Matches(db, "u1");
        var response = await controller.Like("mine");

        Assert.IsType<BadRequestObjectResult>(response.Result);
        Assert.Empty(await db.Likes.ToListAsync());
        Assert.Empty(await db.Matches.ToListAsync());
    }

    [Fact]
    public async Task Blocked_match_is_hidden_and_empty_messages_are_rejected()
    {
        await using var db = CreateContext();
        db.Matches.Add(new Match { Id = "m1", User1Id = "u1", User2Id = "u2", Status = MatchStatus.Matched });
        db.Blocks.Add(new Block { BlockerId = "u1", BlockedId = "u2" });
        await db.SaveChangesAsync();

        var controller = Matches(db, "u1");
        var list = await controller.GetMatches();
        Assert.Empty(Assert.IsType<List<MatchDto>>(list.Value));

        db.Blocks.RemoveRange(db.Blocks);
        await db.SaveChangesAsync();
        var message = await controller.SendMessage("m1", new SendMessageRequest("   "));
        Assert.IsType<BadRequestObjectResult>(message.Result);
    }

    private static ProfilesController Profiles(AppDbContext db, string userId)
    {
        var controller = new ProfilesController(db, new MatchingService(db, Options.Create(new FeatureFlagsOptions())), new RelationshipVisibilityService(db), Options.Create(new FeatureFlagsOptions()));
        SetUser(controller, userId);
        return controller;
    }

    private static MatchesController Matches(AppDbContext db, string userId)
    {
        var controller = new MatchesController(
            db,
            hub: null!,
            new SmartOpenersService(db),
            new ConversationNudgeService(db),
            new RelationshipVisibilityService(db),
            Options.Create(new FeatureFlagsOptions()));
        SetUser(controller, userId);
        return controller;
    }

    private static void SetUser(ControllerBase controller, string userId) =>
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId)], "test")) }
        };

    private static Profile CreateProfile(string userId, string profileId) => new()
    {
        Id = profileId,
        UserId = userId,
        DisplayName = userId,
        AnimalAvatarUrl = "https://i.imgur.com/example.png",
        AnimalType = "otter",
    };

    private static AppDbContext CreateContext() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase($"security-{Guid.NewGuid()}").Options);
}
