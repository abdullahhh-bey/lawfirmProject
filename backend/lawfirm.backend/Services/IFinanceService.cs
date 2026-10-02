using lawfirm.backend.DTOs.Finance;

namespace lawfirm.backend.Services;

public interface IFinanceService
{
    Task<List<FinanceEntryDto>> GetClientLedgerAsync(Guid clientId);
    Task<List<ClientFinanceSummaryDto>> GetFinanceSummariesAsync();
    Task<FinanceEntryDto> CreateEntryAsync(CreateFinanceEntryDto dto);
    Task DeleteEntryAsync(Guid id);
}
