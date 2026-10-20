using System.Security.Cryptography;
using System.Text;

namespace lawfirm.backend.Services;

public class SecurityEncryptionService : ISecurityEncryptionService
{
    private const string PREFIX = "ENC:v1:";
    private readonly byte[] _key;
    private readonly ILogger<SecurityEncryptionService> _logger;

    public SecurityEncryptionService(IConfiguration configuration, ILogger<SecurityEncryptionService> logger)
    {
        _logger = logger;
        var masterKeyStr = configuration["Security:EncryptionKey"]
            ?? configuration["SECURITY_ENCRYPTION_KEY"]
            ?? throw new InvalidOperationException("Security encryption key is not configured.");

        byte[] keyBytes;
        try
        {
            keyBytes = Convert.FromBase64String(masterKeyStr);
        }
        catch
        {
            keyBytes = Encoding.UTF8.GetBytes(masterKeyStr);
        }

        if (keyBytes.Length != 32)
        {
            throw new InvalidOperationException("Security encryption key must be exactly 32 bytes (AES-256), or a Base64 encoding of 32 bytes.");
        }

        _key = keyBytes;
    }

    public string Encrypt(string? plainText)
    {
        if (string.IsNullOrEmpty(plainText)) return plainText ?? "";
        if (plainText.StartsWith(PREFIX)) return plainText; // Already encrypted

        try
        {
            var plainBytes = Encoding.UTF8.GetBytes(plainText);
            var encryptedBytes = EncryptBytes(plainBytes);
            return PREFIX + Convert.ToBase64String(encryptedBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to encrypt text value.");
            throw;
        }
    }

    public string? Decrypt(string? cipherText)
    {
        if (string.IsNullOrEmpty(cipherText)) return cipherText;
        if (!cipherText.StartsWith(PREFIX)) return cipherText; // Return plain legacy text as-is

        try
        {
            var base64 = cipherText.Substring(PREFIX.Length);
            var cipherBytes = Convert.FromBase64String(base64);
            var decryptedBytes = DecryptBytes(cipherBytes);
            return Encoding.UTF8.GetString(decryptedBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to decrypt text value.");
            return cipherText; // Fallback to raw value on error
        }
    }

    public byte[] EncryptBytes(byte[] plainBytes)
    {
        if (plainBytes == null || plainBytes.Length == 0) return Array.Empty<byte>();

        // AES-GCM parameters
        var nonce = new byte[12]; // 96-bit nonce
        RandomNumberGenerator.Fill(nonce);

        var tag = new byte[16]; // 128-bit authentication tag
        var cipherText = new byte[plainBytes.Length];

        using (var aesGcm = new AesGcm(_key, 16))
        {
            aesGcm.Encrypt(nonce, plainBytes, cipherText, tag);
        }

        // Pack: Nonce (12B) + Tag (16B) + CipherText
        var result = new byte[nonce.Length + tag.Length + cipherText.Length];
        Buffer.BlockCopy(nonce, 0, result, 0, nonce.Length);
        Buffer.BlockCopy(tag, 0, result, nonce.Length, tag.Length);
        Buffer.BlockCopy(cipherText, 0, result, nonce.Length + tag.Length, cipherText.Length);

        return result;
    }

    public byte[] DecryptBytes(byte[] cipherBytes)
    {
        if (cipherBytes == null || cipherBytes.Length < 28) return cipherBytes ?? Array.Empty<byte>();

        var nonce = new byte[12];
        var tag = new byte[16];
        var cipherText = new byte[cipherBytes.Length - 28];

        Buffer.BlockCopy(cipherBytes, 0, nonce, 0, 12);
        Buffer.BlockCopy(cipherBytes, 12, tag, 0, 16);
        Buffer.BlockCopy(cipherBytes, 28, cipherText, 0, cipherText.Length);

        var plainBytes = new byte[cipherText.Length];

        try
        {
            using (var aesGcm = new AesGcm(_key, 16))
            {
                aesGcm.Decrypt(nonce, cipherText, tag, plainBytes);
            }

            return plainBytes;
        }
        catch (CryptographicException)
        {
            // If the file was not encrypted with this key or is an unencrypted PDF/document,
            // fallback gracefully to the original bytes so the file is not blocked or corrupted.
            return cipherBytes;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to decrypt bytes with AES-GCM; falling back to original payload.");
            return cipherBytes;
        }
    }
}
