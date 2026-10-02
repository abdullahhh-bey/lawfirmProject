namespace lawfirm.backend.DTOs.Finance;

public class FinanceEntryDto
{
    public Guid Id { get; set; }
    public Guid ClientId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public Guid? CaseId { get; set; }
    public string CaseDisplayId { get; set; } = string.Empty;
    public string Account { get; set; } = "office"; // "office" or "client"
    public DateTime Date { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Particulars { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = "IN"; // "IN" or "OUT"
    public decimal Amount { get; set; }
    public decimal Balance { get; set; } // Derived running balance
    public DateTime CreatedAt { get; set; }
}

public class CreateFinanceEntryDto
{
    public Guid ClientId { get; set; }
    public Guid? CaseId { get; set; }
    public string Account { get; set; } = "office";
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public string Reference { get; set; } = string.Empty;
    public string Particulars { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = "IN";
    public decimal Amount { get; set; }
}

public class ClientFinanceSummaryDto
{
    public Guid ClientId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string ClientPhone { get; set; } = string.Empty;
    public ClientSummaryInfo Client { get; set; } = new();
    public int CaseCount { get; set; }
    public decimal Agreed { get; set; }
    public decimal Received { get; set; }
    public decimal Refunded { get; set; }
    public decimal OfficeBalance { get; set; }
    public decimal ClientBalance { get; set; }
    public decimal Outstanding { get; set; }
    public DateTime? LastActivity { get; set; }
}

public class ClientSummaryInfo
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}
