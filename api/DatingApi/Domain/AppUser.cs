using Microsoft.AspNetCore.Identity;

namespace DatingApi.Domain;

public class AppUser : IdentityUser
{
    public Profile? Profile { get; set; }
}
