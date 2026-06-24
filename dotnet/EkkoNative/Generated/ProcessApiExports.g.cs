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
using System.Threading.Tasks;

public static class ProcessApiExports
{
    [UnmanagedCallersOnly(EntryPoint = "ekko_process_registerCallback")]
    public static unsafe NativeResult EkkoProcessRegistercallback(nint callbackPtr, long context)
    {
        try
        {
            ProcessApi.RegisterCallback(callbackPtr, context);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_process_spawn")]
    public static unsafe NativeResult EkkoProcessSpawn(NativeString cmd, NativeString argsJson, NativeString cwd, NativeString envJson)
    {
        try
        {
            var result = ProcessApi.Spawn(cmd.ToManaged(), argsJson.ToManaged(), cwd.ToManaged(), envJson.ToManaged());
            return NativeResult.OkInt((long)result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_process_spawnWrite")]
    public static unsafe NativeResult EkkoProcessSpawnwrite(int handle, NativeBuffer data)
    {
        try
        {
            ProcessApi.SpawnWrite(handle, data.ToArray());
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_process_spawnCloseStdin")]
    public static unsafe NativeResult EkkoProcessSpawnclosestdin(int handle)
    {
        try
        {
            ProcessApi.SpawnCloseStdin(handle);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_process_spawnPid")]
    public static unsafe NativeResult EkkoProcessSpawnpid(int handle)
    {
        try
        {
            var result = ProcessApi.SpawnPid(handle);
            return NativeResult.OkInt((long)result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_process_spawnKill")]
    public static unsafe NativeResult EkkoProcessSpawnkill(int handle)
    {
        try
        {
            ProcessApi.SpawnKill(handle);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_process_spawnDispose")]
    public static unsafe NativeResult EkkoProcessSpawndispose(int handle)
    {
        try
        {
            ProcessApi.SpawnDispose(handle);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_process_exec")]
    public static void EkkoProcessExec(NativeString cmd, NativeString argsJson, NativeString cwd, NativeString envJson, int timeoutMs, nint callbackPtr, long context)
    {
        _ = Task.Run(async () =>
        {
            NativeResult result;
            try
            {
                var r = await ProcessApi.Exec(cmd.ToManaged(), argsJson.ToManaged(), cwd.ToManaged(), envJson.ToManaged(), timeoutMs);
                result = NativeResult.OkString(r);
            }
            catch (Exception ex)
            {
                result = NativeResult.Err(ex);
            }
            InvokeNativeCallback(callbackPtr, result, context);
        });
    }

    private static unsafe void InvokeNativeCallback(nint cbPtr, NativeResult result, long context)
    {
        if (cbPtr == 0) { Console.Error.WriteLine("[error] null callback pointer in async completion"); return; }
        try { ((delegate* unmanaged<NativeResult, long, void>)cbPtr)(result, context); }
        catch (Exception ex) { Console.Error.WriteLine($"[error] callback invocation failed: {ex.Message}"); }
    }

}
