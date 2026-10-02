using Microsoft.EntityFrameworkCore;
using lawfirm.backend.Data;
using lawfirm.backend.DTOs.Finance;
using lawfirm.backend.Models;

namespace lawfirm.backend.Services;

public class FinanceService : IFinanceService
{
    private readonly AppDbContext _context;

    public FinanceService(AppDbContext context)
    {
        _context = context;
    }

    private static DateTime EnsureUtc(DateTime dt)
    {
        if (dt == default) return DateTime.UtcNow;
        if (dt.Kind == DateTimeKind.Utc) return dt;
        return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
    }

    public async Task<List<FinanceEntryDto>> GetClientLedgerAsync(Guid clientId)
    {
        var rows = await _context.FinanceEntries
            .AsNoTracking()
            .Include(f => f.Client)
            .Include(f => f.Case)
            .Where(f => f.ClientId == clientId)
            .ToListAsync();

        var blocks = rows
            .GroupBy(r => new { CaseId = r.CaseId ?? Guid.Empty, Account = r.Account ?? "office" })
            .ToList();

        var result = new List<FinanceEntryDto>();

        foreach (var block in blocks)
        {
            var sorted = block.OrderBy(r => r.Date).ThenBy(r => r.CreatedAt).ToList();
            decimal runningBalance = 0;

            foreach (var r in sorted)
            {
                runningBalance += (r.Type == "OUT" ? -r.Amount : r.Amount);

                result.Add(new FinanceEntryDto
                {
                    Id = r.Id,
                    ClientId = r.ClientId,
                    ClientName = r.Client?.Name ?? "",
                    CaseId = r.CaseId,
                    CaseDisplayId = r.Case?.CaseId ?? "",
                    Account = r.Account,
                    Date = r.Date,
                    Reference = r.Reference,
                    Particulars = r.Particulars,
                    Description = r.Description,
                    Type = r.Type,
                    Amount = r.Amount,
                    Balance = runningBalance,
                    CreatedAt = r.CreatedAt
                });
            }
        }

        return result.OrderBy(r => r.Date).ThenBy(r => r.CreatedAt).ToList();
    }

    public async Task<List<ClientFinanceSummaryDto>> GetFinanceSummariesAsync()
    {
        var clients = await _context.Clients
            .AsNoTracking()
            .AsSplitQuery()
            .Include(c => c.Cases)
            .Include(c => c.FinanceEntries)
            .ToListAsync();

        var summaries = new List<ClientFinanceSummaryDto>();

        foreach (var c in clients)
        {
            var officeRows = c.FinanceEntries.Where(f => f.Account == "office").ToList();
            var clientRows = c.FinanceEntries.Where(f => f.Account == "client").ToList();

            decimal officeIn = officeRows.Where(f => f.Type == "IN").Sum(f => f.Amount);
            decimal officeOut = officeRows.Where(f => f.Type == "OUT").Sum(f => f.Amount);
            decimal officeBalance = officeIn - officeOut;

            decimal clientIn = clientRows.Where(f => f.Type == "IN").Sum(f => f.Amount);
            decimal clientOut = clientRows.Where(f => f.Type == "OUT").Sum(f => f.Amount);
            decimal clientBalance = clientIn - clientOut;

            decimal agreed = c.Cases.Sum(cs => cs.FeeAgreed);
            decimal outstanding = Math.Max(agreed - officeBalance, 0);

            var lastActivity = c.FinanceEntries.Select(f => (DateTime?)f.Date).Max();

            summaries.Add(new ClientFinanceSummaryDto
            {
                ClientId = c.Id,
                ClientName = c.Name,
                ClientPhone = c.Phone,
                Client = new ClientSummaryInfo
                {
                    Id = c.Id,
                    Name = c.Name,
                    Phone = c.Phone,
                    Email = c.Email
                },
                CaseCount = c.Cases.Count,
                Agreed = agreed,
                Received = officeIn,
                Refunded = officeOut,
                OfficeBalance = officeBalance,
                ClientBalance = clientBalance,
                Outstanding = outstanding,
                LastActivity = lastActivity
            });
        }

        return summaries.OrderBy(s => s.ClientName).ToList();
    }

    public async Task<FinanceEntryDto> CreateEntryAsync(CreateFinanceEntryDto dto)
    {
        if (dto.Amount <= 0) throw new ArgumentException("Amount must be greater than zero.");

        var entry = new FinanceEntry
        {
            Id = Guid.NewGuid(),
            ClientId = dto.ClientId,
            CaseId = dto.CaseId,
            Account = dto.Account == "client" ? "client" : "office",
            Date = EnsureUtc(dto.Date),
            Reference = dto.Reference ?? "",
            Particulars = dto.Particulars ?? "",
            Description = dto.Description ?? "",
            Type = dto.Type == "OUT" ? "OUT" : "IN",
            Amount = dto.Amount,
            CreatedAt = DateTime.UtcNow
        };

        _context.FinanceEntries.Add(entry);
        await _context.SaveChangesAsync();

        var ledger = await GetClientLedgerAsync(dto.ClientId);
        return ledger.First(e => e.Id == entry.Id);
    }

    public async Task DeleteEntryAsync(Guid id)
    {
        var entry = await _context.FinanceEntries.FindAsync(id);
        if (entry != null)
        {
            _context.FinanceEntries.Remove(entry);
            await _context.SaveChangesAsync();
        }
    }
}
