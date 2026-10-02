using lawfirm.backend.DTOs.Messaging;

namespace lawfirm.backend.Services;

public interface IMessagingService
{
    Task<List<MessageDto>> GetMessagesAsync(Guid currentUserId, string role);
    Task<MessageDto> SendMessageAsync(SendMessageDto dto, Guid senderId);
    Task MarkMessageSeenAsync(Guid messageId, Guid lawyerId);
    Task<List<NotificationDto>> GetNotificationsAsync(Guid currentUserId, string role);
}
