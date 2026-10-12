using Microsoft.EntityFrameworkCore;
using lawfirm.backend.Data;
using lawfirm.backend.Models;

namespace lawfirm.backend.Services;

public class TaskWhatsAppNotificationService
{
    private readonly AppDbContext _context;
    private readonly IWhatsAppService _whatsAppService;
    private readonly ILogger<TaskWhatsAppNotificationService> _logger;

    public TaskWhatsAppNotificationService(
        AppDbContext context,
        IWhatsAppService whatsAppService,
        ILogger<TaskWhatsAppNotificationService> logger)
    {
        _context = context;
        _whatsAppService = whatsAppService;
        _logger = logger;
    }

    public async Task SendTaskCreatedNotificationsAsync(Guid taskId)
    {
        var task = await _context.Tasks
            .Include(t => t.Case)
                .ThenInclude(c => c!.AssignedLawyers)
            .Include(t => t.AssignedLawyers)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null) return;

        var recipients = task.AssignedLawyers.Where(lawyer => lawyer.IsActive).ToList();
        if (recipients.Count == 0 && task.Case != null)
        {
            recipients = task.Case.AssignedLawyers.Where(lawyer => lawyer.IsActive).ToList();
        }

        if (recipients.Count == 0) return;

        var caseId = task.Case?.CaseId ?? string.Empty;
        var dueDate = task.Date.ToString("yyyy-MM-dd");
        var isOverdue = task.Date.Date < DateTime.UtcNow.Date;
        var allOverdueRemindersSent = true;

        foreach (var lawyer in recipients)
        {
            var taskMessage = $"[PLUG SOLICITORS] A new task has been assigned to you: {task.Name}. Due: {dueDate}. Case: #{caseId}. Please check your portal now for full details.";
            var taskSent = await TrySendAsync(lawyer, taskMessage, "task-created");
            AddNotification(task, lawyer, taskMessage, taskSent);

            if (isOverdue)
            {
                var reminderMessage = $"[PLUG SOLICITORS - OVERDUE TASK REMINDER] The due date for task '{task.Name}' has passed ({dueDate}). Please review and take action. Check your portal for details.";
                var reminderSent = await TrySendAsync(lawyer, reminderMessage, "overdue-task-reminder");
                AddNotification(task, lawyer, reminderMessage, reminderSent);
                allOverdueRemindersSent &= reminderSent;
            }
        }

        if (isOverdue)
        {
            task.ReminderSent = allOverdueRemindersSent;
            task.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    private async Task<bool> TrySendAsync(User lawyer, string message, string notificationType)
    {
        if (string.IsNullOrWhiteSpace(lawyer.Phone))
        {
            _logger.LogWarning("Skipping {NotificationType} WhatsApp notification because the recipient has no phone number.", notificationType);
            return false;
        }

        try
        {
            var (success, _) = await _whatsAppService.SendTextMessageAsync(lawyer.Phone, message);
            if (!success)
            {
                _logger.LogWarning("{NotificationType} WhatsApp notification was not delivered.", notificationType);
            }
            return success;
        }
        catch (Exception ex)
        {
            _logger.LogError("{NotificationType} WhatsApp notification failed ({ErrorType}).", notificationType, ex.GetType().Name);
            return false;
        }
    }

    private void AddNotification(CaseTask task, User lawyer, string message, bool sent)
    {
        _context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            LawyerId = lawyer.Id,
            CaseId = task.CaseId,
            TaskId = task.Id,
            Message = message,
            Status = sent ? "Sent (WhatsApp)" : "Log Only",
            CreatedAt = DateTime.UtcNow
        });
    }
}