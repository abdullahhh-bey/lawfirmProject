using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using lawfirm.backend.DTOs.Auth;
using lawfirm.backend.Services;

namespace lawfirm.backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;
    private readonly IHostEnvironment _env;

    public AuthController(IAuthService authService, ILogger<AuthController> logger, IHostEnvironment env)
    {
        _authService = authService;
        _logger = logger;
        _env = env;
    }

    // LOGIN ENDPOINT (ROLE BASED ACCESS + LAYER 4 SECURE HTTPONLY COOKIE)
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.LoginAsync(request);
        if (result == null)
            return Unauthorized(new { message = "Invalid email or password." });

        // Layer 4: Issue JWT inside HttpOnly, Secure, SameSite=Strict cookie
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = !_env.IsDevelopment(), // Requires HTTPS in production
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddHours(12)
        };

        Response.Cookies.Append("jwt", result.Token, cookieOptions);

        _logger.LogInformation("User {Email} logged in successfully with role {Role}. Secure HttpOnly cookie issued.", result.Session.Email, result.Session.Role);
        return Ok(result);
    }

    // LOGOUT ENDPOINT (Clears HttpOnly Secure Cookie)
    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("jwt");
        return Ok(new { message = "Logged out successfully and cookie cleared." });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { message = "Invalid token claims." });

        var profile = await _authService.GetCurrentUserAsync(userId);
        if (profile == null)
            return NotFound(new { message = "User not found or inactive." });

        return Ok(profile);
    }

    // TEST ENDPOINT FOR ADMIN
    [HttpGet("admin-only-test")]
    [Authorize(Roles = "admin")]
    public IActionResult AdminOnlyTest()
    {
        return Ok(new { message = "Access granted. You are authenticated as an Admin." });
    }

    // TEST ENDPOINT FOR LAWYER
    [HttpGet("lawyer-only-test")]
    [Authorize(Roles = "lawyer")]
    public IActionResult LawyerOnlyTest()
    {
        return Ok(new { message = "Access granted. You are authenticated as a Lawyer." });
    }
}
