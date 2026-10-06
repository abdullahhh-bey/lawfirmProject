using Microsoft.EntityFrameworkCore;
using lawfirm.backend.Data;
using lawfirm.backend.DTOs.Tasks;
using lawfirm.backend.Models;

namespace lawfirm.backend.Services;

public class TaskService : ITaskService
{
    private readonly AppDbContext _context;

    public TaskService(AppDbContext context)
    {
        _context = context;
    }

    private static DateTime EnsureUtc(DateTime dt)
    {
        if (dt == default) return DateTime.UtcNow;
        if (dt.Kind == DateTimeKind.Utc) return dt;
        return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
    }

    private static bool IsClosedCase(string? status) =>
        status is "Completed" or "Archived" or "Cancelled";

    public async Task<List<TaskDto>> GetTasksAsync(Guid? caseId, Guid currentUserId, string role, int page = 1, int pageSize = 50)
    {
        IQueryable<CaseTask> query = _context.Tasks
            .AsNoTracking()
            .Include(t => t.Case)
                .ThenInclude(c => c!.AssignedLawyers)
            .Include(t => t.AssignedLawyers);

        if (caseId.HasValue)
        {
            query = query.Where(t => t.CaseId == caseId.Value);
        }

        if (role != "admin")
        {
            query = query.Where(t =>
                t.AssignedLawyers.Any(l => l.Id == currentUserId) ||
                (t.Case != null && t.Case.AssignedLawyers.Any(l => l.Id == currentUserId))
            );
        }

        var tasks = await query
            .OrderBy(t => t.Date)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return tasks.Select(MapToDto).ToList();
    }

    public async Task<TaskDto?> GetTaskByIdAsync(Guid taskId, Guid currentUserId, string role, bool requireWritable = false)
    {
        var task = await _context.Tasks
            .AsNoTracking()
            .Include(t => t.Case)
                .ThenInclude(c => c!.AssignedLawyers)
            .Include(t => t.AssignedLawyers)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null) return null;

        if (role != "admin" &&
            !task.AssignedLawyers.Any(l => l.Id == currentUserId) &&
            !(task.Case != null && task.Case.AssignedLawyers.Any(l => l.Id == currentUserId)))
        {
            throw new UnauthorizedAccessException("You are not authorized to view this task.");
        }

        if (requireWritable && role != "admin" && IsClosedCase(task.Case?.Status))
        {
            throw new UnauthorizedAccessException("Tasks on a completed, archived, or cancelled case cannot be changed.");
        }

        return MapToDto(task);
    }

    public async Task<TaskDto> CreateTaskAsync(CreateTaskDto dto, Guid currentUserId, string role)
    {
        var caseRecord = await _context.Cases
            .Include(c => c.AssignedLawyers)
            .FirstOrDefaultAsync(c => c.Id == dto.CaseId);

        if (caseRecord == null) throw new KeyNotFoundException("Case not found.");

        if (role != "admin" && !caseRecord.AssignedLawyers.Any(l => l.Id == currentUserId))
        {
            throw new UnauthorizedAccessException("You are not authorized to create tasks for this case.");
        }

        if (role != "admin" && IsClosedCase(caseRecord.Status))
        {
            throw new UnauthorizedAccessException("Tasks cannot be created on a completed, archived, or cancelled case.");
        }

        var task = new CaseTask
        {
            Id = Guid.NewGuid(),
            CaseId = dto.CaseId,
            Name = dto.Name,
            Date = EnsureUtc(dto.Date),
            Notes = dto.Notes ?? "",
            Status = dto.AssignedLawyerIds.Any() ? "Assigned" : "Pending",
            AttachmentsJson = dto.AttachmentsJson ?? "[]",
            ReminderSent = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (dto.AssignedLawyerIds.Any())
        {
            var lawyers = await _context.Users
                .Where(u => dto.AssignedLawyerIds.Contains(u.Id) && u.IsActive)
                .ToListAsync();
            foreach (var l in lawyers) task.AssignedLawyers.Add(l);
        }

        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        return (await GetTaskByIdAsync(task.Id, Guid.Empty, "admin"))!;
    }

    public async Task<TaskDto> UpdateTaskAsync(Guid taskId, UpdateTaskDto dto, Guid currentUserId, string role)
    {
        var task = await _context.Tasks
            .Include(t => t.Case)
                .ThenInclude(c => c!.AssignedLawyers)
            .Include(t => t.AssignedLawyers)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null) throw new KeyNotFoundException("Task not found.");

        if (role != "admin" &&
            !task.AssignedLawyers.Any(l => l.Id == currentUserId) &&
            !(task.Case != null && task.Case.AssignedLawyers.Any(l => l.Id == currentUserId)))
        {
            throw new UnauthorizedAccessException("You are not authorized to update this task.");
        }

        if (role != "admin" && IsClosedCase(task.Case?.Status))
        {
            throw new UnauthorizedAccessException("Tasks on a completed, archived, or cancelled case cannot be changed.");
        }

        task.Name = dto.Name;
        task.Date = EnsureUtc(dto.Date);
        task.Notes = dto.Notes;
        if (!string.IsNullOrEmpty(dto.AttachmentsJson)) task.AttachmentsJson = dto.AttachmentsJson;

        task.AssignedLawyers.Clear();
        if (dto.AssignedLawyerIds.Any())
        {
            var lawyers = await _context.Users
                .Where(u => dto.AssignedLawyerIds.Contains(u.Id) && u.IsActive)
                .ToListAsync();
            foreach (var l in lawyers) task.AssignedLawyers.Add(l);

            if (task.Status == "Pending") task.Status = "Assigned";
        }

        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToDto(task);
    }

    public async Task<TaskDto> SetTaskStatusAsync(Guid taskId, string status, Guid currentUserId, string role)
    {
        var task = await _context.Tasks
            .Include(t => t.Case)
                .ThenInclude(c => c!.AssignedLawyers)
            .Include(t => t.AssignedLawyers)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null) throw new KeyNotFoundException("Task not found.");

        if (role != "admin" &&
            !task.AssignedLawyers.Any(l => l.Id == currentUserId) &&
            !(task.Case != null && task.Case.AssignedLawyers.Any(l => l.Id == currentUserId)))
        {
            throw new UnauthorizedAccessException("You are not authorized to change status for this task.");
        }

        if (role != "admin" && IsClosedCase(task.Case?.Status))
        {
            throw new UnauthorizedAccessException("Tasks on a completed, archived, or cancelled case cannot be changed.");
        }

        var validStatuses = new[] { "Pending", "Assigned", "Delivered", "Seen", "In Process", "Completed" };
        if (!validStatuses.Contains(status))
        {
            throw new ArgumentException($"Invalid task status: '{status}'.");
        }

        task.Status = status;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToDto(task);
    }

    public async Task<TaskDto> SetTaskAttachmentsAsync(Guid taskId, string attachmentsJson, Guid currentUserId, string role)
    {
        var task = await _context.Tasks
            .Include(t => t.Case)
                .ThenInclude(c => c!.AssignedLawyers)
            .Include(t => t.AssignedLawyers)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null) throw new KeyNotFoundException("Task not found.");

        if (role != "admin" &&
            !task.AssignedLawyers.Any(l => l.Id == currentUserId) &&
            !(task.Case != null && task.Case.AssignedLawyers.Any(l => l.Id == currentUserId)))
        {
            throw new UnauthorizedAccessException("You are not authorized to update attachments for this task.");
        }

        if (role != "admin" && IsClosedCase(task.Case?.Status))
        {
            throw new UnauthorizedAccessException("Attachments on a completed, archived, or cancelled case cannot be changed.");
        }

        task.AttachmentsJson = attachmentsJson ?? "[]";
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToDto(task);
    }

    public async Task DeleteTaskAsync(Guid taskId)
    {
        var task = await _context.Tasks.FindAsync(taskId);
        if (task != null)
        {
            var notifications = await _context.Notifications
                .Where(n => n.TaskId == taskId)
                .ToListAsync();

            if (notifications.Any())
            {
                _context.Notifications.RemoveRange(notifications);
            }

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();
        }
    }

    private static TaskDto MapToDto(CaseTask t)
    {
        return new TaskDto
        {
            Id = t.Id,
            CaseId = t.CaseId,
            CaseDisplayId = t.Case?.CaseId ?? "",
            Name = t.Name,
            Date = t.Date,
            Notes = t.Notes,
            Status = t.Status,
            AttachmentsJson = t.AttachmentsJson,
            ReminderSent = t.ReminderSent,
            CreatedAt = t.CreatedAt,
            AssignedLawyerIds = t.AssignedLawyers.Select(l => l.Id).ToList(),
            AssignedLawyerNames = t.AssignedLawyers.Select(l => l.FullName).ToList()
        };
    }
}
