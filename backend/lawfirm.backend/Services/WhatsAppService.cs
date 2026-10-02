using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace lawfirm.backend.Services;

public class WhatsAppService : IWhatsAppService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WhatsAppService> _logger;

    public WhatsAppService(HttpClient httpClient, IConfiguration configuration, ILogger<WhatsAppService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    private (string baseUrl, string idInstance, string tokenInstance) GetConfig()
    {
        var baseUrl = (_configuration["GreenApi:ApiUrl"] ?? "https://api.greenapi.com").TrimEnd('/');
        var idInstance = (_configuration["GreenApi:IdInstance"] ?? "").Trim();
        var tokenInstance = (_configuration["GreenApi:ApiTokenInstance"] ?? "").Trim();
        return (baseUrl, idInstance, tokenInstance);
    }

    private string FormatChatId(string phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber)) return "";

        // Remove non-digit characters
        var clean = Regex.Replace(phoneNumber, @"[^\d]", "");

        // If local Pakistani number like 03001234567 (11 digits starting with 0)
        if (clean.Length == 11 && clean.StartsWith("0"))
        {
            clean = "92" + clean.Substring(1);
        }
        else if (clean.Length == 10 && clean.StartsWith("3"))
        {
            clean = "92" + clean;
        }

        if (!clean.EndsWith("@c.us"))
        {
            clean = $"{clean}@c.us";
        }

        return clean;
    }

    private static string GetMimeType(string fileName)
    {
        if (string.IsNullOrEmpty(fileName)) return "application/octet-stream";
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".pdf" => "application/pdf",
            ".doc" or ".docx" => "application/msword",
            ".txt" => "text/plain",
            _ => "application/octet-stream"
        };
    }

    public async Task<bool> SendTextMessageAsync(string phoneNumber, string message)
    {
        var (baseUrl, idInstance, tokenInstance) = GetConfig();
        if (string.IsNullOrEmpty(idInstance) || string.IsNullOrEmpty(tokenInstance))
        {
            _logger.LogWarning("[WhatsApp GreenAPI] IdInstance or ApiTokenInstance not configured in appsettings.json. Logged message: {Msg} to {Phone}", message, phoneNumber);
            return false;
        }

        var chatId = FormatChatId(phoneNumber);
        if (string.IsNullOrEmpty(chatId))
        {
            _logger.LogError("[WhatsApp GreenAPI] Invalid phone number provided: {Phone}", phoneNumber);
            return false;
        }

        var url = $"{baseUrl}/waInstance{idInstance}/sendMessage/{tokenInstance}";

        var payload = new
        {
            chatId = chatId,
            message = message
        };

        try
        {
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);
            var responseStr = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[WhatsApp GreenAPI] Successfully sent message to {ChatId}. Response: {Res}", chatId, responseStr);
                return true;
            }

            _logger.LogError("[WhatsApp GreenAPI] Failed to send message to {ChatId}. Status: {Status}, Response: {Res}", chatId, response.StatusCode, responseStr);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[WhatsApp GreenAPI] Error sending text message to {Phone}", phoneNumber);
            return false;
        }
    }

    public async Task<bool> SendFileAsync(string phoneNumber, Stream fileStream, string fileName, string caption)
    {
        var (baseUrl, idInstance, tokenInstance) = GetConfig();
        if (string.IsNullOrEmpty(idInstance) || string.IsNullOrEmpty(tokenInstance))
        {
            _logger.LogWarning("[WhatsApp GreenAPI] IdInstance or ApiTokenInstance not configured in appsettings.json. Cannot send file {FileName} to {Phone}.", fileName, phoneNumber);
            return false;
        }

        var chatId = FormatChatId(phoneNumber);
        if (string.IsNullOrEmpty(chatId))
        {
            _logger.LogError("[WhatsApp GreenAPI] Invalid phone number provided for file send: {Phone}", phoneNumber);
            return false;
        }

        var url = $"{baseUrl}/waInstance{idInstance}/sendFileByUpload/{tokenInstance}";

        try
        {
            using var formData = new MultipartFormDataContent();

            formData.Add(new StringContent(chatId), "chatId");
            if (!string.IsNullOrEmpty(caption))
            {
                formData.Add(new StringContent(caption), "caption");
            }
            if (!string.IsNullOrEmpty(fileName))
            {
                formData.Add(new StringContent(fileName), "fileName");
            }

            fileStream.Position = 0;
            var fileContent = new StreamContent(fileStream);
            var mime = GetMimeType(fileName);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue(mime);
            formData.Add(fileContent, "file", fileName ?? "file");

            var response = await _httpClient.PostAsync(url, formData);
            var responseStr = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[WhatsApp GreenAPI] Successfully sent file {FileName} to {ChatId}. Response: {Res}", fileName, chatId, responseStr);
                return true;
            }

            _logger.LogError("[WhatsApp GreenAPI] Failed to send file to {ChatId}. Status: {Status}, Response: {Res}", chatId, response.StatusCode, responseStr);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[WhatsApp GreenAPI] Error sending file {FileName} to {Phone}", fileName, phoneNumber);
            return false;
        }
    }
}
