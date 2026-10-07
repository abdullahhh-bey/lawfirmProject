using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using lawfirm.backend.DTOs.Cases;
using lawfirm.backend.Services;

namespace lawfirm.backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CasesController : ControllerBase
{
    private readonly ICaseService _caseService;

    public CasesController(ICaseService caseService)
    {
        _caseService = caseService;
    }

    private Guid CurrentUserId
    {
        get
        {
            var claimStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? User.FindFirstValue("sub")
                        ?? User.FindFirstValue("id");
            return Guid.TryParse(claimStr, out var id) ? id : Guid.Empty;
        }
    }

    private string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? "lawyer";

    [HttpGet]
    public async Task<ActionResult<List<CaseDto>>> GetCases()
    {
        var cases = await _caseService.GetCasesAsync(CurrentUserId, CurrentUserRole);
        return Ok(cases);
    }

    [HttpGet("client/{clientId:guid}")]
    public async Task<ActionResult<List<CaseDto>>> GetCasesByClient(Guid clientId)
    {
        try
        {
            var cases = await _caseService.GetCasesByClientAsync(clientId, CurrentUserId, CurrentUserRole);
            return Ok(cases);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CaseDto>> GetCaseById(Guid id)
    {
        try
        {
            var caseRecord = await _caseService.GetCaseByIdAsync(id, CurrentUserId, CurrentUserRole);
            if (caseRecord == null) return NotFound(new { message = "Case not found." });
            return Ok(caseRecord);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Error loading case details: {ex.Message}" });
        }
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<CaseDto>> CreateCase([FromBody] CreateCaseDto dto)
    {
        var created = await _caseService.CreateCaseAsync(dto, CurrentUserId);
        return CreatedAtAction(nameof(GetCaseById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CaseDto>> UpdateCase(Guid id, [FromBody] UpdateCaseDto dto)
    {
        try
        {
            var updated = await _caseService.UpdateCaseAsync(id, dto, CurrentUserId, CurrentUserRole);
            return Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Case not found." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/assign-lawyers")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<CaseDto>> AssignLawyers(Guid id, [FromBody] AssignLawyersDto dto)
    {
        try
        {
            var updated = await _caseService.AssignLawyersAsync(id, dto.LawyerIds);
            return Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Case not found." });
        }
    }

    [HttpPut("{id:guid}/status")]
    public async Task<ActionResult<CaseDto>> SetStatus(Guid id, [FromBody] SetCaseStatusDto dto)
    {
        try
        {
            var updated = await _caseService.SetCaseStatusAsync(id, dto.Status, CurrentUserId, CurrentUserRole);
            return Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Case not found." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/documents")]
    public async Task<ActionResult<CaseDto>> SetDocuments(Guid id, [FromBody] SetCaseDocumentsDto dto)
    {
        try
        {
            var updated = await _caseService.SetCaseDocumentsAsync(id, dto.DocumentsJson, CurrentUserId, CurrentUserRole);
            return Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Case not found." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> DeleteCase(Guid id)
    {
        await _caseService.DeleteCaseAsync(id);
        return NoContent();
    }
}
