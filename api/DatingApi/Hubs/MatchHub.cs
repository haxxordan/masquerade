using DatingApi.Data;
using DatingApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace DatingApi.Hubs;

[Authorize]
public class MatchHub(AppDbContext db, RelationshipVisibilityService visibility) : Hub
{
    // Clients subscribe to their own UserId group via query param or JWT sub claim.
    // Real-time events: NewMatch, NewMessage, TypingStarted, TypingStopped
    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, Context.UserIdentifier!);
        await base.OnConnectedAsync();
    }

    public async Task StartTyping(string matchId)
    {
        var otherUserId = await GetOtherUserIdAsync(matchId);
        if (otherUserId != null)
            await Clients.Group(otherUserId).SendAsync("TypingStarted", matchId);
    }

    public async Task StopTyping(string matchId)
    {
        var otherUserId = await GetOtherUserIdAsync(matchId);
        if (otherUserId != null)
            await Clients.Group(otherUserId).SendAsync("TypingStopped", matchId);
    }

    private async Task<string?> GetOtherUserIdAsync(string matchId)
    {
        var myId = Context.UserIdentifier!;
        var match = await db.Matches
            .AsNoTracking()
            .Where(m => m.Id == matchId && (m.User1Id == myId || m.User2Id == myId))
            .Select(m => new { m.User1Id, m.User2Id })
            .FirstOrDefaultAsync();

        if (match == null) return null;
        var otherUserId = match.User1Id == myId ? match.User2Id : match.User1Id;
        return await visibility.CanInteractAsync(myId, otherUserId) ? otherUserId : null;
    }
}
