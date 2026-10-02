using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using lawfirm.backend.Services;

namespace lawfirm.backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WhatsAppController : ControllerBase
{
    private readonly IWhatsAppService _whatsAppService;
    private readonly IConfiguration _configuration;

    public WhatsAppController(IWhatsAppService whatsAppService, IConfiguration configuration)
    {
        _whatsAppService = whatsAppService;
        _configuration = configuration;
    }

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var idInstance = (_configuration["GreenApi:IdInstance"] ?? "").Trim();
        var tokenInstance = (_configuration["GreenApi:ApiTokenInstance"] ?? "").Trim();

        var isConfigured = !string.IsNullOrEmpty(idInstance) && !string.IsNullOrEmpty(tokenInstance);

        return Ok(new
        {
            isConfigured,
            idInstance = isConfigured ? idInstance : null,
            message = isConfigured ? "Green API configured." : "Green API not configured yet. Add IdInstance and ApiTokenInstance in appsettings.json."
        });
    }

    public class SendTextMessageRequest
    {
        public string PhoneNumber { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }

    [HttpPost("send-message")]
    public async Task<IActionResult> SendTextMessage([FromBody] SendTextMessageRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PhoneNumber) || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { message = "PhoneNumber and Message are required." });
        }

        var success = await _whatsAppService.SendTextMessageAsync(request.PhoneNumber, request.Message);
        if (success)
        {
            return Ok(new { success = true, message = "WhatsApp message sent successfully." });
        }

        return StatusCode(500, new { success = false, message = "Failed to send WhatsApp message. Check server logs or Green API settings." });
    }

    [HttpPost("send-file")]
    public async Task<IActionResult> SendFile([FromForm] IFormFile file, [FromForm] string phoneNumber, [FromForm] string? caption)
    {
        if (file == null || file.Length == 0 || string.IsNullOrWhiteSpace(phoneNumber))
        {
            return BadRequest(new { message = "File and PhoneNumber are required." });
        }

        using var stream = file.OpenReadStream();
        var success = await _whatsAppService.SendFileAsync(phoneNumber, stream, file.FileName, caption ?? "");

        if (success)
        {
            return Ok(new { success = true, message = "WhatsApp file sent successfully." });
        }

        return StatusCode(500, new { success = false, message = "Failed to send WhatsApp file. Check server logs or Green API settings." });
    }
}
