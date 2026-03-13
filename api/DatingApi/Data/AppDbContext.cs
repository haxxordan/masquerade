using DatingApi.Domain;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DatingApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<AppUser>(options)
{
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<ProfileTag> ProfileTags => Set<ProfileTag>();
    public DbSet<Like> Likes => Set<Like>();
    public DbSet<Match> Matches => Set<Match>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<ConversationState> ConversationStates => Set<ConversationState>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Like>().HasKey(l => new { l.LikerId, l.LikeeId });

        builder.Entity<Profile>()
            .HasIndex(p => p.UserId)
            .IsUnique();

        // Store LayoutJson as JSONB in Postgres
        builder.Entity<Profile>()
            .Property(p => p.LayoutJson)
            .HasColumnType("jsonb");

        builder.Entity<Match>()
            .Property(m => m.CompatibilityReasonsJson)
            .HasColumnType("jsonb");

        builder.Entity<Message>()
            .Property(m => m.MetadataJson)
            .HasColumnType("jsonb");

        builder.Entity<ConversationState>()
            .HasKey(c => c.MatchId);

        builder.Entity<ConversationState>()
            .HasOne(c => c.Match)
            .WithOne()
            .HasForeignKey<ConversationState>(c => c.MatchId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
