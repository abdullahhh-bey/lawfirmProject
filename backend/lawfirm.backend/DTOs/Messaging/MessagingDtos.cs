namespace lawfirm.backend.DTOs.Messaging;

public class MessageDto
{
    public Guid Id { get; set; }
    public Guid SenderId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string Type { get; set; } = "individual"; // "individual" or "broadcast"
    public string Text { get; set; } = string.Empty;
    public string AttachmentsJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; }
    public Dictionary<Guid, string> RecipientStatus { get; set; } = new();
}

public class SendMessageDto
{
    public List<Guid> RecipientIds { get; set; } = new();
    public string Text { get; set; } = string.Empty;
    public string AttachmentsJson { get; set; } = "[]";
}

public class MarkMessageSeenDto
{
    public Guid MessageId { get; set; }
}

public class NotificationDto
{
    public Guid Id { get; set; }
    public Guid LawyerId { get; set; }
    public Guid? CaseId { get; set; }
    public Guid? TaskId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; }
}

public class RecipientDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? Phone { get; set; }
}
