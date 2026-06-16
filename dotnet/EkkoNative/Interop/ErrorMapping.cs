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
using System.Net.Sockets;

public static class ErrorMapping
{
    public static (string code, string message) Map(Exception ex, string path = "")
    {
        return ex switch
        {
            FileNotFoundException => ("ENOENT", string.IsNullOrEmpty(path) ? "file not found" : $"file not found: {path}"),
            DirectoryNotFoundException => ("ENOENT", string.IsNullOrEmpty(path) ? "directory not found" : $"directory not found: {path}"),
            UnauthorizedAccessException => ("EACCES", string.IsNullOrEmpty(path) ? "permission denied" : $"permission denied: {path}"),
            IOException io when io.HResult == -2147024784 => ("ENOSPC", "disk full"),
            IOException io when io.HResult == -2147024864 => ("EMFILE", "too many open files"),
            IOException io when io.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase) => ("EEXIST", string.IsNullOrEmpty(path) ? "file already exists" : $"file already exists: {path}"),
            IOException io when io.Message.Contains("not empty", StringComparison.OrdinalIgnoreCase) => ("ENOTEMPTY", string.IsNullOrEmpty(path) ? "directory not empty" : $"directory not empty: {path}"),
            IOException io when io.Message.Contains("is a directory", StringComparison.OrdinalIgnoreCase) => ("EISDIR", string.IsNullOrEmpty(path) ? "is a directory" : $"is a directory: {path}"),
            InvalidOperationException io when io.Message.StartsWith("invalid handle") => ("EBADF", io.Message),
            OperationCanceledException => ("ETIMEDOUT", "operation timed out"),
            ArgumentException => ("EINVAL", ex.Message),
            NotSupportedException => ("ENOTSUP", ex.Message),
            SocketException se => ("ENETWORK", se.SocketErrorCode.ToString()),
            _ => ("EIO", "I/O error"),
        };
    }
}
