using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace DatingApi.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260901121000_AddAuthSessions")]
public partial class AddAuthSessions : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "AuthSessions",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                UserId = table.Column<string>(type: "text", nullable: false),
                TokenId = table.Column<string>(type: "text", nullable: false),
                RefreshTokenHash = table.Column<string>(type: "text", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                ReplacedBySessionId = table.Column<string>(type: "text", nullable: true)
            },
            constraints: table => table.PrimaryKey("PK_AuthSessions", x => x.Id));

        migrationBuilder.CreateIndex(name: "IX_AuthSessions_RefreshTokenHash", table: "AuthSessions", column: "RefreshTokenHash", unique: true);
        migrationBuilder.CreateIndex(name: "IX_AuthSessions_TokenId", table: "AuthSessions", column: "TokenId", unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable(name: "AuthSessions");
}
