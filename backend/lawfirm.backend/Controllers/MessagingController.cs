using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using lawfirm.backend.DTOs.Messaging;
using lawfirm.backend.Services;

namespace lawfirm.backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagingController : ControllerBase
{
    private readonly IMessagingService _messagingService;
    private readonly IStorageService _storageService;

    public MessagingController(IMessagingService messagingService, IStorageService storageService)
    {
        _messagingService = messagingService;
        _storageService = storageService;
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
    public async Task<ActionResult<List<MessageDto>>> GetMessages()
    {
        var messages = await _messagingService.GetMessagesAsync(CurrentUserId, CurrentUserRole);
        return Ok(messages);
    }

    [HttpPost]
    public async Task<ActionResult<MessageDto>> SendMessage([FromBody] SendMessageDto dto)
    {
        try
        {
            var message = await _messagingService.SendMessageAsync(dto, CurrentUserId);
            return Ok(message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("attachments/upload")]
    [RequestSizeLimit(52428800)]
    [RequestFormLimits(MultipartBodyLengthLimit = 52428800)]
    public async Task<IActionResult> UploadAttachment([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file selected." });

        var fileId = Guid.NewGuid().ToString("N");
        var storagePath = $"messages/{fileId}_{Path.GetFileName(file.FileName)}";

        using var stream = file.OpenReadStream();
        await _storageService.UploadFileAsync(storagePath, stream, file.ContentType);

        var attachment = new Dictionary<string, object>
        {
            ["id"] = fileId,
            ["name"] = file.FileName,
            ["mimeType"] = file.ContentType,
            ["size"] = file.Length,
            ["storagePath"] = storagePath,
            ["createdAt"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
        };

        return Ok(attachment);
    }

    [HttpGet("attachments/download")]
    public async Task<IActionResult> DownloadAttachment([FromQuery] string storagePath, [FromQuery] bool redirect = false)
    {
        if (string.IsNullOrWhiteSpace(storagePath))
            return BadRequest(new { message = "Attachment storage path is required." });

        var messages = await _messagingService.GetMessagesAsync(CurrentUserId, CurrentUserRole);
        var found = messages.Any(m => ParseAttachmentsJson(m.AttachmentsJson).Any(a => a.GetValueOrDefault("storagePath")?.ToString() == storagePath));
        if (!found)
            return NotFound(new { message = "Attachment not found." });

        if (redirect)
        {
            var signedUrl = await _storageService.GetSignedUrlAsync(storagePath, 900);
            return Redirect(signedUrl);
        }

        var stream = await _storageService.DownloadFileAsync(storagePath);
        var fileName = Path.GetFileName(storagePath);
        return File(stream, "application/octet-stream", fileName);
    }

    [HttpDelete("attachments")]
    public async Task<IActionResult> DeleteAttachment([FromQuery] string storagePath)
    {
        if (string.IsNullOrWhiteSpace(storagePath))
            return BadRequest(new { message = "Attachment storage path is required." });

        var messages = await _messagingService.GetMessagesAsync(CurrentUserId, CurrentUserRole);
        foreach (var message in messages)
        {
            var attachments = ParseAttachmentsJson(message.AttachmentsJson);
            var match = attachments.FirstOrDefault(a => a.GetValueOrDefault("storagePath")?.ToString() == storagePath);
            if (match != null)
            {
                attachments.Remove(match);
                await _messagingService.SetMessageAttachmentsAsync(message.Id, JsonSerializer.Serialize(attachments), CurrentUserId, CurrentUserRole);
                await _storageService.DeleteFileAsync(storagePath);
                return NoContent();
            }
        }

        return NotFound(new { message = "Attachment not found." });
    }

    [HttpPut("{messageId:guid}/seen")]
    public async Task<IActionResult> MarkSeen(Guid messageId)
    {
        await _messagingService.MarkMessageSeenAsync(messageId, CurrentUserId);
        return Ok(new { success = true });
    }

    [HttpGet("notifications")]
    public async Task<ActionResult<List<NotificationDto>>> GetNotifications()
    {
        var notifs = await _messagingService.GetNotificationsAsync(CurrentUserId, CurrentUserRole);
        return Ok(notifs);
    }

    [HttpGet("recipients")]
    public async Task<ActionResult<List<RecipientDto>>> GetRecipients()
    {
        var recipients = await _messagingService.GetRecipientsAsync(CurrentUserId, CurrentUserRole);
        return Ok(recipients);
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
}
