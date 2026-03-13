using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DatingApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class Week1MatchingMessagingScaffold : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Kind",
                table: "Messages",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "MetadataJson",
                table: "Messages",
                type: "jsonb",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CompatibilityReasonsJson",
                table: "Matches",
                type: "jsonb",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "CompatibilityScore",
                table: "Matches",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastMessageAt",
                table: "Matches",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MessageCount",
                table: "Matches",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "ConversationStates",
                columns: table => new
                {
                    MatchId = table.Column<string>(type: "text", nullable: false),
                    FirstMessageAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FirstReplyAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastNudgedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsStale = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConversationStates", x => x.MatchId);
                    table.ForeignKey(
                        name: "FK_ConversationStates_Matches_MatchId",
                        column: x => x.MatchId,
                        principalTable: "Matches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConversationStates");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "MetadataJson",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "CompatibilityReasonsJson",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "CompatibilityScore",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "LastMessageAt",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "MessageCount",
                table: "Matches");
        }
    }
}
