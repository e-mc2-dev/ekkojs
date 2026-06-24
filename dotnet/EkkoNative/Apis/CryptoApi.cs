// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

using System;
using System.Security.Cryptography;
using System.Text;

public static class CryptoApi
{
    [EkkoExport("crypto.hash")]
    public static byte[] Hash(string algorithm, byte[] data)
    {
        return algorithm.ToLowerInvariant() switch
        {
            "sha256" => SHA256.HashData(data),
            "sha384" => SHA384.HashData(data),
            "sha512" => SHA512.HashData(data),
            "sha1"   => SHA1.HashData(data),
            "md5"    => MD5.HashData(data),
            _ => throw new ArgumentException($"Unknown hash algorithm: {algorithm}")
        };
    }

    [EkkoExport("crypto.hmac")]
    public static byte[] Hmac(string algorithm, byte[] key, byte[] data)
    {
        return algorithm.ToLowerInvariant() switch
        {
            "sha1"   => HMACSHA1.HashData(key, data),
            "sha256" => HMACSHA256.HashData(key, data),
            "sha384" => HMACSHA384.HashData(key, data),
            "sha512" => HMACSHA512.HashData(key, data),
            _ => throw new ArgumentException($"Unknown HMAC algorithm: {algorithm}")
        };
    }

    [EkkoExport("crypto.randomBytes")]
    public static byte[] RandomBytes(int count)
    {
        return RandomNumberGenerator.GetBytes(count);
    }

    [EkkoExport("crypto.randomUUID")]
    public static string RandomUUID()
    {
        return Guid.NewGuid().ToString();
    }

    [EkkoExport("crypto.hashHex")]
    public static string HashHex(string algorithm, byte[] data)
    {
        var hash = Hash(algorithm, data);
        return Convert.ToHexStringLower(hash);
    }

    [EkkoExport("crypto.generateKey")]
    public static byte[] GenerateKey(string algorithm)
    {
        int keySize = algorithm.ToLowerInvariant() switch
        {
            "aes-256-gcm" or "aes-256-cbc" => 32,
            "aes-128-gcm" or "aes-128-cbc" => 16,
            _ => throw new ArgumentException($"Unknown algorithm: {algorithm}")
        };
        return RandomNumberGenerator.GetBytes(keySize);
    }

    [EkkoExport("crypto.encrypt")]
    public static byte[] Encrypt(string algorithm, byte[] key, byte[] plaintext)
    {
        if (algorithm.Contains("gcm"))
        {
            using var aes = new AesGcm(key, 16);
            var nonce = RandomNumberGenerator.GetBytes(12);
            var ciphertext = new byte[plaintext.Length];
            var tag = new byte[16];
            aes.Encrypt(nonce, plaintext, ciphertext, tag);
            var result = new byte[12 + ciphertext.Length + 16];
            Buffer.BlockCopy(nonce, 0, result, 0, 12);
            Buffer.BlockCopy(ciphertext, 0, result, 12, ciphertext.Length);
            Buffer.BlockCopy(tag, 0, result, 12 + ciphertext.Length, 16);
            return result;
        }
        else
        {
            using var aes = Aes.Create();
            aes.Key = key;
            var iv = RandomNumberGenerator.GetBytes(16);
            var encrypted = aes.EncryptCbc(plaintext, iv);
            var result = new byte[16 + encrypted.Length];
            Buffer.BlockCopy(iv, 0, result, 0, 16);
            Buffer.BlockCopy(encrypted, 0, result, 16, encrypted.Length);
            return result;
        }
    }

    [EkkoExport("crypto.decrypt")]
    public static byte[] Decrypt(string algorithm, byte[] key, byte[] data)
    {
        if (algorithm.Contains("gcm"))
        {
            if (data.Length < 28) throw new ArgumentException("Invalid GCM ciphertext");
            using var aes = new AesGcm(key, 16);
            var nonce = new byte[12];
            var tag = new byte[16];
            var ciphertext = new byte[data.Length - 28];
            Buffer.BlockCopy(data, 0, nonce, 0, 12);
            Buffer.BlockCopy(data, 12, ciphertext, 0, ciphertext.Length);
            Buffer.BlockCopy(data, data.Length - 16, tag, 0, 16);
            var plaintext = new byte[ciphertext.Length];
            aes.Decrypt(nonce, ciphertext, tag, plaintext);
            return plaintext;
        }
        else
        {
            if (data.Length < 16) throw new ArgumentException("Invalid CBC ciphertext");
            using var aes = Aes.Create();
            aes.Key = key;
            var iv = new byte[16];
            var ciphertext = new byte[data.Length - 16];
            Buffer.BlockCopy(data, 0, iv, 0, 16);
            Buffer.BlockCopy(data, 16, ciphertext, 0, ciphertext.Length);
            return aes.DecryptCbc(ciphertext, iv);
        }
    }

    [EkkoExport("crypto.pbkdf2")]
    public static byte[] Pbkdf2(byte[] password, byte[] salt, int iterations, string hash, int length)
    {
        var hashAlg = hash?.ToLowerInvariant() switch
        {
            "sha384" => HashAlgorithmName.SHA384,
            "sha512" => HashAlgorithmName.SHA512,
            "sha1"   => HashAlgorithmName.SHA1,
            _        => HashAlgorithmName.SHA256,
        };
        return Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations > 0 ? iterations : 100000, hashAlg, length > 0 ? length : 32);
    }

    [EkkoExport("crypto.hkdf")]
    public static byte[] Hkdf(byte[] ikm, byte[] salt, byte[] info, string hash, int length)
    {
        var hashAlg = hash?.ToLowerInvariant() switch
        {
            "sha384" => HashAlgorithmName.SHA384,
            "sha512" => HashAlgorithmName.SHA512,
            _        => HashAlgorithmName.SHA256,
        };
        return HKDF.DeriveKey(hashAlg, ikm, length > 0 ? length : 32, salt, info);
    }

    [EkkoExport("crypto.rsaGenerateKeyPem")]
    public static string RsaGenerateKeyPem(int bits)
    {
        using var rsa = RSA.Create(bits >= 2048 ? bits : 3072);
        var pub_ = rsa.ExportSubjectPublicKeyInfoPem();
        var priv_ = rsa.ExportPkcs8PrivateKeyPem();
        return pub_ + "\n---SPLIT---\n" + priv_;
    }

    [EkkoExport("crypto.rsaSign")]
    public static byte[] RsaSign(string privatePem, byte[] data)
    {
        using var rsa = RSA.Create();
        rsa.ImportFromPem(privatePem);
        return rsa.SignData(data, HashAlgorithmName.SHA256, RSASignaturePadding.Pss);
    }

    [EkkoExport("crypto.rsaVerify")]
    public static bool RsaVerify(string publicPem, byte[] data, byte[] signature)
    {
        using var rsa = RSA.Create();
        rsa.ImportFromPem(publicPem);
        return rsa.VerifyData(data, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pss);
    }

    [EkkoExport("crypto.ecdsaGenerateKeyPem")]
    public static string EcdsaGenerateKeyPem(string curve)
    {
        var ecCurve = curve?.ToLowerInvariant() switch
        {
            "p-384" => ECCurve.NamedCurves.nistP384,
            "p-521" => ECCurve.NamedCurves.nistP521,
            _       => ECCurve.NamedCurves.nistP256,
        };
        using var ecdsa = ECDsa.Create(ecCurve);
        var pub_ = ecdsa.ExportSubjectPublicKeyInfoPem();
        var priv_ = ecdsa.ExportECPrivateKeyPem();
        return pub_ + "\n---SPLIT---\n" + priv_;
    }

    [EkkoExport("crypto.ecdsaSign")]
    public static byte[] EcdsaSign(string privatePem, byte[] data)
    {
        using var ecdsa = ECDsa.Create();
        ecdsa.ImportFromPem(privatePem);
        return ecdsa.SignData(data, HashAlgorithmName.SHA256, DSASignatureFormat.Rfc3279DerSequence);
    }

    [EkkoExport("crypto.ecdsaVerify")]
    public static bool EcdsaVerify(string publicPem, byte[] data, byte[] signature)
    {
        using var ecdsa = ECDsa.Create();
        ecdsa.ImportFromPem(publicPem);
        try { if (ecdsa.VerifyData(data, signature, HashAlgorithmName.SHA256, DSASignatureFormat.Rfc3279DerSequence)) return true; } catch {}
        try { if (ecdsa.VerifyData(data, signature, HashAlgorithmName.SHA256, DSASignatureFormat.IeeeP1363FixedFieldConcatenation)) return true; } catch {}
        return false;
    }
}
