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

public static class EncodingApiExports
{
    [UnmanagedCallersOnly(EntryPoint = "ekko_encoding_base64Encode")]
    public static unsafe NativeResult EkkoEncodingBase64encode(NativeBuffer data)
    {
        try
        {
            var result = EncodingApi.Base64Encode(data.ToArray());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_encoding_base64Decode")]
    public static unsafe NativeResult EkkoEncodingBase64decode(NativeString s)
    {
        try
        {
            var result = EncodingApi.Base64Decode(s.ToManaged());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_encoding_base64UrlEncode")]
    public static unsafe NativeResult EkkoEncodingBase64urlencode(NativeBuffer data)
    {
        try
        {
            var result = EncodingApi.Base64UrlEncode(data.ToArray());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_encoding_base64UrlDecode")]
    public static unsafe NativeResult EkkoEncodingBase64urldecode(NativeString s)
    {
        try
        {
            var result = EncodingApi.Base64UrlDecode(s.ToManaged());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_encoding_hexEncode")]
    public static unsafe NativeResult EkkoEncodingHexencode(NativeBuffer data)
    {
        try
        {
            var result = EncodingApi.HexEncode(data.ToArray());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_encoding_hexDecode")]
    public static unsafe NativeResult EkkoEncodingHexdecode(NativeString s)
    {
        try
        {
            var result = EncodingApi.HexDecode(s.ToManaged());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_encoding_utf8Encode")]
    public static unsafe NativeResult EkkoEncodingUtf8encode(NativeString s)
    {
        try
        {
            var result = EncodingApi.Utf8Encode(s.ToManaged());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_encoding_utf8Decode")]
    public static unsafe NativeResult EkkoEncodingUtf8decode(NativeBuffer data)
    {
        try
        {
            var result = EncodingApi.Utf8Decode(data.ToArray());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_encoding_utf16LeEncode")]
    public static unsafe NativeResult EkkoEncodingUtf16leencode(NativeString s)
    {
        try
        {
            var result = EncodingApi.Utf16LeEncode(s.ToManaged());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_encoding_utf16LeDecode")]
    public static unsafe NativeResult EkkoEncodingUtf16ledecode(NativeBuffer data)
    {
        try
        {
            var result = EncodingApi.Utf16LeDecode(data.ToArray());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_encoding_utf16BeEncode")]
    public static unsafe NativeResult EkkoEncodingUtf16beencode(NativeString s)
    {
        try
        {
            var result = EncodingApi.Utf16BeEncode(s.ToManaged());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_encoding_utf16BeDecode")]
    public static unsafe NativeResult EkkoEncodingUtf16bedecode(NativeBuffer data)
    {
        try
        {
            var result = EncodingApi.Utf16BeDecode(data.ToArray());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

}
