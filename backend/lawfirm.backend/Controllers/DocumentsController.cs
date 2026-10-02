using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using lawfirm.backend.Services;

namespace lawfirm.backend.Controllers;

[ApiController]
[Route("api/cases/{caseId:guid}/documents")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly ICaseService _caseService;
    private readonly ISupabaseStorageService _storageService;

    public DocumentsController(ICaseService caseService, ISupabaseStorageService storageService)
    {
        _caseService = caseService;
        _storageService = storageService;
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? "lawyer";

    [HttpPost("upload")]
    public async Task<IActionResult> UploadDocument(Guid caseId, IFormFile file, [FromQuery] string? folderId = null)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file selected." });

        var caseRecord = await _caseService.GetCaseByIdAsync(caseId, CurrentUserId, CurrentUserRole);
        if (caseRecord == null) return NotFound(new { message = "Case not found." });

        var fileId = Guid.NewGuid().ToString("N");
        var fileExtension = Path.GetExtension(file.FileName);
        var storagePath = $"{caseRecord.CaseId}/{fileId}_{file.FileName}";

        using var stream = file.OpenReadStream();
        await _storageService.UploadFileAsync(storagePath, stream, file.ContentType);

        // Parse existing DocumentsJson tree and append new file node
        var docsTree = ParseDocumentsJson(caseRecord.DocumentsJson);
        var newFileNode = new Dictionary<string, object>
        {
            ["id"] = fileId,
            ["kind"] = "file",
            ["name"] = file.FileName,
            ["mimeType"] = file.ContentType,
            ["size"] = file.Length,
            ["storagePath"] = storagePath,
            ["createdAt"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
        };

        if (!string.IsNullOrEmpty(folderId))
        {
            newFileNode["parentId"] = folderId;
        }

        docsTree.Add(newFileNode);
        var updatedJson = JsonSerializer.Serialize(docsTree);

        await _caseService.SetCaseDocumentsAsync(caseId, updatedJson);

        return Ok(newFileNode);
    }

    [HttpGet("{fileId}/download")]
    public async Task<IActionResult> DownloadDocument(Guid caseId, string fileId, [FromQuery] bool redirect = false)
    {
        var caseRecord = await _caseService.GetCaseByIdAsync(caseId, CurrentUserId, CurrentUserRole);
        if (caseRecord == null) return NotFound(new { message = "Case not found." });

        var docsTree = ParseDocumentsJson(caseRecord.DocumentsJson);
        var fileNode = docsTree.FirstOrDefault(d => d.GetValueOrDefault("id")?.ToString() == fileId);

        if (fileNode == null) return NotFound(new { message = "Document not found." });

        var storagePath = fileNode.GetValueOrDefault("storagePath")?.ToString();
        var fileName = fileNode.GetValueOrDefault("name")?.ToString() ?? "document";
        var mimeType = fileNode.GetValueOrDefault("mimeType")?.ToString() ?? "application/octet-stream";

        if (string.IsNullOrEmpty(storagePath))
        {
            return BadRequest(new { message = "Document storage path is missing." });
        }

        if (redirect)
        {
            // Generate Supabase temporary signed URL valid for 15 minutes
            var signedUrl = await _storageService.GetSignedUrlAsync(storagePath, 900);
            return Redirect(signedUrl);
        }

        // Stream file bytes directly from Supabase to client
        var stream = await _storageService.DownloadFileAsync(storagePath);
        return File(stream, mimeType, fileName);
    }

    [HttpDelete("{fileId}")]
    public async Task<IActionResult> DeleteDocument(Guid caseId, string fileId)
    {
        var caseRecord = await _caseService.GetCaseByIdAsync(caseId, CurrentUserId, CurrentUserRole);
        if (caseRecord == null) return NotFound(new { message = "Case not found." });

        var docsTree = ParseDocumentsJson(caseRecord.DocumentsJson);
        var fileNode = docsTree.FirstOrDefault(d => d.GetValueOrDefault("id")?.ToString() == fileId);

        if (fileNode != null)
        {
            var storagePath = fileNode.GetValueOrDefault("storagePath")?.ToString();
            if (!string.IsNullOrEmpty(storagePath))
            {
                await _storageService.DeleteFileAsync(storagePath);
            }

            docsTree.Remove(fileNode);
            var updatedJson = JsonSerializer.Serialize(docsTree);
            await _caseService.SetCaseDocumentsAsync(caseId, updatedJson);
        }

        return NoContent();
    }

    private static List<Dictionary<string, object>> ParseDocumentsJson(string json)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(json)) return new();
            return JsonSerializer.Deserialize<List<Dictionary<string, object>>>(json) ?? new();
        }
        catch
        {
            return new();
        }
    }
}
