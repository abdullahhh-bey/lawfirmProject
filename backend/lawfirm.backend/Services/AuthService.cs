using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using lawfirm.backend.Data;
using lawfirm.backend.DTOs.Auth;
using lawfirm.backend.Models;

namespace lawfirm.backend.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginRequestDto request)
    {
        var normalizedEmail = request.Email.Trim().ToLower();
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail && u.IsActive);

        if (user == null)
            return null;

        if (!VerifyPassword(request.Password, user.PasswordHash))
            return null;

        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtKey = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
        var key = Encoding.UTF8.GetBytes(jwtKey);
        var issuer = _configuration["Jwt:Issuer"] ?? "LawFirmCrm";
        var audience = _configuration["Jwt:Audience"] ?? "LawFirmCrmClient";
        var expiryMinutes = int.TryParse(_configuration["Jwt:ExpiryMinutes"], out var minutes) ? minutes : 720; // 12 hours default

        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToLower()), // "admin" or "lawyer"
            }),
            Expires = expiresAt,
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var jwtString = tokenHandler.WriteToken(token);

        return new AuthResponseDto
        {
            Token = jwtString,
            ExpiresAt = expiresAt,
            Session = new UserSessionDto
            {
                Id = user.Id.ToString(),
                Name = user.FullName,
                Email = user.Email,
                Role = user.Role.ToLower(),
                Phone = user.Phone
            }
        };
    }

    public async Task<UserSessionDto?> GetCurrentUserAsync(Guid userId)
    {
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null || !user.IsActive)
            return null;

        return new UserSessionDto
        {
            Id = user.Id.ToString(),
            Name = user.FullName,
            Email = user.Email,
            Role = user.Role.ToLower(),
            Phone = user.Phone
        };
    }

    public async Task<(bool Success, string Message)> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null || !user.IsActive)
            return (false, "User account not found or inactive.");

        if (!VerifyPassword(currentPassword, user.PasswordHash))
            return (false, "Current password is incorrect.");

        user.PasswordHash = HashPassword(newPassword);
        await _context.SaveChangesAsync();
        return (true, "Password changed successfully.");
    }

    public string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        return BCrypt.Net.BCrypt.Verify(password, passwordHash);
    }
}
