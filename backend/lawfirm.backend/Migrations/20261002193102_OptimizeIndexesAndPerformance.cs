using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace lawfirm.backend.Migrations
{
    /// <inheritdoc />
    public partial class OptimizeIndexesAndPerformance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Users_Role_IsActive",
                table: "Users",
                columns: new[] { "Role", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_CaseId_Status",
                table: "Tasks",
                columns: new[] { "CaseId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_CreatedAt",
                table: "Tasks",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_Date",
                table: "Tasks",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_Date_Status_ReminderSent",
                table: "Tasks",
                columns: new[] { "Date", "Status", "ReminderSent" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_Status",
                table: "Tasks",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_CreatedAt",
                table: "Notifications",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_CreatedAt",
                table: "Messages",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_MessageRecipients_RecipientId_Status",
                table: "MessageRecipients",
                columns: new[] { "RecipientId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_FinanceEntries_ClientId_Date",
                table: "FinanceEntries",
                columns: new[] { "ClientId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_FinanceEntries_Date",
                table: "FinanceEntries",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_Clients_Name",
                table: "Clients",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_Cases_CaseTypeCode",
                table: "Cases",
                column: "CaseTypeCode");

            migrationBuilder.CreateIndex(
                name: "IX_Cases_ClientId_Status",
                table: "Cases",
                columns: new[] { "ClientId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Cases_CreatedAt",
                table: "Cases",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Cases_Status",
                table: "Cases",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Cases_Status_CreatedAt",
                table: "Cases",
                columns: new[] { "Status", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_Role_IsActive",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_CaseId_Status",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_CreatedAt",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_Date",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_Date_Status_ReminderSent",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_Status",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_CreatedAt",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Messages_CreatedAt",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_MessageRecipients_RecipientId_Status",
                table: "MessageRecipients");

            migrationBuilder.DropIndex(
                name: "IX_FinanceEntries_ClientId_Date",
                table: "FinanceEntries");

            migrationBuilder.DropIndex(
                name: "IX_FinanceEntries_Date",
                table: "FinanceEntries");

            migrationBuilder.DropIndex(
                name: "IX_Clients_Name",
                table: "Clients");

            migrationBuilder.DropIndex(
                name: "IX_Cases_CaseTypeCode",
                table: "Cases");

            migrationBuilder.DropIndex(
                name: "IX_Cases_ClientId_Status",
                table: "Cases");

            migrationBuilder.DropIndex(
                name: "IX_Cases_CreatedAt",
                table: "Cases");

            migrationBuilder.DropIndex(
                name: "IX_Cases_Status",
                table: "Cases");

            migrationBuilder.DropIndex(
                name: "IX_Cases_Status_CreatedAt",
                table: "Cases");
        }
    }
}
