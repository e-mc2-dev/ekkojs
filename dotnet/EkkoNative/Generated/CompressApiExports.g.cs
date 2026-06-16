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

public static class CompressApiExports
{
    [UnmanagedCallersOnly(EntryPoint = "ekko_compress_gzipCompress")]
    public static unsafe NativeResult EkkoCompressGzipcompress(NativeBuffer data, int level)
    {
        try
        {
            var result = CompressApi.GzipCompress(data.ToArray(), level);
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_compress_gzipDecompress")]
    public static unsafe NativeResult EkkoCompressGzipdecompress(NativeBuffer data)
    {
        try
        {
            var result = CompressApi.GzipDecompress(data.ToArray());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_compress_brotliCompress")]
    public static unsafe NativeResult EkkoCompressBrotlicompress(NativeBuffer data, int level)
    {
        try
        {
            var result = CompressApi.BrotliCompress(data.ToArray(), level);
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_compress_brotliDecompress")]
    public static unsafe NativeResult EkkoCompressBrotlidecompress(NativeBuffer data)
    {
        try
        {
            var result = CompressApi.BrotliDecompress(data.ToArray());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_compress_deflateCompress")]
    public static unsafe NativeResult EkkoCompressDeflatecompress(NativeBuffer data, int level)
    {
        try
        {
            var result = CompressApi.DeflateCompress(data.ToArray(), level);
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_compress_deflateDecompress")]
    public static unsafe NativeResult EkkoCompressDeflatedecompress(NativeBuffer data)
    {
        try
        {
            var result = CompressApi.DeflateDecompress(data.ToArray());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_compress_createStream")]
    public static unsafe NativeResult EkkoCompressCreatestream(NativeString algorithm, NativeString mode, int level)
    {
        try
        {
            var result = CompressApi.CreateStream(algorithm.ToManaged(), mode.ToManaged(), level);
            return NativeResult.OkInt((long)result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_compress_streamWrite")]
    public static unsafe NativeResult EkkoCompressStreamwrite(int handle, NativeBuffer chunk)
    {
        try
        {
            CompressApi.StreamWrite(handle, chunk.ToArray());
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_compress_streamFinish")]
    public static unsafe NativeResult EkkoCompressStreamfinish(int handle)
    {
        try
        {
            var result = CompressApi.StreamFinish(handle);
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

}
