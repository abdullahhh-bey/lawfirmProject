namespace lawfirm.backend.Models;

public class CaseRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Formatted unique case ID (e.g. FAM-001, PI-001). Immutable after creation.
    /// </summary>
    public string CaseId { get; set; } = string.Empty;

    /// <summary>
    /// Optional case number retained from the firm's previous case register.
    /// </summary>
    public string? LegacyCaseId { get; set; }

    public string CaseTypeCode { get; set; } = string.Empty;

    public Guid ClientId { get; set; }

    public Client? Client { get; set; }

    public string OurRef { get; set; } = string.Empty;

    public string Matter { get; set; } = string.Empty;

    public DateTime OpeningDate { get; set; } = DateTime.UtcNow;

    public DateTime? ClosingDate { get; set; }

    public decimal FeeAgreed { get; set; } = 0;

    /// <summary>
    /// PI-specific fields stored as JSON (e.g. { s1, s2, medFee, engrFee, vd, storage, hire }).
    /// </summary>
    public string PiFieldsJson { get; set; } = "{}";

    /// <summary>
    /// Status flow: 'Unassigned', 'Assigned', 'Delivered', 'Seen', 'In Process', 'Completed'
    /// </summary>
    public string Status { get; set; } = "Unassigned";

    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// Document folder/file structure tree stored as JSON.
    /// </summary>
    public string DocumentsJson { get; set; } = "[]";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Multi-lawyer assignments (Many-to-Many)
    public ICollection<User> AssignedLawyers { get; set; } = new List<User>();

    public ICollection<CaseTask> Tasks { get; set; } = new List<CaseTask>();

    public ICollection<FinanceEntry> FinanceEntries { get; set; } = new List<FinanceEntry>();
}
