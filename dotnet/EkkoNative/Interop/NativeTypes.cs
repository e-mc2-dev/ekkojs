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
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;

[StructLayout(LayoutKind.Sequential)]
public unsafe struct NativeString
{
    public byte* Ptr;
    public int Len;

    public string ToManaged()
    {
        if (Ptr == null || Len <= 0) return string.Empty;
        return Encoding.UTF8.GetString(Ptr, Len);
    }

    public static NativeString FromManaged(string s)
    {
        var bytes = Encoding.UTF8.GetBytes(s);
        if (bytes.Length == 0) return new NativeString { Ptr = null, Len = 0 };
        var ptr = (byte*)Marshal.AllocCoTaskMem(bytes.Length);
        if (ptr == null) throw new OutOfMemoryException($"AllocCoTaskMem failed for {bytes.Length} bytes");
        Marshal.Copy(bytes, 0, (IntPtr)ptr, bytes.Length);
        return new NativeString { Ptr = ptr, Len = bytes.Length };
    }

    public void Free()
    {
        if (Ptr != null && Len > 0)
        {
            Unsafe.InitBlock(Ptr, 0, (uint)Len);
            Marshal.FreeCoTaskMem((IntPtr)Ptr);
        }
    }
}

[StructLayout(LayoutKind.Sequential)]
public unsafe struct NativeBuffer
{
    public byte* Ptr;
    public int Len;

    public ReadOnlySpan<byte> ToSpan() => (Ptr == null || Len <= 0) ? ReadOnlySpan<byte>.Empty : new ReadOnlySpan<byte>(Ptr, Len);

    public byte[] ToArray()
    {
        if (Ptr == null || Len <= 0) return Array.Empty<byte>();
        var arr = new byte[Len];
        new ReadOnlySpan<byte>(Ptr, Len).CopyTo(arr);
        return arr;
    }

    public static NativeBuffer FromManaged(byte[] data)
    {
        if (data.Length == 0) return new NativeBuffer { Ptr = null, Len = 0 };
        var ptr = (byte*)Marshal.AllocCoTaskMem(data.Length);
        if (ptr == null) throw new OutOfMemoryException($"AllocCoTaskMem failed for {data.Length} bytes");
        Marshal.Copy(data, 0, (IntPtr)ptr, data.Length);
        return new NativeBuffer { Ptr = ptr, Len = data.Length };
    }

    public void Free()
    {
        if (Ptr != null && Len > 0)
        {
            Unsafe.InitBlock(Ptr, 0, (uint)Len);
            Marshal.FreeCoTaskMem((IntPtr)Ptr);
        }
    }
}

[StructLayout(LayoutKind.Sequential)]
public struct NativeResult
{
    public byte IsOk;
    public long IntValue;
    public double FloatValue;
    public NativeString StringValue;
    public NativeBuffer BufferValue;
    public NativeString ErrorCode;
    public NativeString ErrorMessage;
    public int HandleValue;

    public static NativeResult OkInt(long v) => new() { IsOk = 1, IntValue = v };
    public static NativeResult OkFloat(double v) => new() { IsOk = 1, FloatValue = v };
    public static NativeResult OkString(string v) => new() { IsOk = 1, StringValue = NativeString.FromManaged(v) };
    public static NativeResult OkBuffer(byte[] v) => new() { IsOk = 1, BufferValue = NativeBuffer.FromManaged(v) };
    public static NativeResult OkHandle(int h) => new() { IsOk = 1, HandleValue = h };
    public static NativeResult OkVoid() => new() { IsOk = 1 };

    public static NativeResult Err(Exception ex, string path = "")
    {
        var (code, message) = ErrorMapping.Map(ex, path);
        return new() { IsOk = 0, ErrorCode = NativeString.FromManaged(code), ErrorMessage = NativeString.FromManaged(message) };
    }
}
