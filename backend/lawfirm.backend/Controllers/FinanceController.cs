using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using lawfirm.backend.DTOs.Finance;
using lawfirm.backend.Services;

namespace lawfirm.backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin")]
public class FinanceController : ControllerBase
{
    private readonly IFinanceService _financeService;

    public FinanceController(IFinanceService financeService)
    {
        _financeService = financeService;
    }

    [HttpGet("summaries")]
    public async Task<ActionResult<List<ClientFinanceSummaryDto>>> GetSummaries()
    {
        var summaries = await _financeService.GetFinanceSummariesAsync();
        return Ok(summaries);
    }

    [HttpGet("client/{clientId:guid}")]
    public async Task<ActionResult<List<FinanceEntryDto>>> GetClientLedger(Guid clientId)
    {
        var ledger = await _financeService.GetClientLedgerAsync(clientId);
        return Ok(ledger);
    }

    [HttpPost]
    public async Task<ActionResult<FinanceEntryDto>> CreateEntry([FromBody] CreateFinanceEntryDto dto)
    {
        try
        {
            var entry = await _financeService.CreateEntryAsync(dto);
            return Ok(entry);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteEntry(Guid id)
    {
        await _financeService.DeleteEntryAsync(id);
        return NoContent();
    }
}
