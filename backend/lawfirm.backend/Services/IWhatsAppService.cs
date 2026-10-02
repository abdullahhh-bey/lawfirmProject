namespace lawfirm.backend.Services;

public interface IWhatsAppService
{
    Task<bool> SendTextMessageAsync(string phoneNumber, string message);
    Task<bool> SendFileAsync(string phoneNumber, Stream fileStream, string fileName, string caption);
}
