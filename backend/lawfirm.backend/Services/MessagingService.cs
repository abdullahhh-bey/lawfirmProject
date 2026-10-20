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

        if (role != "admin")
        {
            query = query.Where(m => m.Recipients.Any(r => r.RecipientId == currentUserId) || m.SenderId == currentUserId);
        }

        var messages = await query.OrderByDescending(m => m.CreatedAt).ToListAsync();

        return messages.Select(m => new MessageDto
        {
            Id = m.Id,
            SenderId = m.SenderId,
            SenderName = !string.IsNullOrWhiteSpace(m.Sender?.FullName)
                ? m.Sender.FullName
                : (m.Sender?.Role == "admin" ? "Admin" : "Advocate"),
            SenderRole = m.Sender?.Role ?? (m.SenderId == currentUserId && role == "admin" ? "admin" : "lawyer"),
            Type = m.Type,
            Text = m.Text,
            AttachmentsJson = m.AttachmentsJson,
            CreatedAt = m.CreatedAt,
            RecipientStatus = m.Recipients.ToDictionary(r => r.RecipientId, r => r.Status),
            Recipients = m.Recipients.Select(r => new MessageRecipientDto
            {
                RecipientId = r.RecipientId,
                RecipientName = !string.IsNullOrWhiteSpace(r.Recipient?.FullName)
                    ? r.Recipient.FullName
                    : (r.Recipient?.Role == "admin" ? "Admin" : "Advocate"),
                RecipientRole = r.Recipient?.Role ?? "lawyer",
                Status = r.Status
            }).ToList()
        }).ToList();
    }

    public async Task<MessageDto> SendMessageAsync(SendMessageDto dto, Guid senderId)
    {
        // If an advocate passes Guid.Empty for admin, resolve to the active admin user:
        if (dto.RecipientIds.Contains(Guid.Empty))
        {
            dto.RecipientIds.RemoveAll(id => id == Guid.Empty);
            var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Role == "admin" && u.IsActive);
            if (adminUser != null && !dto.RecipientIds.Contains(adminUser.Id))
            {
                dto.RecipientIds.Add(adminUser.Id);
            }
        }

        if (!dto.RecipientIds.Any()) throw new ArgumentException("Select at least one recipient.");
        if (string.IsNullOrWhiteSpace(dto.Text) && (string.IsNullOrWhiteSpace(dto.AttachmentsJson) || dto.AttachmentsJson == "[]"))
        {
            throw new ArgumentException("Write a message or attach a file before sending.");
        }

        var message = new DirectOrBroadcastMessage
        {
            Id = Guid.NewGuid(),
            SenderId = senderId,
            Type = dto.RecipientIds.Count > 1 ? "broadcast" : "individual",
            Text = dto.Text.Trim(),
            AttachmentsJson = dto.AttachmentsJson ?? "[]",
            CreatedAt = DateTime.UtcNow
        };

        foreach (var recipientId in dto.RecipientIds)
        {
            message.Recipients.Add(new MessageRecipient
            {
                Id = Guid.NewGuid(),
                MessageId = message.Id,
                RecipientId = recipientId,
                Status = "Delivered", // Mock WhatsApp / push delivery status
                UpdatedAt = DateTime.UtcNow
            });
        }

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        return (await GetMessagesAsync(senderId, "admin")).First(m => m.Id == message.Id);
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
            .Where(u => u.IsActive && u.Role == "admin")
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
