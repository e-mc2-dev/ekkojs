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

public static class JsonApiExports
{
    [UnmanagedCallersOnly(EntryPoint = "ekko_json_createReader")]
    public static unsafe NativeResult EkkoJsonCreatereader(NativeBuffer data)
    {
        try
        {
            var result = JsonApi.CreateReader(data.ToArray());
            return NativeResult.OkInt((long)result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_json_readerRead")]
    public static unsafe NativeResult EkkoJsonReaderread(int handle)
    {
        try
        {
            var result = JsonApi.ReaderRead(handle);
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_json_readerClose")]
    public static unsafe NativeResult EkkoJsonReaderclose(int handle)
    {
        try
        {
            JsonApi.ReaderClose(handle);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_json_createWriter")]
    public static unsafe NativeResult EkkoJsonCreatewriter()
    {
        try
        {
            var result = JsonApi.CreateWriter();
            return NativeResult.OkInt((long)result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_json_writerWrite")]
    public static unsafe NativeResult EkkoJsonWriterwrite(int handle, NativeString command)
    {
        try
        {
            JsonApi.WriterWrite(handle, command.ToManaged());
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_json_writerFinish")]
    public static unsafe NativeResult EkkoJsonWriterfinish(int handle)
    {
        try
        {
            var result = JsonApi.WriterFinish(handle);
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

}
