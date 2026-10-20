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

        var storagePath = GetProperty(fileNode, "storagePath", "storage_path", "path", "StoragePath");
        var fileName = GetProperty(fileNode, "name", "fileName", "Name") ?? "document";
        var mimeType = GetProperty(fileNode, "mimeType", "type", "ContentType") ?? "application/octet-stream";

        if (string.IsNullOrEmpty(storagePath))
        {
            var dataUrl = GetProperty(fileNode, "dataUrl", "url");
            if (!string.IsNullOrEmpty(dataUrl) && dataUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                var commaIdx = dataUrl.IndexOf(',');
                if (commaIdx >= 0)
                {
                    try
                    {
                        var base64 = dataUrl[(commaIdx + 1)..];
                        var bytes = Convert.FromBase64String(base64);
                        return File(new MemoryStream(bytes), mimeType, fileName);
                    }
                    catch { /* fallback to error below */ }
                }
            }

            return BadRequest(new { message = "This file does not have an active cloud storage record. Please re-upload the document to the case." });
        }

        if (redirect)
        {
            // Generate a temporary object-storage URL valid for 15 minutes.
            var signedUrl = await _storageService.GetSignedUrlAsync(storagePath, 900);
            return Redirect(signedUrl);
        }

        try
        {
            // Stream and decrypt file bytes directly to the client.
            var stream = await _storageService.DownloadFileAsync(storagePath);
            return File(stream, mimeType, fileName);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Could not download file from storage: {ex.Message}. Please check your connection or contact the administrator." });
        }
    }

    private static string? GetProperty(Dictionary<string, object> node, params string[] candidateNames)
    {
        foreach (var name in candidateNames)
        {
            foreach (var kvp in node)
            {
                if (string.Equals(kvp.Key, name, StringComparison.OrdinalIgnoreCase))
                {
                    if (kvp.Value is JsonElement je)
                    {
                        if (je.ValueKind == JsonValueKind.String) return je.GetString();
                        return je.ToString();
                    }
                    return kvp.Value?.ToString();
                }
            }
        }
        return null;
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
            var id = GetProperty(node, "id", "Id");
            if (string.Equals(id, nodeId, StringComparison.OrdinalIgnoreCase))
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
