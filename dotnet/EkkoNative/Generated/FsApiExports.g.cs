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

public static class FsApiExports
{
    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_read")]
    public static unsafe NativeResult EkkoFsRead(NativeString path)
    {
        try
        {
            var result = FsApi.Read(path.ToManaged());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_readText")]
    public static unsafe NativeResult EkkoFsReadtext(NativeString path)
    {
        try
        {
            var result = FsApi.ReadText(path.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_readLines")]
    public static unsafe NativeResult EkkoFsReadlines(NativeString path)
    {
        try
        {
            var result = FsApi.ReadLines(path.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_write")]
    public static unsafe NativeResult EkkoFsWrite(NativeString path, NativeBuffer data)
    {
        try
        {
            FsApi.Write(path.ToManaged(), data.ToArray());
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_writeText")]
    public static unsafe NativeResult EkkoFsWritetext(NativeString path, NativeString text)
    {
        try
        {
            FsApi.WriteText(path.ToManaged(), text.ToManaged());
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_append")]
    public static unsafe NativeResult EkkoFsAppend(NativeString path, NativeString text)
    {
        try
        {
            FsApi.Append(path.ToManaged(), text.ToManaged());
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_appendBytes")]
    public static unsafe NativeResult EkkoFsAppendbytes(NativeString path, NativeBuffer data)
    {
        try
        {
            FsApi.AppendBytes(path.ToManaged(), data.ToArray());
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_copy")]
    public static unsafe NativeResult EkkoFsCopy(NativeString src, NativeString dst, int overwrite)
    {
        try
        {
            FsApi.Copy(src.ToManaged(), dst.ToManaged(), overwrite);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_rename")]
    public static unsafe NativeResult EkkoFsRename(NativeString from, NativeString to)
    {
        try
        {
            FsApi.Rename(from.ToManaged(), to.ToManaged());
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_remove")]
    public static unsafe NativeResult EkkoFsRemove(NativeString path, int recursive)
    {
        try
        {
            FsApi.Remove(path.ToManaged(), recursive);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_exists")]
    public static unsafe NativeResult EkkoFsExists(NativeString path)
    {
        try
        {
            var result = FsApi.Exists(path.ToManaged());
            return NativeResult.OkInt(result ? 1 : 0);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_stat")]
    public static unsafe NativeResult EkkoFsStat(NativeString path)
    {
        try
        {
            var result = FsApi.Stat(path.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_chmod")]
    public static unsafe NativeResult EkkoFsChmod(NativeString path, int mode)
    {
        try
        {
            FsApi.Chmod(path.ToManaged(), mode);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_symlink")]
    public static unsafe NativeResult EkkoFsSymlink(NativeString target, NativeString link)
    {
        try
        {
            FsApi.Symlink(target.ToManaged(), link.ToManaged());
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_readlink")]
    public static unsafe NativeResult EkkoFsReadlink(NativeString path)
    {
        try
        {
            var result = FsApi.Readlink(path.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_mkdir")]
    public static unsafe NativeResult EkkoFsMkdir(NativeString path, int recursive)
    {
        try
        {
            FsApi.Mkdir(path.ToManaged(), recursive);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_readDir")]
    public static unsafe NativeResult EkkoFsReaddir(NativeString path, int recursive)
    {
        try
        {
            var result = FsApi.ReadDir(path.ToManaged(), recursive);
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_tempDir")]
    public static unsafe NativeResult EkkoFsTempdir()
    {
        try
        {
            var result = FsApi.TempDir();
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_tempFile")]
    public static unsafe NativeResult EkkoFsTempfile()
    {
        try
        {
            var result = FsApi.TempFile();
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_tempSubdir")]
    public static unsafe NativeResult EkkoFsTempsubdir(NativeString prefix)
    {
        try
        {
            var result = FsApi.TempSubdir(prefix.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_openFile")]
    public static unsafe NativeResult EkkoFsOpenfile(NativeString path, int flags)
    {
        try
        {
            var result = FsApi.OpenFile(path.ToManaged(), flags);
            return NativeResult.OkInt((long)result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_handleRead")]
    public static unsafe NativeResult EkkoFsHandleread(int handle, int count)
    {
        try
        {
            var result = FsApi.HandleRead(handle, count);
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_handleWrite")]
    public static unsafe NativeResult EkkoFsHandlewrite(int handle, NativeBuffer data)
    {
        try
        {
            var result = FsApi.HandleWrite(handle, data.ToArray());
            return NativeResult.OkInt((long)result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_fs_handleClose")]
    public static unsafe NativeResult EkkoFsHandleclose(int handle)
    {
        try
        {
            FsApi.HandleClose(handle);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

}
