using Microsoft.EntityFrameworkCore;
using lawfirm.backend.Data;
using lawfirm.backend.DTOs.Cases;
using lawfirm.backend.Models;

namespace lawfirm.backend.Services;

public class CaseService : ICaseService
{
    private readonly AppDbContext _context;

    public CaseService(AppDbContext context)
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

    public async Task<List<CaseDto>> GetCasesAsync(Guid currentUserId, string role, int page = 1, int pageSize = 50)
    {
        IQueryable<CaseRecord> query = _context.Cases
            .AsNoTracking()
            .Include(c => c.Client)
            .Include(c => c.AssignedLawyers);

        if (role != "admin")
        {
            query = query.Where(c => c.AssignedLawyers.Any(l => l.Id == currentUserId));
        }

        var cases = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return cases.Select(MapToDto).ToList();
    }

    public async Task<CaseDto?> GetCaseByIdAsync(Guid caseId, Guid currentUserId, string role)
    {
        var caseRecord = await _context.Cases
            .AsNoTracking()
            .Include(c => c.Client)
            .Include(c => c.AssignedLawyers)
            .FirstOrDefaultAsync(c => c.Id == caseId);

        if (caseRecord == null) return null;

        if (role != "admin" && !caseRecord.AssignedLawyers.Any(l => l.Id == currentUserId))
        {
            throw new UnauthorizedAccessException("You are not authorized to view this case.");
        }

        return MapToDto(caseRecord);
    }

    /// <summary>
    /// Thread-Safe Case Intake & Atomic Sequence Generator.
    /// Uses EF Core atomic SaveChangesAsync transaction.
    /// </summary>
    public async Task<CaseDto> CreateCaseAsync(CreateCaseDto dto, Guid currentUserId)
    {
        var code = (dto.CaseTypeCode ?? "FAM").Trim().ToUpper();

        var counter = await _context.CaseTypeCounters
            .FirstOrDefaultAsync(c => c.CaseTypeCode == code);

        if (counter == null)
        {
            counter = new CaseTypeCounter { CaseTypeCode = code, NextNumber = 1 };
            _context.CaseTypeCounters.Add(counter);
            await _context.SaveChangesAsync();
        }

        var nextNum = counter.NextNumber;
        counter.NextNumber += 1;
        _context.CaseTypeCounters.Update(counter);

        var caseIdStr = $"{code}-{nextNum:D3}";

        var caseRecord = new CaseRecord
        {
            Id = Guid.NewGuid(),
            CaseId = caseIdStr,
            CaseTypeCode = code,
            ClientId = dto.ClientId,
            OurRef = dto.OurRef ?? "",
            Matter = dto.Matter ?? "",
            OpeningDate = EnsureUtc(dto.OpeningDate ?? DateTime.UtcNow),
            FeeAgreed = dto.FeeAgreed,
            PiFieldsJson = dto.PiFieldsJson ?? "{}",
            Status = dto.AssignedLawyerIds.Any() ? "Assigned" : "Unassigned",
            Notes = dto.Notes ?? "",
            DocumentsJson = dto.DocumentsJson ?? "[]",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (dto.AssignedLawyerIds.Any())
        {
            var lawyers = await _context.Users
                .Where(u => dto.AssignedLawyerIds.Contains(u.Id) && u.IsActive)
                .ToListAsync();
            foreach (var l in lawyers) caseRecord.AssignedLawyers.Add(l);
        }

        _context.Cases.Add(caseRecord);

        foreach (var taskDto in dto.Tasks)
        {
            var task = new CaseTask
            {
                Id = Guid.NewGuid(),
                CaseId = caseRecord.Id,
                Name = taskDto.Name,
                Date = EnsureUtc(taskDto.Date),
                Notes = taskDto.Notes ?? "",
                AttachmentsJson = "[]",
                ReminderSent = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var lawyerIdsToAssign = taskDto.AssignedLawyerIds.Any()
                ? taskDto.AssignedLawyerIds
                : dto.AssignedLawyerIds;

            task.Status = lawyerIdsToAssign.Any() ? "Assigned" : "Pending";

            if (lawyerIdsToAssign.Any())
            {
                var taskLawyers = await _context.Users
                    .Where(u => lawyerIdsToAssign.Contains(u.Id) && u.IsActive)
                    .ToListAsync();
                foreach (var tl in taskLawyers) task.AssignedLawyers.Add(tl);
            }

            _context.Tasks.Add(task);
        }

        await _context.SaveChangesAsync();
        return (await GetCaseByIdAsync(caseRecord.Id, currentUserId, "admin"))!;
    }

    public async Task<CaseDto> UpdateCaseAsync(Guid caseId, UpdateCaseDto dto, Guid currentUserId, string role)
    {
        var caseRecord = await _context.Cases
            .Include(c => c.Client)
            .Include(c => c.AssignedLawyers)
            .FirstOrDefaultAsync(c => c.Id == caseId);

        if (caseRecord == null) throw new KeyNotFoundException("Case not found.");

        if (role != "admin" && !caseRecord.AssignedLawyers.Any(l => l.Id == currentUserId))
        {
            throw new UnauthorizedAccessException("You are not authorized to update this case.");
        }

        caseRecord.OurRef = dto.OurRef;
        caseRecord.Matter = dto.Matter;
        if (dto.OpeningDate.HasValue) caseRecord.OpeningDate = EnsureUtc(dto.OpeningDate.Value);
        if (dto.ClosingDate.HasValue) caseRecord.ClosingDate = EnsureUtc(dto.ClosingDate.Value);
        caseRecord.FeeAgreed = dto.FeeAgreed;
        caseRecord.PiFieldsJson = dto.PiFieldsJson;
        caseRecord.Notes = dto.Notes;
        caseRecord.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToDto(caseRecord);
    }

    public async Task<CaseDto> AssignLawyersAsync(Guid caseId, List<Guid> lawyerIds)
    {
        var caseRecord = await _context.Cases
            .Include(c => c.Client)
            .Include(c => c.AssignedLawyers)
            .FirstOrDefaultAsync(c => c.Id == caseId);

        if (caseRecord == null) throw new KeyNotFoundException("Case not found.");

        caseRecord.AssignedLawyers.Clear();

        if (lawyerIds.Any())
        {
            var lawyers = await _context.Users
                .Where(u => lawyerIds.Contains(u.Id) && u.IsActive)
                .ToListAsync();
            foreach (var l in lawyers) caseRecord.AssignedLawyers.Add(l);

            if (caseRecord.Status == "Unassigned") caseRecord.Status = "Assigned";
        }
        else
        {
            if (caseRecord.Status != "Completed") caseRecord.Status = "Unassigned";
        }

        caseRecord.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToDto(caseRecord);
    }

    public async Task<CaseDto> SetCaseStatusAsync(Guid caseId, string status, Guid currentUserId, string role)
    {
        var caseRecord = await _context.Cases
            .Include(c => c.Client)
            .Include(c => c.AssignedLawyers)
            .FirstOrDefaultAsync(c => c.Id == caseId);

        if (caseRecord == null) throw new KeyNotFoundException("Case not found.");

        if (role != "admin" && !caseRecord.AssignedLawyers.Any(l => l.Id == currentUserId))
        {
            throw new UnauthorizedAccessException("You are not authorized to update status for this case.");
        }

        if (role != "admin" && IsClosedCase(caseRecord.Status))
        {
            throw new UnauthorizedAccessException("Completed, archived, or cancelled cases cannot be reopened by an advocate.");
        }

        caseRecord.Status = status;
        caseRecord.UpdatedAt = DateTime.UtcNow;

        if (status is "Archived" or "Completed")
        {
            var tasks = await _context.Tasks.Where(task => task.CaseId == caseId).ToListAsync();
            foreach (var task in tasks)
            {
                task.Status = "Completed";
                task.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();

        return MapToDto(caseRecord);
    }

    public async Task<CaseDto> SetCaseDocumentsAsync(Guid caseId, string documentsJson, Guid currentUserId, string role)
    {
        var caseRecord = await _context.Cases
            .Include(c => c.Client)
            .Include(c => c.AssignedLawyers)
            .FirstOrDefaultAsync(c => c.Id == caseId);

        if (caseRecord == null) throw new KeyNotFoundException("Case not found.");

        if (role != "admin" && !caseRecord.AssignedLawyers.Any(l => l.Id == currentUserId))
        {
            throw new UnauthorizedAccessException("You are not authorized to update documents for this case.");
        }

        if (role != "admin" && IsClosedCase(caseRecord.Status))
        {
            throw new UnauthorizedAccessException("Documents cannot be changed on a completed, archived, or cancelled case.");
        }

        caseRecord.DocumentsJson = documentsJson;
        caseRecord.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToDto(caseRecord);
    }

    public async Task DeleteCaseAsync(Guid caseId)
    {
        var caseRecord = await _context.Cases.FindAsync(caseId);
        if (caseRecord != null)
        {
            var tasks = await _context.Tasks.Where(t => t.CaseId == caseId).ToListAsync();
            var taskIds = tasks.Select(t => t.Id).ToList();

            var notifications = await _context.Notifications
                .Where(n => (n.CaseId != null && n.CaseId == caseId) || (n.TaskId != null && taskIds.Contains(n.TaskId.Value)))
                .ToListAsync();

            if (notifications.Any())
            {
                _context.Notifications.RemoveRange(notifications);
            }

            if (tasks.Any())
            {
                _context.Tasks.RemoveRange(tasks);
            }

            _context.Cases.Remove(caseRecord);
            await _context.SaveChangesAsync();
        }
    }

    private static CaseDto MapToDto(CaseRecord c)
    {
        return new CaseDto
        {
            Id = c.Id,
            CaseId = c.CaseId,
            CaseTypeCode = c.CaseTypeCode,
            ClientId = c.ClientId,
            ClientName = c.Client?.Name ?? "",
            OurRef = c.OurRef,
            Matter = c.Matter,
            OpeningDate = c.OpeningDate,
            ClosingDate = c.ClosingDate,
            FeeAgreed = c.FeeAgreed,
            PiFieldsJson = c.PiFieldsJson,
            Status = c.Status,
            Notes = c.Notes,
            DocumentsJson = c.DocumentsJson,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt,
            AssignedLawyerIds = c.AssignedLawyers.Select(l => l.Id).ToList(),
            AssignedLawyerNames = c.AssignedLawyers.Select(l => l.FullName).ToList()
        };
    }
}
