namespace lawfirm.backend.Services;

public interface ISecurityEncryptionService
{
    string Encrypt(string? plainText);
    string? Decrypt(string? cipherText);
    byte[] EncryptBytes(byte[] plainBytes);
    byte[] DecryptBytes(byte[] cipherBytes);
}
