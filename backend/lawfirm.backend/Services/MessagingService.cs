using Microsoft.EntityFrameworkCore;
using lawfirm.backend.Data;
using lawfirm.backend.DTOs.Messaging;
using lawfirm.backend.Models;

namespace lawfirm.backend.Services;

public class MessagingService : IMessagingService
{
    private readonly AppDbContext _context;

    public MessagingService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<MessageDto>> GetMessagesAsync(Guid currentUserId, string role)
    {
        IQueryable<DirectOrBroadcastMessage> query = _context.Messages
            .AsNoTracking()
            .AsSplitQuery()
            .Include(m => m.Sender)
            .Include(m => m.Recipients)
                .ThenInclude(r => r.Recipient);

        // Strict Privacy: Users (both Admin and Advocates) ONLY see messages
        // where they are either the sender OR an explicitly addressed recipient.
        // Private messages between co-advocates will NOT appear in the Admin portal.
        query = query.Where(m => m.Recipients.Any(r => r.RecipientId == currentUserId) || m.SenderId == currentUserId);

        var messages = await query.OrderByDescending(m => m.CreatedAt).ToListAsync();

        return messages.Select(m => new MessageDto
        {
            Id = m.Id,
            SenderId = m.SenderId,
            SenderName = !string.IsNullOrWhiteSpace(m.Sender?.FullName)
                ? m.Sender.FullName
                : (m.Sender?.Role?.ToLower() == "admin" ? "Admin" : "Advocate"),
            SenderRole = m.Sender?.Role?.ToLower() ?? (m.SenderId == currentUserId && role == "admin" ? "admin" : "lawyer"),
            Type = m.Type,
            Text = m.Text,
            AttachmentsJson = m.AttachmentsJson,
            CreatedAt = m.CreatedAt,
            RecipientStatus = m.Recipients
                .GroupBy(r => r.RecipientId)
                .ToDictionary(g => g.Key, g => g.First().Status),
            Recipients = m.Recipients.Select(r => new MessageRecipientDto
            {
                RecipientId = r.RecipientId,
                RecipientName = !string.IsNullOrWhiteSpace(r.Recipient?.FullName)
                    ? r.Recipient.FullName
                    : (r.Recipient?.Role?.ToLower() == "admin" ? "Admin" : "Advocate"),
                RecipientRole = r.Recipient?.Role?.ToLower() ?? "lawyer",
                Status = r.Status
            }).ToList()
        }).ToList();
    }

    public async Task<MessageDto> SendMessageAsync(SendMessageDto dto, Guid senderId)
    {
        if (senderId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Sender session is invalid or expired. Please sign in again.");
        }

        // Robust admin lookup: case-insensitive role match, active or inactive fallback, email fallback
        var adminUser = await _context.Users
            .FirstOrDefaultAsync(u => (u.Role.ToLower() == "admin" || u.Role.ToLower().Contains("admin")) && u.IsActive)
            ?? await _context.Users
            .FirstOrDefaultAsync(u => u.Role.ToLower() == "admin" || u.Role.ToLower().Contains("admin"))
            ?? await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower().Contains("admin"));

        // If an advocate passes Guid.Empty for admin, resolve to the admin user:
        var cleanRecipientIds = (dto.RecipientIds ?? new List<Guid>()).Distinct().ToList();
        if (cleanRecipientIds.Contains(Guid.Empty) || !cleanRecipientIds.Any())
        {
            cleanRecipientIds.RemoveAll(id => id == Guid.Empty);
            if (adminUser != null && !cleanRecipientIds.Contains(adminUser.Id))
            {
                cleanRecipientIds.Add(adminUser.Id);
            }
        }

        // Validate recipient IDs against Users table to prevent FK constraint violations
        var validUserIds = await _context.Users
            .Where(u => cleanRecipientIds.Contains(u.Id))
            .Select(u => u.Id)
            .ToListAsync();

        // If no valid users matched but admin exists, route to admin as safe fallback
        if (!validUserIds.Any() && adminUser != null)
        {
            validUserIds.Add(adminUser.Id);
        }

        if (!validUserIds.Any())
        {
            throw new ArgumentException("Select at least one valid recipient.");
        }

        if (string.IsNullOrWhiteSpace(dto.Text) && (string.IsNullOrWhiteSpace(dto.AttachmentsJson) || dto.AttachmentsJson == "[]"))
        {
            throw new ArgumentException("Write a message or attach a file before sending.");
        }

        var message = new DirectOrBroadcastMessage
        {
            Id = Guid.NewGuid(),
            SenderId = senderId,
            Type = validUserIds.Count > 1 ? "broadcast" : "individual",
            Text = dto.Text.Trim(),
            AttachmentsJson = dto.AttachmentsJson ?? "[]",
            CreatedAt = DateTime.UtcNow
        };

        foreach (var recipientId in validUserIds)
        {
            message.Recipients.Add(new MessageRecipient
            {
                Id = Guid.NewGuid(),
                MessageId = message.Id,
                RecipientId = recipientId,
                Status = "Delivered", // Mock delivery status
                UpdatedAt = DateTime.UtcNow
            });
        }

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        // Fetch specifically this created message rather than querying the entire database table
        var created = await _context.Messages
            .AsNoTracking()
            .Include(m => m.Sender)
            .Include(m => m.Recipients)
                .ThenInclude(r => r.Recipient)
            .FirstOrDefaultAsync(m => m.Id == message.Id);

        if (created == null)
        {
            throw new InvalidOperationException("Failed to retrieve the sent message.");
        }

        return new MessageDto
        {
            Id = created.Id,
            SenderId = created.SenderId,
            SenderName = !string.IsNullOrWhiteSpace(created.Sender?.FullName)
                ? created.Sender.FullName
                : (created.Sender?.Role?.ToLower() == "admin" ? "Admin" : "Advocate"),
            SenderRole = created.Sender?.Role?.ToLower() ?? "lawyer",
            Type = created.Type,
            Text = created.Text,
            AttachmentsJson = created.AttachmentsJson,
            CreatedAt = created.CreatedAt,
            RecipientStatus = created.Recipients
                .GroupBy(r => r.RecipientId)
                .ToDictionary(g => g.Key, g => g.First().Status),
            Recipients = created.Recipients.Select(r => new MessageRecipientDto
            {
                RecipientId = r.RecipientId,
                RecipientName = !string.IsNullOrWhiteSpace(r.Recipient?.FullName)
                    ? r.Recipient.FullName
                    : (r.Recipient?.Role?.ToLower() == "admin" ? "Admin" : "Advocate"),
                RecipientRole = r.Recipient?.Role?.ToLower() ?? "lawyer",
                Status = r.Status
            }).ToList()
        };
    }

    public async Task<MessageDto> SetMessageAttachmentsAsync(Guid messageId, string attachmentsJson, Guid currentUserId, string role)
    {
        var message = await _context.Messages
            .Include(m => m.Sender)
            .Include(m => m.Recipients)
            .FirstOrDefaultAsync(m => m.Id == messageId);

        if (message == null) throw new KeyNotFoundException("Message not found.");

        if (role != "admin" && message.SenderId != currentUserId && !message.Recipients.Any(r => r.RecipientId == currentUserId))
        {
            throw new UnauthorizedAccessException("You are not authorized to update attachments for this message.");
        }

        message.AttachmentsJson = attachmentsJson ?? "[]";
        await _context.SaveChangesAsync();

        return new MessageDto
        {
            Id = message.Id,
            SenderId = message.SenderId,
            SenderName = message.Sender?.FullName ?? "Admin",
            Type = message.Type,
            Text = message.Text,
            AttachmentsJson = message.AttachmentsJson,
            CreatedAt = message.CreatedAt,
            RecipientStatus = message.Recipients.ToDictionary(r => r.RecipientId, r => r.Status)
        };
    }

    public async Task MarkMessageSeenAsync(Guid messageId, Guid lawyerId)
    {
        var recipient = await _context.MessageRecipients
            .FirstOrDefaultAsync(r => r.MessageId == messageId && r.RecipientId == lawyerId);

        if (recipient != null && recipient.Status != "Seen")
        {
            recipient.Status = "Seen";
            recipient.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<NotificationDto>> GetNotificationsAsync(Guid currentUserId, string role)
    {
        IQueryable<Notification> query = _context.Notifications.AsNoTracking();

        if (role != "admin")
        {
            query = query.Where(n => n.LawyerId == currentUserId);
        }

        var notifs = await query.OrderByDescending(n => n.CreatedAt).ToListAsync();

        return notifs.Select(n => new NotificationDto
        {
            Id = n.Id,
            LawyerId = n.LawyerId,
            CaseId = n.CaseId,
            TaskId = n.TaskId,
            Message = n.Message,
            Status = n.Status,
            CreatedAt = n.CreatedAt
        }).ToList();
    }

    public async Task<List<RecipientDto>> GetRecipientsAsync(Guid currentUserId, string role)
    {
        if (role == "admin")
        {
            var users = await _context.Users
                .AsNoTracking()
                .Where(u => u.IsActive && u.Id != currentUserId)
                .OrderBy(u => u.FullName)
                .ToListAsync();

            return users.Select(u => new RecipientDto
            {
                Id = u.Id,
                Name = u.FullName,
                Email = u.Email,
                Role = u.Role,
                Phone = u.Phone
            }).ToList();
        }

        // Advocate view: Admin + Co-assigned fellow case mates ONLY
        var adminUser = await _context.Users
            .AsNoTracking()
            .Where(u => (u.Role.ToLower() == "admin" || u.Role.ToLower().Contains("admin")) && u.IsActive)
            .FirstOrDefaultAsync()
            ?? await _context.Users
            .AsNoTracking()
            .Where(u => u.Role.ToLower() == "admin" || u.Role.ToLower().Contains("admin"))
            .FirstOrDefaultAsync()
            ?? await _context.Users
            .AsNoTracking()
            .Where(u => u.Email.ToLower().Contains("admin"))
            .FirstOrDefaultAsync();

        var sharedCaseIds = await _context.Cases
            .Where(c => c.AssignedLawyers.Any(l => l.Id == currentUserId))
            .Select(c => c.Id)
            .ToListAsync();

        var fellowLawyerIds = await _context.Cases
            .Where(c => sharedCaseIds.Contains(c.Id))
            .SelectMany(c => c.AssignedLawyers)
            .Where(l => l.Id != currentUserId && l.IsActive)
            .Select(l => l.Id)
            .Distinct()
            .ToListAsync();

        var fellowLawyers = await _context.Users
            .AsNoTracking()
            .Where(u => fellowLawyerIds.Contains(u.Id))
            .OrderBy(u => u.FullName)
            .ToListAsync();

        var result = new List<RecipientDto>();
        if (adminUser != null)
        {
            result.Add(new RecipientDto
            {
                Id = adminUser.Id,
                Name = !string.IsNullOrWhiteSpace(adminUser.FullName) ? $"{adminUser.FullName} (Admin)" : "Admin",
                Email = adminUser.Email,
                Role = "admin",
                Phone = adminUser.Phone
            });
        }

        result.AddRange(fellowLawyers.Select(u => new RecipientDto
        {
            Id = u.Id,
            Name = u.FullName,
            Email = u.Email,
            Role = u.Role,
            Phone = u.Phone
        }));

        return result;
    }
}
