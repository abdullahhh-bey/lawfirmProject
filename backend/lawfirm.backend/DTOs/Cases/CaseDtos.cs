namespace lawfirm.backend.DTOs.Cases;

public class CaseDto
{
    public Guid Id { get; set; }
    public string CaseId { get; set; } = string.Empty;
    public string CaseTypeCode { get; set; } = string.Empty;
    public Guid ClientId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string OurRef { get; set; } = string.Empty;
    public string Matter { get; set; } = string.Empty;
    public DateTime OpeningDate { get; set; }
    public DateTime? ClosingDate { get; set; }
    public decimal FeeAgreed { get; set; }
    public string PiFieldsJson { get; set; } = "{}";
    public string Status { get; set; } = "Unassigned";
    public string Notes { get; set; } = string.Empty;
    public string DocumentsJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<Guid> AssignedLawyerIds { get; set; } = new();
    public List<string> AssignedLawyerNames { get; set; } = new();
}

public class CreateCaseDto
{
    public string CaseTypeCode { get; set; } = string.Empty; // "FAM", "PI", etc.
    public Guid ClientId { get; set; }
    public string OurRef { get; set; } = string.Empty;
    public string Matter { get; set; } = string.Empty;
    public DateTime? OpeningDate { get; set; }
    public decimal FeeAgreed { get; set; }
    public string PiFieldsJson { get; set; } = "{}";
    public List<Guid> AssignedLawyerIds { get; set; } = new();
    public string Notes { get; set; } = string.Empty;
    public string DocumentsJson { get; set; } = "[]";
    public List<CreateCaseInitialTaskDto> Tasks { get; set; } = new();
}

public class CreateCaseInitialTaskDto
{
    public string Name { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public List<Guid> AssignedLawyerIds { get; set; } = new();
    public string Notes { get; set; } = string.Empty;
}

public class UpdateCaseDto
{
    public string OurRef { get; set; } = string.Empty;
    public string Matter { get; set; } = string.Empty;
    public DateTime? OpeningDate { get; set; }
    public DateTime? ClosingDate { get; set; }
    public decimal FeeAgreed { get; set; }
    public string PiFieldsJson { get; set; } = "{}";
    public string Notes { get; set; } = string.Empty;
}

public class AssignLawyersDto
{
    public List<Guid> LawyerIds { get; set; } = new();
}

public class SetCaseStatusDto
{
    public string Status { get; set; } = string.Empty;
}

public class SetCaseDocumentsDto
{
    public string DocumentsJson { get; set; } = "[]";
}
