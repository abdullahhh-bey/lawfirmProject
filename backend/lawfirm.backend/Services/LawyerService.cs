using Microsoft.EntityFrameworkCore;
using lawfirm.backend.Data;
using lawfirm.backend.DTOs.Lawyers;
using lawfirm.backend.Models;

namespace lawfirm.backend.Services;

public class LawyerService : ILawyerService
{
    private readonly AppDbContext _context;
    private readonly IAuthService _authService;

    public LawyerService(AppDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    public async Task<List<LawyerDto>> GetLawyersAsync(int page = 1, int pageSize = 50)
    {
        var lawyers = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role == "lawyer")
            .OrderBy(u => u.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return lawyers.Select(MapToDto).ToList();
    }

    public async Task<LawyerDto?> GetLawyerByIdAsync(Guid id)
    {
        var lawyer = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id && u.Role == "lawyer");
        return lawyer == null ? null : MapToDto(lawyer);
    }

    public async Task<LawyerDto> CreateLawyerAsync(CreateLawyerDto dto)
    {
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower()))
        {
            throw new ArgumentException("A user with this email address already exists.");
        }

        var lawyer = new User
        {
            Id = Guid.NewGuid(),
            FullName = dto.Name,
            Email = dto.Email.Trim().ToLower(),
            PasswordHash = _authService.HashPassword(dto.Password ?? "password"),
            Phone = dto.Phone ?? "",
            Role = "lawyer",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(lawyer);
        await _context.SaveChangesAsync();

        return MapToDto(lawyer);
    }

    public async Task<LawyerDto> UpdateLawyerAsync(Guid id, UpdateLawyerDto dto)
    {
        var lawyer = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == "lawyer");
        if (lawyer == null) throw new KeyNotFoundException("Lawyer not found.");

        lawyer.FullName = dto.Name;
        lawyer.Email = dto.Email.Trim().ToLower();
        lawyer.Phone = dto.Phone ?? "";
        if (!string.IsNullOrEmpty(dto.Password))
        {
            lawyer.PasswordHash = _authService.HashPassword(dto.Password);
        }
        lawyer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToDto(lawyer);
    }

    public async Task<LawyerDto> ToggleActiveAsync(Guid id)
    {
        var lawyer = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == "lawyer");
        if (lawyer == null) throw new KeyNotFoundException("Lawyer not found.");

        lawyer.IsActive = !lawyer.IsActive;
        lawyer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToDto(lawyer);
    }

    public async Task DeleteLawyerAsync(Guid id)
    {
        var lawyer = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == "lawyer");
        if (lawyer != null)
        {
            _context.Users.Remove(lawyer);
            await _context.SaveChangesAsync();
        }
    }

    private static LawyerDto MapToDto(User u)
    {
        return new LawyerDto
        {
            Id = u.Id,
            Name = u.FullName,
            Email = u.Email,
            Phone = u.Phone,
            Role = u.Role,
            Active = u.IsActive,
            CreatedAt = u.CreatedAt
        };
    }
}
