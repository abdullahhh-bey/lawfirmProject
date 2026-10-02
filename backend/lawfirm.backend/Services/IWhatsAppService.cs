namespace lawfirm.backend.Services;

public interface IWhatsAppService
{
    Task<(bool Success, string Message)> SendTextMessageAsync(string phoneNumber, string message);
    Task<(bool Success, string Message)> SendFileAsync(string phoneNumber, Stream fileStream, string fileName, string caption);
}
