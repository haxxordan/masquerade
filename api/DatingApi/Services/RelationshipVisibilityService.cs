using DatingApi.Data;
using DatingApi.Domain;
using Microsoft.EntityFrameworkCore;

namespace DatingApi.Services;

/// <summary>
/// Owns the safety boundary between two ordinary users. A block is symmetric for
/// visibility and interaction: either participant must no longer be able to
/// discover or contact the other.
/// </summary>
public sealed class RelationshipVisibilityService(AppDbContext db)
{
    public Task<bool> IsBlockedAsync(string firstUserId, string secondUserId) =>
        db.Blocks.AnyAsync(block =>
            (block.BlockerId == firstUserId && block.BlockedId == secondUserId) ||
            (block.BlockerId == secondUserId && block.BlockedId == firstUserId));

    public async Task<bool> CanInteractAsync(string firstUserId, string secondUserId) =>
        !string.Equals(firstUserId, secondUserId, StringComparison.Ordinal) &&
        !await IsBlockedAsync(firstUserId, secondUserId);

    public async Task<bool> CanViewProfileAsync(string requesterUserId, Profile profile) =>
        string.Equals(requesterUserId, profile.UserId, StringComparison.Ordinal) ||
        await CanInteractAsync(requesterUserId, profile.UserId);

    public async Task<bool> CanAccessMatchAsync(string requesterUserId, Match match)
    {
        if (match.User1Id != requesterUserId && match.User2Id != requesterUserId)
            return false;

        var otherUserId = match.User1Id == requesterUserId ? match.User2Id : match.User1Id;
        return await CanInteractAsync(requesterUserId, otherUserId);
    }
}
