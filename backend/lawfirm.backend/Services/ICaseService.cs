using lawfirm.backend.DTOs.Cases;

namespace lawfirm.backend.Services;

public interface ICaseService
{
    Task<List<CaseDto>> GetCasesAsync(Guid currentUserId, string role, int page = 1, int pageSize = 50);
    Task<CaseDto?> GetCaseByIdAsync(Guid caseId, Guid currentUserId, string role);
    Task<CaseDto> CreateCaseAsync(CreateCaseDto dto, Guid currentUserId);
    Task<CaseDto> UpdateCaseAsync(Guid caseId, UpdateCaseDto dto, Guid currentUserId, string role);
    Task<CaseDto> AssignLawyersAsync(Guid caseId, List<Guid> lawyerIds);
    Task<CaseDto> SetCaseStatusAsync(Guid caseId, string status, Guid currentUserId, string role);
    Task<CaseDto> SetCaseDocumentsAsync(Guid caseId, string documentsJson, Guid currentUserId, string role);
    Task DeleteCaseAsync(Guid caseId);
}
