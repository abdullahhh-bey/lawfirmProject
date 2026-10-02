namespace lawfirm.backend.Models;

public class FinanceEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ClientId { get; set; }

    public Client? Client { get; set; }

    public Guid? CaseId { get; set; }

    public CaseRecord? Case { get; set; }

    /// <summary>
    /// Account type: "office" (fee payments) or "client" (client trust account).
    /// </summary>
    public string Account { get; set; } = "office";

    public DateTime Date { get; set; } = DateTime.UtcNow;

    public string Reference { get; set; } = string.Empty;

    public string Particulars { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Movement type: "IN" or "OUT"
    /// </summary>
    public string Type { get; set; } = "IN";

    public decimal Amount { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
