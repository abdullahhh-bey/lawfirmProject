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
    private readonly IHostEnvironment _environment;

    public WhatsAppController(
        IWhatsAppService whatsAppService,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        _whatsAppService = whatsAppService;
        _configuration = configuration;
        _environment = environment;
    }

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var section = _environment.IsDevelopment() ? "Development:GreenApi" : "GreenApi";
        var idInstance = (_configuration[$"{section}:IdInstance"] ?? "").Trim();
        var tokenInstance = (_configuration[$"{section}:ApiTokenInstance"] ?? "").Trim();

        var isConfigured = !string.IsNullOrEmpty(idInstance) && !string.IsNullOrEmpty(tokenInstance);

        return Ok(new
        {
            isConfigured,
            message = isConfigured ? "Green API configured." : "Green API not configured yet."
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

        var (success, resultMsg) = await _whatsAppService.SendTextMessageAsync(request.PhoneNumber, request.Message);
        if (success)
        {
            return Ok(new { success = true, message = resultMsg });
        }

        return BadRequest(new { success = false, message = resultMsg });
    }

    [HttpPost("send-file")]
    public async Task<IActionResult> SendFile([FromForm] IFormFile file, [FromForm] string phoneNumber, [FromForm] string? caption)
    {
        if (file == null || file.Length == 0 || string.IsNullOrWhiteSpace(phoneNumber))
        {
            return BadRequest(new { message = "File and PhoneNumber are required." });
        }

        using var stream = file.OpenReadStream();
        var (success, resultMsg) = await _whatsAppService.SendFileAsync(phoneNumber, stream, file.FileName, caption ?? "");

        if (success)
        {
            return Ok(new { success = true, message = resultMsg });
        }

        return BadRequest(new { success = false, message = resultMsg });
    }
}
