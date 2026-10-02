using lawfirm.backend.DTOs.Auth;
using lawfirm.backend.Models;

namespace lawfirm.backend.Services;

public interface IAuthService
{
    Task<AuthResponseDto?> LoginAsync(LoginRequestDto request);
    Task<UserSessionDto?> GetCurrentUserAsync(Guid userId);
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}
