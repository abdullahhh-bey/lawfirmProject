namespace lawfirm.backend.Models;

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid LawyerId { get; set; }

    public User? Lawyer { get; set; }

    public Guid? CaseId { get; set; }

    public CaseRecord? Case { get; set; }

    public Guid? TaskId { get; set; }

    public CaseTask? Task { get; set; }

    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Status: 'Pending', 'Sent', 'Delivered', 'Failed'
    /// </summary>
    public string Status { get; set; } = "Pending";

    public string? Error { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
