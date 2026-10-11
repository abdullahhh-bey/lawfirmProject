using Amazon.S3;
using Amazon.S3.Model;

namespace lawfirm.backend.Services;

public class CloudflareR2StorageService : IStorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;
    private readonly ISecurityEncryptionService _encryptionService;
    private readonly ILogger<CloudflareR2StorageService> _logger;

    public CloudflareR2StorageService(
        IConfiguration configuration,
        ISecurityEncryptionService encryptionService,
        ILogger<CloudflareR2StorageService> logger)
    {
        _encryptionService = encryptionService;
        _logger = logger;

        var accessKey = configuration["CloudflareR2:AccessKeyId"]
            ?? throw new InvalidOperationException("CloudflareR2:AccessKeyId is missing.");
        var secretKey = configuration["CloudflareR2:SecretAccessKey"]
            ?? throw new InvalidOperationException("CloudflareR2:SecretAccessKey is missing.");
        var serviceUrl = configuration["CloudflareR2:ServiceUrl"]
            ?? throw new InvalidOperationException("CloudflareR2:ServiceUrl is missing.");

        _bucketName = configuration["CloudflareR2:BucketName"] ?? "lawfirm-documents";

        var config = new AmazonS3Config
        {
            ServiceURL = serviceUrl,
            ForcePathStyle = true
        };

        _s3Client = new AmazonS3Client(accessKey, secretKey, config);
    }

    public async Task<string> UploadFileAsync(string pathInBucket, Stream fileStream, string contentType)
    {
        try
        {
            using var ms = new MemoryStream();
            await fileStream.CopyToAsync(ms);
            var plainBytes = ms.ToArray();

            // Client-side AES-256 Encryption before upload
            var encryptedBytes = _encryptionService.EncryptBytes(plainBytes);

            if (encryptedBytes.Length == 0)
            {
                throw new InvalidOperationException("Cannot upload an empty encrypted file.");
            }

            using var encryptedStream = new MemoryStream(encryptedBytes);

            var putRequest = new PutObjectRequest
            {
                BucketName = _bucketName,
                Key = pathInBucket,
                InputStream = encryptedStream,
                ContentType = contentType,

                // Cloudflare R2 rejects the AWS trailer-based chunked SigV4 payload
                // used by the default streaming upload path. Disabling chunked upload
                // encoding and payload signing keeps the request compatible with
                // S3-compatible object storage backends.
                UseChunkEncoding = false,
                DisablePayloadSigning = true
            };
            putRequest.Headers.ContentLength = encryptedBytes.LongLength;

            await _s3Client.PutObjectAsync(putRequest);

            _logger.LogInformation("Successfully uploaded encrypted file {Path} to Cloudflare R2 bucket {Bucket}.", pathInBucket, _bucketName);
            return pathInBucket;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload file {Path} to Cloudflare R2.", pathInBucket);
            throw;
        }
    }

    public async Task<Stream> DownloadFileAsync(string pathInBucket)
    {
        try
        {
            var getRequest = new GetObjectRequest
            {
                BucketName = _bucketName,
                Key = pathInBucket
            };

            using var response = await _s3Client.GetObjectAsync(getRequest);
            using var ms = new MemoryStream();
            await response.ResponseStream.CopyToAsync(ms);
            var cipherBytes = ms.ToArray();

            // Decrypt stream in memory
            var decryptedBytes = _encryptionService.DecryptBytes(cipherBytes);
            return new MemoryStream(decryptedBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download file {Path} from Cloudflare R2.", pathInBucket);
            throw;
        }
    }

    public async Task<string> GetSignedUrlAsync(string pathInBucket, int expiresInSeconds = 900)
    {
        try
        {
            var request = new GetPreSignedUrlRequest
            {
                BucketName = _bucketName,
                Key = pathInBucket,
                Expires = DateTime.UtcNow.AddSeconds(expiresInSeconds)
            };

            return await Task.FromResult(_s3Client.GetPreSignedURL(request));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate presigned URL for {Path}.", pathInBucket);
            throw;
        }
    }

    public async Task DeleteFileAsync(string pathInBucket)
    {
        try
        {
            var deleteRequest = new DeleteObjectRequest
            {
                BucketName = _bucketName,
                Key = pathInBucket
            };

            await _s3Client.DeleteObjectAsync(deleteRequest);
            _logger.LogInformation("Successfully deleted file {Path} from Cloudflare R2.", pathInBucket);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file {Path} from Cloudflare R2.", pathInBucket);
            throw;
        }
    }
}
