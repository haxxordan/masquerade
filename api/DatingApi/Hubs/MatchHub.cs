using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace DatingApi.Hubs;

[Authorize]
public class MatchHub : Hub
{
    // Clients subscribe to their own UserId group via query param or JWT sub claim.
    // Real-time events: NewMatch, NewMessage
    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, Context.UserIdentifier!);
        await base.OnConnectedAsync();
    }
}
