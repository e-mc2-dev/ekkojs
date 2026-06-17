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
using System.IO;
using System.IO.Compression;

public static class CompressApi
{
    [EkkoExport("compress.gzipCompress")]
    public static byte[] GzipCompress(byte[] data, int level)
    {
        using var output = new MemoryStream();
        using (var gz = new GZipStream(output, MapLevel(level), leaveOpen: true))
            gz.Write(data);
        return output.ToArray();
    }

    [EkkoExport("compress.gzipDecompress")]
    public static byte[] GzipDecompress(byte[] data)
    {
        using var input = new MemoryStream(data);
        using var gz = new GZipStream(input, CompressionMode.Decompress);
        return ReadCapped(gz);
    }

    [EkkoExport("compress.brotliCompress")]
    public static byte[] BrotliCompress(byte[] data, int level)
    {
        using var output = new MemoryStream();
        using (var br = new BrotliStream(output, MapLevel(level), leaveOpen: true))
            br.Write(data);
        return output.ToArray();
    }

    [EkkoExport("compress.brotliDecompress")]
    public static byte[] BrotliDecompress(byte[] data)
    {
        using var input = new MemoryStream(data);
        using var br = new BrotliStream(input, CompressionMode.Decompress);
        return ReadCapped(br);
    }

    [EkkoExport("compress.deflateCompress")]
    public static byte[] DeflateCompress(byte[] data, int level)
    {
        using var output = new MemoryStream();
        using (var df = new DeflateStream(output, MapLevel(level), leaveOpen: true))
            df.Write(data);
        return output.ToArray();
    }

    [EkkoExport("compress.deflateDecompress")]
    public static byte[] DeflateDecompress(byte[] data)
    {
        using var input = new MemoryStream(data);
        using var df = new DeflateStream(input, CompressionMode.Decompress);
        return ReadCapped(df);
    }

    [EkkoExport("compress.createStream")]
    public static int CreateStream(string algorithm, string mode, int level)
    {
        var wrapper = new CompressStreamWrapper(algorithm, mode == "compress", level);
        return HandleTable.Register(wrapper);
    }

    [EkkoExport("compress.streamWrite")]
    public static void StreamWrite(int handle, byte[] chunk)
    {
        var w = HandleTable.Get<CompressStreamWrapper>(handle);
        w.Write(chunk);
    }

    [EkkoExport("compress.streamFinish")]
    public static byte[] StreamFinish(int handle)
    {
        var w = HandleTable.Get<CompressStreamWrapper>(handle);
        var result = w.Finish();
        HandleTable.Release(handle);
        return result;
    }

    private static CompressionLevel MapLevel(int level)
    {
        return level switch
        {
            1 => CompressionLevel.Fastest,
            2 => CompressionLevel.Optimal,
            3 => CompressionLevel.SmallestSize,
            _ => CompressionLevel.Optimal,
        };
    }

    
    internal const long MaxDecompressedBytes = 256L * 1024 * 1024; 

    internal static byte[] ReadCapped(Stream decompressor)
    {
        using var output = new MemoryStream();
        var buf = new byte[81920];
        long total = 0;
        int n;
        while ((n = decompressor.Read(buf, 0, buf.Length)) > 0)
        {
            total += n;
            if (total > MaxDecompressedBytes)
                throw new InvalidOperationException(
                    $"compress: decompressed output exceeds {MaxDecompressedBytes} bytes (possible decompression bomb)");
            output.Write(buf, 0, n);
        }
        return output.ToArray();
    }
}

internal class CompressStreamWrapper : IDisposable
{
    private readonly MemoryStream _buffer;
    private readonly Stream _compressionStream;
    private readonly bool _isCompress;
    private readonly MemoryStream? _decompressInput;

    public CompressStreamWrapper(string algorithm, bool compress, int level)
    {
        _isCompress = compress;
        if (compress)
        {
            _buffer = new MemoryStream();
            _compressionStream = algorithm switch
            {
                "gzip" => new GZipStream(_buffer, MapLevelInternal(level), leaveOpen: true),
                "brotli" => new BrotliStream(_buffer, MapLevelInternal(level), leaveOpen: true),
                "deflate" => new DeflateStream(_buffer, MapLevelInternal(level), leaveOpen: true),
                _ => throw new ArgumentException($"Unknown algorithm: {algorithm}"),
            };
        }
        else
        {
            _decompressInput = new MemoryStream();
            _buffer = new MemoryStream();
            _compressionStream = algorithm switch
            {
                "gzip" => new GZipStream(_decompressInput, CompressionMode.Decompress, leaveOpen: true),
                "brotli" => new BrotliStream(_decompressInput, CompressionMode.Decompress, leaveOpen: true),
                "deflate" => new DeflateStream(_decompressInput, CompressionMode.Decompress, leaveOpen: true),
                _ => throw new ArgumentException($"Unknown algorithm: {algorithm}"),
            };
        }
    }

    private static CompressionLevel MapLevelInternal(int level) => level switch
    {
        1 => CompressionLevel.Fastest,
        2 => CompressionLevel.Optimal,
        3 => CompressionLevel.SmallestSize,
        _ => CompressionLevel.Optimal,
    };

    public void Write(byte[] chunk)
    {
        if (_isCompress)
        {
            _compressionStream.Write(chunk);
        }
        else
        {
            _decompressInput!.Write(chunk);
        }
    }

    public byte[] Finish()
    {
        if (_isCompress)
        {
            _compressionStream.Dispose();
            return _buffer.ToArray();
        }
        else
        {
            _decompressInput!.Position = 0;
            return CompressApi.ReadCapped(_compressionStream);   
        }
    }

    public void Dispose()
    {
        _compressionStream.Dispose();
        _buffer.Dispose();
        _decompressInput?.Dispose();
    }
}
