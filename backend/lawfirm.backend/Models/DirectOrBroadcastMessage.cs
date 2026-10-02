namespace lawfirm.backend.Models;

public class DirectOrBroadcastMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SenderId { get; set; }

    public User? Sender { get; set; }

    /// <summary>
    /// Type: "individual" or "broadcast"
    /// </summary>
    public string Type { get; set; } = "individual";

    public string Text { get; set; } = string.Empty;

    public string AttachmentsJson { get; set; } = "[]";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<MessageRecipient> Recipients { get; set; } = new List<MessageRecipient>();
}

public class MessageRecipient
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid MessageId { get; set; }

    public DirectOrBroadcastMessage? Message { get; set; }

    public Guid RecipientId { get; set; }

    public User? Recipient { get; set; }

    /// <summary>
    /// Status: 'Pending', 'Sent', 'Delivered', 'Seen', 'Failed'
    /// </summary>
    public string Status { get; set; } = "Pending";

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
