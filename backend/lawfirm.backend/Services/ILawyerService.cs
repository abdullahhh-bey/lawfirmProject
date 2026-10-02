using lawfirm.backend.DTOs.Lawyers;

namespace lawfirm.backend.Services;

public interface ILawyerService
{
    Task<List<LawyerDto>> GetLawyersAsync(int page = 1, int pageSize = 50);
    Task<LawyerDto?> GetLawyerByIdAsync(Guid id);
    Task<LawyerDto> CreateLawyerAsync(CreateLawyerDto dto);
    Task<LawyerDto> UpdateLawyerAsync(Guid id, UpdateLawyerDto dto);
    Task<LawyerDto> ToggleActiveAsync(Guid id);
    Task DeleteLawyerAsync(Guid id);
}
