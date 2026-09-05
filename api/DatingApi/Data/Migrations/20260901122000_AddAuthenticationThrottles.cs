using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace DatingApi.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260901122000_AddAuthenticationThrottles")]
public partial class AddAuthenticationThrottles : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) => migrationBuilder.CreateTable(
        name: "AuthenticationThrottles",
        columns: table => new
        {
            Id = table.Column<string>(type: "text", nullable: false),
            WindowStartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
            Attempts = table.Column<int>(type: "integer", nullable: false)
        },
        constraints: table => table.PrimaryKey("PK_AuthenticationThrottles", x => x.Id));

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable(name: "AuthenticationThrottles");
}
