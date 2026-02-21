using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DatingApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGenderAndLookingFor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Gender",
                table: "Profiles",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LookingFor",
                table: "Profiles",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Gender",
                table: "Profiles");

            migrationBuilder.DropColumn(
                name: "LookingFor",
                table: "Profiles");
        }
    }
}
