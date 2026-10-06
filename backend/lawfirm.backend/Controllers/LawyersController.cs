using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using lawfirm.backend.DTOs.Lawyers;
using lawfirm.backend.Services;

namespace lawfirm.backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LawyersController : ControllerBase
{
    private readonly ILawyerService _lawyerService;

    public LawyersController(ILawyerService lawyerService)
    {
        _lawyerService = lawyerService;
    }

    [HttpGet]
    public async Task<ActionResult<List<LawyerDto>>> GetLawyers()
    {
        var lawyers = await _lawyerService.GetLawyersAsync();
        return Ok(lawyers);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LawyerDto>> GetLawyerById(Guid id)
    {
        var lawyer = await _lawyerService.GetLawyerByIdAsync(id);
        if (lawyer == null) return NotFound(new { message = "Advocate not found." });
        return Ok(lawyer);
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<LawyerDto>> CreateLawyer([FromBody] CreateLawyerDto dto)
    {
        try
        {
            var created = await _lawyerService.CreateLawyerAsync(dto);
            return CreatedAtAction(nameof(GetLawyerById), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<LawyerDto>> UpdateLawyer(Guid id, [FromBody] UpdateLawyerDto dto)
    {
        try
        {
            var updated = await _lawyerService.UpdateLawyerAsync(id, dto);
            return Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Advocate not found." });
        }
    }

    [HttpPut("{id:guid}/toggle-active")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<LawyerDto>> ToggleActive(Guid id)
    {
        try
        {
            var updated = await _lawyerService.ToggleActiveAsync(id);
            return Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Advocate not found." });
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> DeleteLawyer(Guid id)
    {
        await _lawyerService.DeleteLawyerAsync(id);
        return NoContent();
    }
}
