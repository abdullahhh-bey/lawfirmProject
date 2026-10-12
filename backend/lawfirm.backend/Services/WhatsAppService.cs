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

    private static string GetValue(IConfiguration configuration, params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = configuration[key];
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return string.Empty;
    }

    private static string NormalizeBaseUrl(string? configuredUrl)
    {
        var url = (configuredUrl ?? "").Trim();
        if (string.IsNullOrWhiteSpace(url))
        {
            return "https://api.greenapi.com";
        }

        if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            url = $"https://{url}";
        }

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            return "https://api.greenapi.com";
        }

        return uri.GetLeftPart(UriPartial.Authority).TrimEnd('/');
    }

    private static string GetIdInstance(IConfiguration configuration)
    {
        var idInstance = GetValue(configuration,
            "GreenApi:IdInstance",
            "GreenApi:InstanceId",
            "GreenApi:Id",
            "IdInstance",
            "GreenApi:Name");

        if (!string.IsNullOrWhiteSpace(idInstance))
        {
            var match = Regex.Match(idInstance, @"\d+");
            if (match.Success)
            {
                return match.Value;
            }
        }

        return string.Empty;
    }

    private (string baseUrl, string idInstance, string tokenInstance) GetConfig()
    {
        var baseUrl = NormalizeBaseUrl(GetValue(_configuration,
            "GreenApi:ApiUrl",
            "GreenApi:BaseUrl",
            "GreenApi:Url",
            "GreenApi:LegacyApiUrl"));

        var idInstance = GetIdInstance(_configuration);
        var tokenInstance = GetValue(_configuration,
            "GreenApi:ApiTokenInstance",
            "GreenApi:TokenInstance",
            "GreenApi:ApiToken",
            "GreenApi:Token");

        return (baseUrl, idInstance, tokenInstance);
    }

    private string BuildInstanceUrl(string baseUrl, string idInstance)
    {
        if (string.IsNullOrWhiteSpace(idInstance))
        {
            return baseUrl.TrimEnd('/');
        }

        baseUrl = baseUrl.TrimEnd('/');
        if (baseUrl.Contains("/waInstance", StringComparison.OrdinalIgnoreCase))
        {
            return baseUrl;
        }

        return $"{baseUrl}/waInstance{idInstance}";
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

    public async Task<(bool Success, string Message)> SendTextMessageAsync(string phoneNumber, string message)
    {
        var (baseUrl, idInstance, tokenInstance) = GetConfig();
        if (string.IsNullOrEmpty(idInstance) || string.IsNullOrEmpty(tokenInstance))
        {
            _logger.LogWarning("[WhatsApp GreenAPI] Instance credentials are not configured.");
            return (false, "Green API is not configured yet.");
        }

        var chatId = FormatChatId(phoneNumber);
        if (string.IsNullOrEmpty(chatId))
        {
            _logger.LogWarning("[WhatsApp GreenAPI] A message was not sent because the phone number format is invalid.");
            return (false, "Invalid phone number format.");
        }

        var url = $"{BuildInstanceUrl(baseUrl, idInstance)}/sendMessage/{Uri.EscapeDataString(tokenInstance)}";

        var payload = new
        {
            chatId = chatId,
            message = message
        };

        try
        {
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            using var response = await _httpClient.PostAsync(url, content);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[WhatsApp GreenAPI] Message sent successfully.");
                return (true, "WhatsApp message sent successfully.");
            }

            _logger.LogWarning("[WhatsApp GreenAPI] Message delivery failed with status {Status}.", response.StatusCode);
            return (false, $"Green API rejected the message ({response.StatusCode}).");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError("[WhatsApp GreenAPI] Network error sending text message ({ErrorType}).", ex.GetType().Name);
            return (false, "Network error connecting to Green API.");
        }
        catch (Exception ex)
        {
            _logger.LogError("[WhatsApp GreenAPI] Error sending text message ({ErrorType}).", ex.GetType().Name);
            return (false, "Error sending WhatsApp message.");
        }
    }

    public async Task<(bool Success, string Message)> SendFileAsync(string phoneNumber, Stream fileStream, string fileName, string caption)
    {
        var (baseUrl, idInstance, tokenInstance) = GetConfig();
        if (string.IsNullOrEmpty(idInstance) || string.IsNullOrEmpty(tokenInstance))
        {
            _logger.LogWarning("[WhatsApp GreenAPI] Instance credentials are not configured.");
            return (false, "Green API is not configured yet.");
        }

        var chatId = FormatChatId(phoneNumber);
        if (string.IsNullOrEmpty(chatId))
        {
            _logger.LogWarning("[WhatsApp GreenAPI] A file was not sent because the phone number format is invalid.");
            return (false, "Invalid phone number format.");
        }

        var url = $"{BuildInstanceUrl(baseUrl, idInstance)}/sendFileByUpload/{Uri.EscapeDataString(tokenInstance)}";

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

            using var response = await _httpClient.PostAsync(url, formData);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[WhatsApp GreenAPI] File sent successfully.");
                return (true, "WhatsApp file sent successfully.");
            }

            _logger.LogWarning("[WhatsApp GreenAPI] File delivery failed with status {Status}.", response.StatusCode);
            return (false, $"Green API rejected the file ({response.StatusCode}).");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError("[WhatsApp GreenAPI] Network error sending file ({ErrorType}).", ex.GetType().Name);
            return (false, "Network error connecting to Green API.");
        }
        catch (Exception ex)
        {
            _logger.LogError("[WhatsApp GreenAPI] Error sending file ({ErrorType}).", ex.GetType().Name);
            return (false, "Error sending WhatsApp file.");
        }
    }
}
