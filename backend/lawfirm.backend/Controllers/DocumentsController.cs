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
    private readonly IStorageService _storageService;

    public DocumentsController(ICaseService caseService, IStorageService storageService)
    {
        _caseService = caseService;
        _storageService = storageService;
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

    [HttpPost("upload")]
    [RequestSizeLimit(52428800)]
    [RequestFormLimits(MultipartBodyLengthLimit = 52428800)]
    public async Task<IActionResult> UploadDocument(Guid caseId, IFormFile file, [FromQuery] string? folderId = null)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file selected." });

        var caseRecord = await _caseService.GetCaseByIdAsync(caseId, CurrentUserId, CurrentUserRole);
        if (caseRecord == null) return NotFound(new { message = "Case not found." });
        if (CurrentUserRole != "admin" && (caseRecord.Status is "Completed" or "Archived" or "Cancelled"))
            return Conflict(new { message = "Documents cannot be changed on a completed, archived, or cancelled case." });

        var fileId = Guid.NewGuid().ToString("N");
        var storagePath = $"{caseRecord.CaseId}/{fileId}_{Path.GetFileName(file.FileName)}";
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
            if (!AddToFolder(docsTree, folderId, newFileNode))
                return BadRequest(new { message = "The selected folder was not found." });
        }
        else
        {
            docsTree.Add(newFileNode);
        }

        using var stream = file.OpenReadStream();
        await _storageService.UploadFileAsync(storagePath, stream, file.ContentType);

        var updatedJson = JsonSerializer.Serialize(docsTree);

        await _caseService.SetCaseDocumentsAsync(caseId, updatedJson, CurrentUserId, CurrentUserRole);

        return Ok(newFileNode);
    }

    [HttpGet("{fileId}/download")]
    public async Task<IActionResult> DownloadDocument(Guid caseId, string fileId, [FromQuery] bool redirect = false)
    {
        var caseRecord = await _caseService.GetCaseByIdAsync(caseId, CurrentUserId, CurrentUserRole);
        if (caseRecord == null) return NotFound(new { message = "Case not found." });

        var docsTree = ParseDocumentsJson(caseRecord.DocumentsJson);
        var fileNode = FindNode(docsTree, fileId);

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
            // Generate a temporary object-storage URL valid for 15 minutes.
            var signedUrl = await _storageService.GetSignedUrlAsync(storagePath, 900);
            return Redirect(signedUrl);
        }

        // Stream and decrypt file bytes directly to the client.
        var stream = await _storageService.DownloadFileAsync(storagePath);
        return File(stream, mimeType, fileName);
    }

    [HttpDelete("{fileId}")]
    public async Task<IActionResult> DeleteDocument(Guid caseId, string fileId)
    {
        var caseRecord = await _caseService.GetCaseByIdAsync(caseId, CurrentUserId, CurrentUserRole);
        if (caseRecord == null) return NotFound(new { message = "Case not found." });
        if (CurrentUserRole != "admin" && (caseRecord.Status is "Completed" or "Archived" or "Cancelled"))
            return Conflict(new { message = "Documents cannot be changed on a completed, archived, or cancelled case." });

        var docsTree = ParseDocumentsJson(caseRecord.DocumentsJson);
        var fileNode = FindNode(docsTree, fileId);

        if (fileNode != null)
        {
            var storagePath = fileNode.GetValueOrDefault("storagePath")?.ToString();
            if (!string.IsNullOrEmpty(storagePath))
            {
                await _storageService.DeleteFileAsync(storagePath);
            }

            RemoveNode(docsTree, fileId);
            var updatedJson = JsonSerializer.Serialize(docsTree);
            await _caseService.SetCaseDocumentsAsync(caseId, updatedJson, CurrentUserId, CurrentUserRole);
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

    private static Dictionary<string, object>? FindNode(List<Dictionary<string, object>> nodes, string nodeId)
    {
        foreach (var node in nodes)
        {
            if (node.GetValueOrDefault("id")?.ToString() == nodeId)
                return node;

            var found = FindNode(GetChildren(node), nodeId);
            if (found != null)
                return found;
        }

        return null;
    }

    private static bool AddToFolder(List<Dictionary<string, object>> nodes, string folderId, Dictionary<string, object> fileNode)
    {
        foreach (var node in nodes)
        {
            if (node.GetValueOrDefault("id")?.ToString() == folderId &&
                node.GetValueOrDefault("kind")?.ToString() == "folder")
            {
                var children = GetChildren(node);
                children.Add(fileNode);
                node["children"] = children;
                return true;
            }

            var nestedChildren = GetChildren(node);
            if (AddToFolder(nestedChildren, folderId, fileNode))
            {
                node["children"] = nestedChildren;
                return true;
            }
        }

        return false;
    }

    private static bool RemoveNode(List<Dictionary<string, object>> nodes, string nodeId)
    {
        var node = nodes.FirstOrDefault(n => n.GetValueOrDefault("id")?.ToString() == nodeId);
        if (node != null)
            return nodes.Remove(node);

        foreach (var parent in nodes)
        {
            var children = GetChildren(parent);
            if (RemoveNode(children, nodeId))
            {
                parent["children"] = children;
                return true;
            }
        }

        return false;
    }

    private static List<Dictionary<string, object>> GetChildren(Dictionary<string, object> node)
    {
        if (!node.TryGetValue("children", out var value) || value is not JsonElement element || element.ValueKind != JsonValueKind.Array)
            return new();

        return element.Deserialize<List<Dictionary<string, object>>>() ?? new();
    }
}
