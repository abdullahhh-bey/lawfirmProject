using lawfirm.backend.DTOs.Clients;

namespace lawfirm.backend.Services;

public interface IClientService
{
    Task<List<ClientDto>> GetClientsAsync(int page = 1, int pageSize = 50);
    Task<ClientDto?> GetClientByIdAsync(Guid id);
    Task<ClientDto> CreateClientAsync(CreateClientDto dto);
    Task<ClientDto> UpdateClientAsync(Guid id, UpdateClientDto dto);
    Task DeleteClientAsync(Guid id);
}
