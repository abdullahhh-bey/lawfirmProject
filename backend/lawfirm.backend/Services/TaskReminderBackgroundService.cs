using Microsoft.EntityFrameworkCore;
using lawfirm.backend.Data;
using lawfirm.backend.Models;

namespace lawfirm.backend.Services;

/// <summary>
/// Scheduled 3-Day Reminders:
/// .NET BackgroundService that periodically scans tasks due within 3 days,
/// dispatches automated WhatsApp reminders to assigned attorneys via Green API,
/// logs Notifications in DB, and marks ReminderSent = true (showing green tick in calendar).
/// </summary>
public class TaskReminderBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<TaskReminderBackgroundService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(5); // Check every 5 mins

    public TaskReminderBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<TaskReminderBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Task Reminder BackgroundService started.");

        // Wait 10 seconds before first check
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessDueTaskRemindersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while processing task reminders.");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }
    }

    private async Task ProcessDueTaskRemindersAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var whatsAppService = scope.ServiceProvider.GetRequiredService<IWhatsAppService>();

        var targetThreshold = DateTime.SpecifyKind(DateTime.UtcNow.AddDays(3), DateTimeKind.Utc);

        var dueTasks = await db.Tasks
            .Include(t => t.Case)
                .ThenInclude(c => c!.Client)
            .Include(t => t.Case)
                .ThenInclude(c => c!.AssignedLawyers)
            .Include(t => t.AssignedLawyers)
            .Where(t => t.Date <= targetThreshold && !t.ReminderSent && t.Status != "Completed")
            .ToListAsync(stoppingToken);

        if (!dueTasks.Any()) return;

        _logger.LogInformation("Found {Count} tasks due within 3 days needing WhatsApp reminders.", dueTasks.Count);

        foreach (var task in dueTasks)
        {
            // Combine task-assigned lawyers and case-assigned lawyers
            var lawyersToNotify = task.AssignedLawyers.Where(l => l.IsActive).ToList();
            if (!lawyersToNotify.Any() && task.Case?.AssignedLawyers != null)
            {
                lawyersToNotify = task.Case.AssignedLawyers.Where(l => l.IsActive).ToList();
            }

            var clientName = task.Case?.Client?.Name ?? "Client";
            var caseIdStr = task.Case?.CaseId ?? "";

            foreach (var lawyer in lawyersToNotify)
            {
                var messageText = $"⏰ [AUTOMATED TASK REMINDER]\nDear {lawyer.FullName},\nYou have an upcoming task '{task.Name}' due on {task.Date:yyyy-MM-dd} for Case #{caseIdStr} ({clientName}).\nNotes: {task.Notes ?? "N/A"}";

                var waSuccess = false;
                if (!string.IsNullOrWhiteSpace(lawyer.Phone))
                {
                    try
                    {
                        var (resSuccess, _) = await whatsAppService.SendTextMessageAsync(lawyer.Phone, messageText);
                        waSuccess = resSuccess;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError("Failed to send automated WhatsApp reminder ({ErrorType}).", ex.GetType().Name);
                    }
                }

                // Log notification in DB audit log
                var notification = new Notification
                {
                    Id = Guid.NewGuid(),
                    LawyerId = lawyer.Id,
                    CaseId = task.CaseId,
                    TaskId = task.Id,
                    Message = messageText,
                    Status = waSuccess ? "Sent (WhatsApp)" : "Log Only",
                    CreatedAt = DateTime.UtcNow
                };

                db.Notifications.Add(notification);
            }

            task.ReminderSent = true;
            task.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(stoppingToken);
        _logger.LogInformation("Successfully sent 3-day WhatsApp reminders and marked ReminderSent = true for {Count} tasks.", dueTasks.Count);
    }
}
