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
using System.Text;

public static class FsApi
{

    [EkkoExport("fs.read")]
    public static byte[] Read(string path)
    {
        return File.ReadAllBytes(path);
    }

    [EkkoExport("fs.readText")]
    public static string ReadText(string path)
    {
        return File.ReadAllText(path, Encoding.UTF8);
    }

    [EkkoExport("fs.readLines")]
    public static string ReadLines(string path)
    {
        var lines = File.ReadAllLines(path, Encoding.UTF8);
        var sb = new StringBuilder("[");
        for (int i = 0; i < lines.Length; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append('"').Append(EscapeJson(lines[i])).Append('"');
        }
        sb.Append(']');
        return sb.ToString();
    }

    [EkkoExport("fs.write")]
    public static void Write(string path, byte[] data)
    {
        File.WriteAllBytes(path, data);
    }

    [EkkoExport("fs.writeText")]
    public static void WriteText(string path, string text)
    {
        File.WriteAllText(path, text, Encoding.UTF8);
    }

    [EkkoExport("fs.append")]
    public static void Append(string path, string text)
    {
        File.AppendAllText(path, text, Encoding.UTF8);
    }

    [EkkoExport("fs.appendBytes")]
    public static void AppendBytes(string path, byte[] data)
    {
        using var stream = new FileStream(path, FileMode.Append, FileAccess.Write);
        stream.Write(data, 0, data.Length);
    }

    [EkkoExport("fs.copy")]
    public static void Copy(string src, string dst, int overwrite)
    {
        File.Copy(src, dst, overwrite != 0);
    }

    [EkkoExport("fs.rename")]
    public static void Rename(string from, string to)
    {
        File.Move(from, to, true);
    }

    [EkkoExport("fs.remove")]
    public static void Remove(string path, int recursive)
    {
        if (File.Exists(path))
            File.Delete(path);
        else if (Directory.Exists(path))
            Directory.Delete(path, recursive != 0);
    }

    [EkkoExport("fs.exists")]
    public static bool Exists(string path)
    {
        return File.Exists(path) || Directory.Exists(path);
    }

    [EkkoExport("fs.stat")]
    public static string Stat(string path)
    {
        if (File.Exists(path))
        {
            var info = new FileInfo(path);
            int mode = 0;
            if (!OperatingSystem.IsWindows()) mode = (int)File.GetUnixFileMode(path);
            return BuildStatJson(info.Name, info.FullName, info.Length, true, false,
                info.LinkTarget != null, info.CreationTimeUtc, info.LastWriteTimeUtc,
                info.LastAccessTimeUtc, mode, info.IsReadOnly,
                info.Attributes.HasFlag(FileAttributes.Hidden));
        }
        else if (Directory.Exists(path))
        {
            var info = new DirectoryInfo(path);
            int mode = 0;
            if (!OperatingSystem.IsWindows()) mode = (int)File.GetUnixFileMode(path);
            return BuildStatJson(info.Name, info.FullName, 0, false, true,
                info.LinkTarget != null, info.CreationTimeUtc, info.LastWriteTimeUtc,
                info.LastAccessTimeUtc, mode, false,
                info.Attributes.HasFlag(FileAttributes.Hidden));
        }
        throw new FileNotFoundException("not found", path);
    }

    private static string BuildStatJson(string name, string fullPath, long size,
        bool isFile, bool isDirectory, bool isSymlink,
        DateTime created, DateTime modified, DateTime accessed,
        int mode, bool readOnly, bool hidden)
    {
        var sb = new StringBuilder(256);
        sb.Append("{\"name\":\"").Append(EscapeJson(name))
          .Append("\",\"path\":\"").Append(EscapeJson(fullPath))
          .Append("\",\"size\":").Append(size)
          .Append(",\"isFile\":").Append(isFile ? "true" : "false")
          .Append(",\"isDirectory\":").Append(isDirectory ? "true" : "false")
          .Append(",\"isSymlink\":").Append(isSymlink ? "true" : "false")
          .Append(",\"created\":").Append(new DateTimeOffset(created, TimeSpan.Zero).ToUnixTimeMilliseconds())
          .Append(",\"modified\":").Append(new DateTimeOffset(modified, TimeSpan.Zero).ToUnixTimeMilliseconds())
          .Append(",\"accessed\":").Append(new DateTimeOffset(accessed, TimeSpan.Zero).ToUnixTimeMilliseconds())
          .Append(",\"mode\":").Append(mode)
          .Append(",\"readonly\":").Append(readOnly ? "true" : "false")
          .Append(",\"hidden\":").Append(hidden ? "true" : "false")
          .Append('}');
        return sb.ToString();
    }

    private static string EscapeJson(string s)
    {

        var sb = new StringBuilder(s.Length + 16);
        foreach (var c in s)
        {
            switch (c)
            {
                case '\\': sb.Append("\\\\"); break;
                case '"': sb.Append("\\\""); break;
                case '\n': sb.Append("\\n"); break;
                case '\r': sb.Append("\\r"); break;
                case '\t': sb.Append("\\t"); break;
                case '\b': sb.Append("\\b"); break;
                case '\f': sb.Append("\\f"); break;
                default:
                    if (c < 0x20) sb.Append("\\u").Append(((int)c).ToString("x4"));
                    else sb.Append(c);
                    break;
            }
        }
        return sb.ToString();
    }

    [EkkoExport("fs.chmod")]
    public static void Chmod(string path, int mode)
    {
        if (!OperatingSystem.IsWindows())
            File.SetUnixFileMode(path, (UnixFileMode)mode);
    }

    

    [EkkoExport("fs.symlink")]
    public static void Symlink(string target, string link)
    {
        File.CreateSymbolicLink(link, target);
    }

    [EkkoExport("fs.readlink")]
    public static string Readlink(string path)
    {
        var target = File.ResolveLinkTarget(path, false);
        return target?.FullName ?? throw new FileNotFoundException("not a symlink", path);
    }

    [EkkoExport("fs.mkdir")]
    public static void Mkdir(string path, int recursive)
    {
        if (recursive != 0)
            Directory.CreateDirectory(path);
        else
            Directory.CreateDirectory(path);
    }

    [EkkoExport("fs.readDir")]
    public static string ReadDir(string path, int recursive)
    {
        var option = recursive != 0 ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly;
        var entries = Directory.EnumerateFileSystemEntries(path, "*", option);
        var sb = new StringBuilder("[");
        bool first = true;
        foreach (var entry in entries)
        {
            if (!first) sb.Append(',');
            first = false;
            var isDir = Directory.Exists(entry);
            var name = Path.GetFileName(entry);
            var full = Path.GetFullPath(entry);
            sb.Append("{\"name\":\"").Append(EscapeJson(name))
              .Append("\",\"path\":\"").Append(EscapeJson(full))
              .Append("\",\"isFile\":").Append(!isDir ? "true" : "false")
              .Append(",\"isDirectory\":").Append(isDir ? "true" : "false")
              .Append(",\"isSymlink\":false}");
        }
        sb.Append(']');
        return sb.ToString();
    }

    [EkkoExport("fs.tempDir")]
    public static string TempDir()
    {
        return Path.GetTempPath();
    }

    [EkkoExport("fs.tempFile")]
    public static string TempFile()
    {
        return Path.GetTempFileName();
    }

    [EkkoExport("fs.tempSubdir")]
    public static string TempSubdir(string prefix)
    {
        var dir = Directory.CreateTempSubdirectory(prefix);
        return dir.FullName;
    }

    [EkkoExport("fs.openFile")]
    public static int OpenFile(string path, int flags)
    {
        var mode = (flags & 0x04) != 0 ? FileMode.OpenOrCreate :
                   (flags & 0x08) != 0 ? FileMode.Create :
                   (flags & 0x10) != 0 ? FileMode.Append :
                   (flags & 0x20) != 0 ? FileMode.CreateNew :
                   FileMode.Open;
        var access = ((flags & 0x01) != 0 && (flags & 0x02) != 0) ? FileAccess.ReadWrite :
                     (flags & 0x02) != 0 ? FileAccess.Write :
                     FileAccess.Read;
        var stream = new FileStream(path, mode, access, FileShare.Read);
        return HandleTable.Register(stream);
    }

    [EkkoExport("fs.handleRead")]
    public static byte[] HandleRead(int handle, int count)
    {
        var stream = HandleTable.Get<FileStream>(handle);
        var buffer = new byte[count];
        int bytesRead = stream.Read(buffer, 0, count);
        if (bytesRead < count)
            Array.Resize(ref buffer, bytesRead);
        return buffer;
    }

    [EkkoExport("fs.handleWrite")]
    public static int HandleWrite(int handle, byte[] data)
    {
        var stream = HandleTable.Get<FileStream>(handle);
        stream.Write(data, 0, data.Length);
        return data.Length;
    }

    [EkkoExport("fs.handleClose")]
    public static void HandleClose(int handle)
    {
        HandleTable.Release(handle);
    }
}
