using lawfirm.backend.DTOs.Tasks;

namespace lawfirm.backend.Services;

public interface ITaskService
{
    Task<List<TaskDto>> GetTasksAsync(Guid? caseId, Guid currentUserId, string role, int page = 1, int pageSize = 50);
    Task<TaskDto?> GetTaskByIdAsync(Guid taskId, Guid currentUserId, string role);
    Task<TaskDto> CreateTaskAsync(CreateTaskDto dto);
    Task<TaskDto> UpdateTaskAsync(Guid taskId, UpdateTaskDto dto, Guid currentUserId, string role);
    Task<TaskDto> SetTaskStatusAsync(Guid taskId, string status, Guid currentUserId, string role);
    Task<TaskDto> SetTaskAttachmentsAsync(Guid taskId, string attachmentsJson, Guid currentUserId, string role);
    Task DeleteTaskAsync(Guid taskId);
}
