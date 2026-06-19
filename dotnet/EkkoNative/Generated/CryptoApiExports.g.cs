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
using System.Runtime.InteropServices;

public static class CryptoApiExports
{
    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_hash")]
    public static unsafe NativeResult EkkoCryptoHash(NativeString algorithm, NativeBuffer data)
    {
        try
        {
            var result = CryptoApi.Hash(algorithm.ToManaged(), data.ToArray());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_hmac")]
    public static unsafe NativeResult EkkoCryptoHmac(NativeString algorithm, NativeBuffer key, NativeBuffer data)
    {
        try
        {
            var result = CryptoApi.Hmac(algorithm.ToManaged(), key.ToArray(), data.ToArray());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_randomBytes")]
    public static unsafe NativeResult EkkoCryptoRandombytes(int count)
    {
        try
        {
            var result = CryptoApi.RandomBytes(count);
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_randomUUID")]
    public static unsafe NativeResult EkkoCryptoRandomuuid()
    {
        try
        {
            var result = CryptoApi.RandomUUID();
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_hashHex")]
    public static unsafe NativeResult EkkoCryptoHashhex(NativeString algorithm, NativeBuffer data)
    {
        try
        {
            var result = CryptoApi.HashHex(algorithm.ToManaged(), data.ToArray());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_generateKey")]
    public static unsafe NativeResult EkkoCryptoGeneratekey(NativeString algorithm)
    {
        try
        {
            var result = CryptoApi.GenerateKey(algorithm.ToManaged());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_encrypt")]
    public static unsafe NativeResult EkkoCryptoEncrypt(NativeString algorithm, NativeBuffer key, NativeBuffer plaintext)
    {
        try
        {
            var result = CryptoApi.Encrypt(algorithm.ToManaged(), key.ToArray(), plaintext.ToArray());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_decrypt")]
    public static unsafe NativeResult EkkoCryptoDecrypt(NativeString algorithm, NativeBuffer key, NativeBuffer data)
    {
        try
        {
            var result = CryptoApi.Decrypt(algorithm.ToManaged(), key.ToArray(), data.ToArray());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_pbkdf2")]
    public static unsafe NativeResult EkkoCryptoPbkdf2(NativeBuffer password, NativeBuffer salt, int iterations, NativeString hash, int length)
    {
        try
        {
            var result = CryptoApi.Pbkdf2(password.ToArray(), salt.ToArray(), iterations, hash.ToManaged(), length);
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_hkdf")]
    public static unsafe NativeResult EkkoCryptoHkdf(NativeBuffer ikm, NativeBuffer salt, NativeBuffer info, NativeString hash, int length)
    {
        try
        {
            var result = CryptoApi.Hkdf(ikm.ToArray(), salt.ToArray(), info.ToArray(), hash.ToManaged(), length);
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_rsaGenerateKeyPem")]
    public static unsafe NativeResult EkkoCryptoRsageneratekeypem(int bits)
    {
        try
        {
            var result = CryptoApi.RsaGenerateKeyPem(bits);
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_rsaSign")]
    public static unsafe NativeResult EkkoCryptoRsasign(NativeString privatePem, NativeBuffer data)
    {
        try
        {
            var result = CryptoApi.RsaSign(privatePem.ToManaged(), data.ToArray());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_rsaVerify")]
    public static unsafe NativeResult EkkoCryptoRsaverify(NativeString publicPem, NativeBuffer data, NativeBuffer signature)
    {
        try
        {
            var result = CryptoApi.RsaVerify(publicPem.ToManaged(), data.ToArray(), signature.ToArray());
            return NativeResult.OkInt(result ? 1 : 0);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_ecdsaGenerateKeyPem")]
    public static unsafe NativeResult EkkoCryptoEcdsageneratekeypem(NativeString curve)
    {
        try
        {
            var result = CryptoApi.EcdsaGenerateKeyPem(curve.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_ecdsaSign")]
    public static unsafe NativeResult EkkoCryptoEcdsasign(NativeString privatePem, NativeBuffer data)
    {
        try
        {
            var result = CryptoApi.EcdsaSign(privatePem.ToManaged(), data.ToArray());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_crypto_ecdsaVerify")]
    public static unsafe NativeResult EkkoCryptoEcdsaverify(NativeString publicPem, NativeBuffer data, NativeBuffer signature)
    {
        try
        {
            var result = CryptoApi.EcdsaVerify(publicPem.ToManaged(), data.ToArray(), signature.ToArray());
            return NativeResult.OkInt(result ? 1 : 0);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

}
