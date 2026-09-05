using DatingApi.Auth;
using Microsoft.AspNetCore.Http;

namespace DatingApi.Tests;

public class CookieCsrfTests
{
    [Theory]
    [InlineData("/api/auth/refresh", "__Host-masq-refresh=r; __Host-masq-csrf=user", "", 403)]
    [InlineData("/api/auth/refresh", "__Host-masq-refresh=r; __Host-masq-csrf=user", "wrong", 403)]
    [InlineData("/api/auth/refresh", "__Host-masq-refresh=r; __Host-masq-csrf=user", "user", 204)]
    [InlineData("/api/profiles", "__Host-masq-access=a; __Host-masq-csrf=user; __Host-masq-admin-access=b; __Host-masq-admin-csrf=admin", "user", 204)]
    [InlineData("/api/admin/reports/1/review", "__Host-masq-access=a; __Host-masq-csrf=user; __Host-masq-admin-access=b; __Host-masq-admin-csrf=admin", "user", 403)]
    [InlineData("/api/admin/reports/1/review", "__Host-masq-access=a; __Host-masq-csrf=user; __Host-masq-admin-access=b; __Host-masq-admin-csrf=admin", "admin", 204)]
    [InlineData("/api/auth/mobile/refresh", "", "", 204)]
    public async Task Protects_the_endpoint_cookie_family_even_after_access_expiry(string path, string cookies, string token, int expected)
    {
        var context = new DefaultHttpContext();
        context.Request.Method = "POST";
        context.Request.Path = path;
        context.Request.Headers.Cookie = cookies;
        context.Request.Headers["X-CSRF-Token"] = token;
        var middleware = new CookieCsrfMiddleware(ctx => { ctx.Response.StatusCode = 204; return Task.CompletedTask; });
        await middleware.InvokeAsync(context);
        Assert.Equal(expected, context.Response.StatusCode);
    }
}
