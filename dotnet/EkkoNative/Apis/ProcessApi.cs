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
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

public static class ProcessApi
{
    private static nint _callbackPtr;
    private static long _callbackContext;

    
    private static readonly Encoding Utf8NoBom = new UTF8Encoding(false);

    private static readonly HashSet<string> DangerousEnvVars = new(StringComparer.OrdinalIgnoreCase)
    {
        "LD_PRELOAD", "LD_LIBRARY_PATH", "DYLD_INSERT_LIBRARIES", "DYLD_LIBRARY_PATH",
        "DYLD_FRAMEWORK_PATH", "PATH", "COMSPEC", "SHELL", "IFS",
        "LD_AUDIT", "LD_PROFILE", "LD_DEBUG"
    };

    [EkkoExport("process.registerCallback")]
    public static void RegisterCallback(nint callbackPtr, long context)
    {
        _callbackPtr = callbackPtr;
        _callbackContext = context;
    }

    [EkkoExport("process.exec")]
    public static async Task<string> Exec(string cmd, string argsJson, string cwd, string envJson, int timeoutMs)
    {
        var psi = new ProcessStartInfo(cmd)
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,

            
            StandardOutputEncoding = Utf8NoBom,
            StandardErrorEncoding = Utf8NoBom,
        };

        if (!string.IsNullOrEmpty(cwd)) psi.WorkingDirectory = cwd;

        if (!string.IsNullOrEmpty(argsJson) && argsJson != "[]")
        {
            foreach (var arg in ParseJsonStringArray(argsJson))
                psi.ArgumentList.Add(arg);
        }

        if (!string.IsNullOrEmpty(envJson) && envJson != "{}")
        {
            foreach (var (key, val) in ParseJsonStringDict(envJson))
            {
                if (DangerousEnvVars.Contains(key))
                {
                    Console.Error.WriteLine($"[security] process: blocked dangerous env var '{key}'");
                    continue;
                }
                psi.Environment[key] = val;
            }
        }

        using var process = Process.Start(psi)!;
        using var cts = timeoutMs > 0 ? new CancellationTokenSource(timeoutMs) : new CancellationTokenSource();

        try
        {
            var stdoutTask = process.StandardOutput.ReadToEndAsync(cts.Token);
            var stderrTask = process.StandardError.ReadToEndAsync(cts.Token);
            await process.WaitForExitAsync(cts.Token);
            var stdout = await stdoutTask;
            var stderr = await stderrTask;

            var sb = new StringBuilder();
            sb.Append("{\"stdout\":\"");
            sb.Append(EscapeJson(stdout));
            sb.Append("\",\"stderr\":\"");
            sb.Append(EscapeJson(stderr));
            sb.Append("\",\"exitCode\":");
            sb.Append(process.ExitCode);
            sb.Append('}');
            return sb.ToString();
        }
        catch (OperationCanceledException)
        {
            try { process.Kill(entireProcessTree: true); } catch {}
            return "{\"stdout\":\"\",\"stderr\":\"Process timed out\",\"exitCode\":-1}";
        }
    }

    [EkkoExport("process.spawn")]
    public static int Spawn(string cmd, string argsJson, string cwd, string envJson)
    {
        var psi = new ProcessStartInfo(cmd)
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            RedirectStandardInput = true,
            UseShellExecute = false,
            CreateNoWindow = true,

            StandardOutputEncoding = Utf8NoBom,
            StandardErrorEncoding = Utf8NoBom,
            StandardInputEncoding = Utf8NoBom,
        };

        if (!string.IsNullOrEmpty(cwd)) psi.WorkingDirectory = cwd;

        if (!string.IsNullOrEmpty(argsJson) && argsJson != "[]")
        {
            foreach (var arg in ParseJsonStringArray(argsJson))
                psi.ArgumentList.Add(arg);
        }

        if (!string.IsNullOrEmpty(envJson) && envJson != "{}")
        {
            foreach (var (key, val) in ParseJsonStringDict(envJson))
            {
                if (DangerousEnvVars.Contains(key))
                {
                    Console.Error.WriteLine($"[security] process: blocked dangerous env var '{key}'");
                    continue;
                }
                psi.Environment[key] = val;
            }
        }

        var process = Process.Start(psi)!;
        var handle = HandleTable.Register(process);

        _ = Task.Run(async () =>
        {
            var buf = new byte[4096];
            var stream = process.StandardOutput.BaseStream;
            try
            {
                int bytesRead;
                while ((bytesRead = await stream.ReadAsync(buf, 0, buf.Length)) > 0)
                {
                    var b64 = Convert.ToBase64String(buf, 0, bytesRead);
                    NotifyBridge("{\"type\":\"process_stdout\",\"handle\":" + handle + ",\"data\":\"" + b64 + "\"}");
                }
            }
            catch {}
        });

        _ = Task.Run(async () =>
        {
            var buf = new byte[4096];
            var stream = process.StandardError.BaseStream;
            try
            {
                int bytesRead;
                while ((bytesRead = await stream.ReadAsync(buf, 0, buf.Length)) > 0)
                {
                    var b64 = Convert.ToBase64String(buf, 0, bytesRead);
                    NotifyBridge("{\"type\":\"process_stderr\",\"handle\":" + handle + ",\"data\":\"" + b64 + "\"}");
                }
            }
            catch {}
        });

        _ = Task.Run(async () =>
        {
            await process.WaitForExitAsync();
            NotifyBridge("{\"type\":\"process_exit\",\"handle\":" + handle + ",\"code\":" + process.ExitCode + "}");
        });

        return handle;
    }

    [EkkoExport("process.spawnWrite")]
    public static void SpawnWrite(int handle, byte[] data)
    {
        var p = HandleTable.Get<Process>(handle);
        p.StandardInput.BaseStream.Write(data);
        p.StandardInput.BaseStream.Flush();
    }

    [EkkoExport("process.spawnCloseStdin")]
    public static void SpawnCloseStdin(int handle)
    {
        var p = HandleTable.Get<Process>(handle);
        p.StandardInput.Close();
    }

    [EkkoExport("process.spawnPid")]
    public static int SpawnPid(int handle)
    {

        try { return HandleTable.Get<Process>(handle).Id; } catch { return 0; }
    }

    [EkkoExport("process.spawnKill")]
    public static void SpawnKill(int handle)
    {
        var p = HandleTable.Get<Process>(handle);
        try { p.Kill(entireProcessTree: true); } catch {}
    }

    [EkkoExport("process.spawnDispose")]
    public static void SpawnDispose(int handle)
    {
        HandleTable.Release(handle);
    }

    private static void NotifyBridge(string json)
    {
        if (_callbackPtr == 0) return;
        unsafe
        {
            var cb = (delegate* unmanaged<NativeString, long, long, void>)_callbackPtr;
            cb(NativeString.FromManaged(json), 0, _callbackContext);
        }
    }

    private static string EscapeJson(string s)
    {

        
        
        var sb = new StringBuilder(s.Length + 16);
        foreach (var ch in s)
        {
            switch (ch)
            {
                case '\\': sb.Append("\\\\"); break;
                case '"': sb.Append("\\\""); break;
                case '\n': sb.Append("\\n"); break;
                case '\r': sb.Append("\\r"); break;
                case '\t': sb.Append("\\t"); break;
                case '\b': sb.Append("\\b"); break;
                case '\f': sb.Append("\\f"); break;
                default:
                    if (ch < 0x20) sb.Append("\\u").Append(((int)ch).ToString("x4"));
                    else sb.Append(ch);
                    break;
            }
        }
        return sb.ToString();
    }

    

    private static List<string> ParseJsonStringArray(string json)
    {
        var result = new List<string>();
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind == JsonValueKind.Array)
                foreach (var el in doc.RootElement.EnumerateArray())
                    result.Add(el.ValueKind == JsonValueKind.String ? (el.GetString() ?? "") : el.ToString());
        }
        catch (JsonException) {  }
        return result;
    }

    private static List<(string key, string val)> ParseJsonStringDict(string json)
    {
        var result = new List<(string, string)>();
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind == JsonValueKind.Object)
                foreach (var p in doc.RootElement.EnumerateObject())
                    result.Add((p.Name, p.Value.ValueKind == JsonValueKind.String ? (p.Value.GetString() ?? "") : p.Value.ToString()));
        }
        catch (JsonException) {  }
        return result;
    }
}
