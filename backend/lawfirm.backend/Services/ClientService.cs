using Microsoft.EntityFrameworkCore;
using lawfirm.backend.Data;
using lawfirm.backend.DTOs.Clients;
using lawfirm.backend.Models;

namespace lawfirm.backend.Services;

public class ClientService : IClientService
{
    private readonly AppDbContext _context;

    public ClientService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ClientDto>> GetClientsAsync(int page = 1, int pageSize = 50)
    {
        var clients = await _context.Clients
            .AsNoTracking()
            .Include(c => c.Cases)
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return clients.Select(c => new ClientDto
        {
            Id = c.Id,
            Name = c.Name,
            Phone = c.Phone,
            Email = c.Email,
            Address = c.Address,
            Notes = c.Notes,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt,
            ActiveCaseCount = c.Cases.Count(cs => cs.Status != "Completed")
        }).ToList();
    }

    public async Task<ClientDto?> GetClientByIdAsync(Guid id)
    {
        var c = await _context.Clients
            .AsNoTracking()
            .Include(c => c.Cases)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (c == null) return null;

        return new ClientDto
        {
            Id = c.Id,
            Name = c.Name,
            Phone = c.Phone,
            Email = c.Email,
            Address = c.Address,
            Notes = c.Notes,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt,
            ActiveCaseCount = c.Cases.Count(cs => cs.Status != "Completed")
        };
    }

    public async Task<ClientDto> CreateClientAsync(CreateClientDto dto)
    {
        var client = new Client
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Phone = dto.Phone ?? "",
            Email = dto.Email ?? "",
            Address = dto.Address ?? "",
            Notes = dto.Notes ?? "",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Clients.Add(client);
        await _context.SaveChangesAsync();

        return (await GetClientByIdAsync(client.Id))!;
    }

    public async Task<ClientDto> UpdateClientAsync(Guid id, UpdateClientDto dto)
    {
        var client = await _context.Clients.FindAsync(id);
        if (client == null) throw new KeyNotFoundException("Client not found.");

        client.Name = dto.Name;
        client.Phone = dto.Phone ?? "";
        client.Email = dto.Email ?? "";
        client.Address = dto.Address ?? "";
        client.Notes = dto.Notes ?? "";
        client.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return (await GetClientByIdAsync(client.Id))!;
    }

    public async Task DeleteClientAsync(Guid id)
    {
        var client = await _context.Clients.FindAsync(id);
        if (client != null)
        {
            _context.Clients.Remove(client);
            await _context.SaveChangesAsync();
        }
    }
}
