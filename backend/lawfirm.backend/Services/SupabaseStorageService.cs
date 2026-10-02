using Supabase;
using lawfirm.backend.Services;

namespace lawfirm.backend.Services;

public class SupabaseStorageService : ISupabaseStorageService
{
    private readonly Client _client;
    private readonly string _bucketName;
    private readonly ISecurityEncryptionService _encryptionService;
    private readonly ILogger<SupabaseStorageService> _logger;

    public SupabaseStorageService(
        IConfiguration configuration, 
        ISecurityEncryptionService encryptionService,
        ILogger<SupabaseStorageService> logger)
    {
        _encryptionService = encryptionService;
        _logger = logger;
        var url = configuration["Supabase:Url"] ?? throw new InvalidOperationException("Supabase:Url is missing.");
        var key = configuration["Supabase:Key"] ?? throw new InvalidOperationException("Supabase:Key is missing.");
        _bucketName = configuration["Supabase:BucketName"] ?? "case-documents";

        var options = new SupabaseOptions
        {
            AutoRefreshToken = false,
            AutoConnectRealtime = false
        };

        _client = new Client(url, key, options);
        _client.InitializeAsync().Wait();
    }

    public async Task<string> UploadFileAsync(string pathInBucket, Stream fileStream, string contentType)
    {
        try
        {
            using var ms = new MemoryStream();
            await fileStream.CopyToAsync(ms);
            var plainBytes = ms.ToArray();

            // Layer 3: Client-side Stream Encryption before sending to Cloud Storage
            var encryptedBytes = _encryptionService.EncryptBytes(plainBytes);

            var storage = _client.Storage.From(_bucketName);
            await storage.Upload(encryptedBytes, pathInBucket, new Supabase.Storage.FileOptions
            {
                ContentType = contentType,
                Upsert = true
            });

            _logger.LogInformation("Successfully uploaded AES-256 encrypted file {Path} to Supabase bucket {Bucket}.", pathInBucket, _bucketName);
            return pathInBucket;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload file {Path} to Supabase Storage.", pathInBucket);
            throw;
        }
    }

    public async Task<Stream> DownloadFileAsync(string pathInBucket)
    {
        try
        {
            var storage = _client.Storage.From(_bucketName);
            var cipherBytes = await storage.Download(pathInBucket, (sender, progress) => { });

            // Layer 3: In-Memory Stream Decryption
            var decryptedBytes = _encryptionService.DecryptBytes(cipherBytes);
            return new MemoryStream(decryptedBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download file {Path} from Supabase Storage.", pathInBucket);
            throw;
        }
    }

    public async Task<string> GetSignedUrlAsync(string pathInBucket, int expiresInSeconds = 900)
    {
        try
        {
            var storage = _client.Storage.From(_bucketName);
            return await storage.CreateSignedUrl(pathInBucket, expiresInSeconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate signed URL for {Path}.", pathInBucket);
            throw;
        }
    }

    public async Task DeleteFileAsync(string pathInBucket)
    {
        try
        {
            var storage = _client.Storage.From(_bucketName);
            await storage.Remove(new List<string> { pathInBucket });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file {Path} from Supabase Storage.", pathInBucket);
            throw;
        }
    }
}
