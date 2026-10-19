using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using lawfirm.backend.DTOs.Tasks;
using lawfirm.backend.Services;

namespace lawfirm.backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;
    private readonly IStorageService _storageService;
    private readonly TaskWhatsAppNotificationService _taskNotificationService;
    private readonly ILogger<TasksController> _logger;

    public TasksController(
        ITaskService taskService,
        IStorageService storageService,
        TaskWhatsAppNotificationService taskNotificationService,
        ILogger<TasksController> logger)
    {
        _taskService = taskService;
        _storageService = storageService;
        _taskNotificationService = taskNotificationService;
        _logger = logger;
    }

    private Guid CurrentUserId
    {
        get
        {
            var claimStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? User.FindFirstValue("sub")
                        ?? User.FindFirstValue("id");
            return Guid.TryParse(claimStr, out var id) ? id : Guid.Empty;
        }
    }
    private string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? "lawyer";

    [HttpGet]
    public async Task<ActionResult<List<TaskDto>>> GetTasks([FromQuery] Guid? caseId)
    {
        var tasks = await _taskService.GetTasksAsync(caseId, CurrentUserId, CurrentUserRole);
        return Ok(tasks);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TaskDto>> GetTaskById(Guid id)
    {
        try
        {
            var task = await _taskService.GetTaskByIdAsync(id, CurrentUserId, CurrentUserRole);
            if (task == null) return NotFound(new { message = "Task not found." });
            return Ok(task);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask([FromBody] CreateTaskDto dto)
    {
        try
        {
            var task = await _taskService.CreateTaskAsync(dto, CurrentUserId, CurrentUserRole);
            try
            {
                await _taskNotificationService.SendTaskCreatedNotificationsAsync(task.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Task {TaskId} was created, but WhatsApp notification processing failed.", task.Id);
            }
            return CreatedAtAction(nameof(GetTaskById), new { id = task.Id }, task);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Case not found." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TaskDto>> UpdateTask(Guid id, [FromBody] UpdateTaskDto dto)
    {
        try
        {
            var updated = await _taskService.UpdateTaskAsync(id, dto, CurrentUserId, CurrentUserRole);
            return Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Task not found." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/status")]
    public async Task<ActionResult<TaskDto>> SetStatus(Guid id, [FromBody] SetTaskStatusDto dto)
    {
        try
        {
            var updated = await _taskService.SetTaskStatusAsync(id, dto.Status, CurrentUserId, CurrentUserRole);
            return Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Task not found." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/attachments/upload")]
    [RequestSizeLimit(52428800)]
    [RequestFormLimits(MultipartBodyLengthLimit = 52428800)]
    public async Task<IActionResult> UploadAttachment(Guid id, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file selected." });

        TaskDto? task;
        try
        {
            task = await _taskService.GetTaskByIdAsync(id, CurrentUserId, CurrentUserRole, requireWritable: true);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        if (task == null) return NotFound(new { message = "Task not found." });

        var fileId = Guid.NewGuid().ToString("N");
        var storagePath = $"tasks/{id}/{fileId}_{Path.GetFileName(file.FileName)}";

        using var stream = file.OpenReadStream();
        await _storageService.UploadFileAsync(storagePath, stream, file.ContentType);

        var attachments = ParseAttachmentsJson(task.AttachmentsJson);
        var attachmentNode = new Dictionary<string, object>
        {
            ["id"] = fileId,
            ["name"] = file.FileName,
            ["mimeType"] = file.ContentType,
            ["size"] = file.Length,
            ["storagePath"] = storagePath,
            ["createdAt"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
        };

        attachments.Add(attachmentNode);
        await _taskService.SetTaskAttachmentsAsync(id, JsonSerializer.Serialize(attachments), CurrentUserId, CurrentUserRole);

        return Ok(attachmentNode);
    }

    [HttpGet("{id:guid}/attachments/{fileId}/download")]
    public async Task<IActionResult> DownloadAttachment(Guid id, string fileId, [FromQuery] bool redirect = false)
    {
        var task = await _taskService.GetTaskByIdAsync(id, CurrentUserId, CurrentUserRole);
        if (task == null) return NotFound(new { message = "Task not found." });

        var attachments = ParseAttachmentsJson(task.AttachmentsJson);
        var attachmentNode = attachments.FirstOrDefault(d => d.GetValueOrDefault("id")?.ToString() == fileId);
        if (attachmentNode == null) return NotFound(new { message = "Attachment not found." });

        var storagePath = attachmentNode.GetValueOrDefault("storagePath")?.ToString();
        var fileName = attachmentNode.GetValueOrDefault("name")?.ToString() ?? "attachment";
        var mimeType = attachmentNode.GetValueOrDefault("mimeType")?.ToString() ?? "application/octet-stream";

        if (string.IsNullOrEmpty(storagePath))
            return BadRequest(new { message = "Attachment storage path is missing." });

        if (redirect)
        {
            var signedUrl = await _storageService.GetSignedUrlAsync(storagePath, 900);
            return Redirect(signedUrl);
        }

        var stream = await _storageService.DownloadFileAsync(storagePath);
        return File(stream, mimeType, fileName);
    }

    [HttpDelete("{id:guid}/attachments/{fileId}")]
    public async Task<IActionResult> DeleteAttachment(Guid id, string fileId)
    {
        TaskDto? task;
        try
        {
            task = await _taskService.GetTaskByIdAsync(id, CurrentUserId, CurrentUserRole, requireWritable: true);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        if (task == null) return NotFound(new { message = "Task not found." });

        var attachments = ParseAttachmentsJson(task.AttachmentsJson);
        var attachmentNode = attachments.FirstOrDefault(d => d.GetValueOrDefault("id")?.ToString() == fileId);
        if (attachmentNode == null) return NotFound(new { message = "Attachment not found." });

        var storagePath = attachmentNode.GetValueOrDefault("storagePath")?.ToString();
        if (!string.IsNullOrEmpty(storagePath))
        {
            await _storageService.DeleteFileAsync(storagePath);
        }

        attachments.Remove(attachmentNode);
        await _taskService.SetTaskAttachmentsAsync(id, JsonSerializer.Serialize(attachments), CurrentUserId, CurrentUserRole);

        return NoContent();
    }

    private static List<Dictionary<string, object>> ParseAttachmentsJson(string json)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(json)) return new();
            return JsonSerializer.Deserialize<List<Dictionary<string, object>>>(json) ?? new();
        }
        catch
        {
            return new();
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTask(Guid id)
    {
        await _taskService.DeleteTaskAsync(id);
        return NoContent();
    }
}
