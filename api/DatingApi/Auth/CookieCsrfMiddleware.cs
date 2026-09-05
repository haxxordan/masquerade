using System.Security.Cryptography;
using System.Text;

namespace DatingApi.Auth;

public sealed class CookieCsrfMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var request = context.Request;
        if (!HttpMethods.IsGet(request.Method) && !HttpMethods.IsHead(request.Method) && !HttpMethods.IsOptions(request.Method))
        {
            // Pick the cookie family for the endpoint, including refresh-only sessions.
            var prefix = request.Path.StartsWithSegments("/api/admin") ? "__Host-masq-admin" : "__Host-masq";
            if (request.Cookies.ContainsKey($"{prefix}-access") || request.Cookies.ContainsKey($"{prefix}-refresh"))
            {
                var cookie = request.Cookies[$"{prefix}-csrf"];
                var header = request.Headers["X-CSRF-Token"].ToString();
                if (string.IsNullOrWhiteSpace(cookie) || !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(cookie), Encoding.UTF8.GetBytes(header)))
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return;
                }
            }
        }
        await next(context);
    }
}
