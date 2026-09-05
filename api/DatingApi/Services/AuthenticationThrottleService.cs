using System.Security.Cryptography;
using System.Text;
using DatingApi.Data;
using DatingApi.Domain;
using Microsoft.EntityFrameworkCore;

namespace DatingApi.Services;

public sealed record ThrottleResult(bool Allowed, TimeSpan RetryAfter);

public sealed class AuthenticationThrottleService(AppDbContext db)
{
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(15);

    public async Task<ThrottleResult> ConsumeAsync(string scope, string identity, string? ipAddress)
    {
        var now = DateTime.UtcNow;
        var ip = ipAddress ?? "unknown";
        var perIp = await ConsumeBucketAsync($"{scope}:ip:{ip}", 20, now);
        var perIdentityAndIp = await ConsumeBucketAsync($"{scope}:identity:{identity}:{ip}", 5, now);
        await db.SaveChangesAsync();

        var retryAfter = perIp.RetryAfter > perIdentityAndIp.RetryAfter ? perIp.RetryAfter : perIdentityAndIp.RetryAfter;
        return new ThrottleResult(perIp.Allowed && perIdentityAndIp.Allowed, retryAfter);
    }

    private async Task<ThrottleResult> ConsumeBucketAsync(string material, int limit, DateTime now)
    {
        var id = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(material)));
        var bucket = await db.AuthenticationThrottles.FindAsync(id);
        if (bucket == null)
        {
            bucket = new AuthenticationThrottle { Id = id, WindowStartedAt = now, Attempts = 0 };
            db.AuthenticationThrottles.Add(bucket);
        }

        if (now - bucket.WindowStartedAt >= Window)
        {
            bucket.WindowStartedAt = now;
            bucket.Attempts = 0;
        }

        bucket.Attempts++;
        var retry = Window - (now - bucket.WindowStartedAt);
        return new ThrottleResult(bucket.Attempts <= limit, retry < TimeSpan.Zero ? TimeSpan.Zero : retry);
    }
}
