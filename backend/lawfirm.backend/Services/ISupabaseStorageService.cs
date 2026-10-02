namespace lawfirm.backend.Services;

public interface ISupabaseStorageService
{
    Task<string> UploadFileAsync(string pathInBucket, Stream fileStream, string contentType);
    Task<Stream> DownloadFileAsync(string pathInBucket);
    Task<string> GetSignedUrlAsync(string pathInBucket, int expiresInSeconds = 900);
    Task DeleteFileAsync(string pathInBucket);
}
