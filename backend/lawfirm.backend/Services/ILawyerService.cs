using lawfirm.backend.DTOs.Lawyers;

namespace lawfirm.backend.Services;

public interface ILawyerService
{
    Task<List<LawyerDto>> GetLawyersAsync();
    Task<LawyerDto?> GetLawyerByIdAsync(Guid id);
    Task<LawyerDto> CreateLawyerAsync(CreateLawyerDto dto);
    Task<LawyerDto> UpdateLawyerAsync(Guid id, UpdateLawyerDto dto);
    Task<LawyerDto> ToggleActiveAsync(Guid id);
    Task DeleteLawyerAsync(Guid id);
}
