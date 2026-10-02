namespace lawfirm.backend.DTOs.Tasks;

public class TaskDto
{
    public Guid Id { get; set; }
    public Guid CaseId { get; set; }
    public string CaseDisplayId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string Notes { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public string AttachmentsJson { get; set; } = "[]";
    public bool ReminderSent { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<Guid> AssignedLawyerIds { get; set; } = new();
    public List<string> AssignedLawyerNames { get; set; } = new();
}

public class CreateTaskDto
{
    public Guid CaseId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public List<Guid> AssignedLawyerIds { get; set; } = new();
    public string Notes { get; set; } = string.Empty;
    public string AttachmentsJson { get; set; } = "[]";
}

public class UpdateTaskDto
{
    public string Name { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public List<Guid> AssignedLawyerIds { get; set; } = new();
    public string Notes { get; set; } = string.Empty;
    public string AttachmentsJson { get; set; } = "[]";
}

public class SetTaskStatusDto
{
    public string Status { get; set; } = string.Empty;
}
