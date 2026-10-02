namespace lawfirm.backend.Models;

public class CaseTask
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid CaseId { get; set; }

    public CaseRecord? Case { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// Status: 'Pending', 'Assigned', 'Delivered', 'Seen', 'In Process', 'Completed'
    /// </summary>
    public string Status { get; set; } = "Pending";

    /// <summary>
    /// JSON list of attachments attached to the task.
    /// </summary>
    public string AttachmentsJson { get; set; } = "[]";

    public bool ReminderSent { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Multi-lawyer task assignments (Many-to-Many)
    public ICollection<User> AssignedLawyers { get; set; } = new List<User>();
}
