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
using System.Text;

public static class EncodingApi
{
    [EkkoExport("encoding.base64Encode")]
    public static string Base64Encode(byte[] data) => Convert.ToBase64String(data);

    [EkkoExport("encoding.base64Decode")]
    public static byte[] Base64Decode(string s) => Convert.FromBase64String(s);

    [EkkoExport("encoding.base64UrlEncode")]
    public static string Base64UrlEncode(byte[] data)
    {
        return Convert.ToBase64String(data).Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    [EkkoExport("encoding.base64UrlDecode")]
    public static byte[] Base64UrlDecode(string s)
    {
        s = s.Replace('-', '+').Replace('_', '/');
        switch (s.Length % 4) { case 2: s += "=="; break; case 3: s += "="; break; }
        return Convert.FromBase64String(s);
    }

    [EkkoExport("encoding.hexEncode")]
    public static string HexEncode(byte[] data) => Convert.ToHexStringLower(data);

    [EkkoExport("encoding.hexDecode")]
    public static byte[] HexDecode(string s) => Convert.FromHexString(s);

    [EkkoExport("encoding.utf8Encode")]
    public static byte[] Utf8Encode(string s) => Encoding.UTF8.GetBytes(s);

    [EkkoExport("encoding.utf8Decode")]
    public static string Utf8Decode(byte[] data) => Encoding.UTF8.GetString(data);

    [EkkoExport("encoding.utf16LeEncode")]
    public static byte[] Utf16LeEncode(string s) => Encoding.Unicode.GetBytes(s);

    [EkkoExport("encoding.utf16LeDecode")]
    public static string Utf16LeDecode(byte[] data) => Encoding.Unicode.GetString(data);

    [EkkoExport("encoding.utf16BeEncode")]
    public static byte[] Utf16BeEncode(string s) => Encoding.BigEndianUnicode.GetBytes(s);

    [EkkoExport("encoding.utf16BeDecode")]
    public static string Utf16BeDecode(byte[] data) => Encoding.BigEndianUnicode.GetString(data);
}
