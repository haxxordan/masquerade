using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace DatingApi.Data.Migrations;

/// <summary>
/// Removes invalid historical self/duplicate matches before enforcing the
/// invariant at the database boundary. Dependent messages and conversation
/// state are removed by their existing cascade foreign keys.
/// </summary>
[DbContext(typeof(AppDbContext))]
[Migration("20260901120000_EnforceDistinctMatchUsers")]
public partial class EnforceDistinctMatchUsers : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("DELETE FROM \"Matches\" WHERE \"User1Id\" = \"User2Id\";");
        migrationBuilder.Sql("""
            UPDATE "Matches"
            SET "User1Id" = LEAST("User1Id", "User2Id"),
                "User2Id" = GREATEST("User1Id", "User2Id");

            WITH ranked AS (
                SELECT "Id", ROW_NUMBER() OVER (
                    PARTITION BY "User1Id", "User2Id"
                    ORDER BY "CreatedAt", "Id") AS row_number
                FROM "Matches"
            )
            DELETE FROM "Matches" AS match
            USING ranked
            WHERE match."Id" = ranked."Id" AND ranked.row_number > 1;
            """);

        migrationBuilder.AddCheckConstraint(
            name: "CK_Matches_DistinctUsers",
            table: "Matches",
            sql: "\"User1Id\" <> \"User2Id\"");

        migrationBuilder.CreateIndex(
            name: "IX_Matches_User1Id_User2Id",
            table: "Matches",
            columns: new[] { "User1Id", "User2Id" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_Matches_User1Id_User2Id", table: "Matches");
        migrationBuilder.DropCheckConstraint(name: "CK_Matches_DistinctUsers", table: "Matches");
    }
}
