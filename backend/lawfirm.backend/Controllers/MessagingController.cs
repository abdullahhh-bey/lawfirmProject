using System.Security.Claims;
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

    public MessagingController(IMessagingService messagingService)
    {
        _messagingService = messagingService;
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
}
