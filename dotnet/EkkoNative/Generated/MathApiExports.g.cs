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

public static class MathApiExports
{
    [UnmanagedCallersOnly(EntryPoint = "ekko_math_add")]
    public static unsafe NativeResult EkkoMathAdd(int a, int b)
    {
        try
        {
            var result = MathApi.Add(a, b);
            return NativeResult.OkInt((long)result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_math_multiply")]
    public static unsafe NativeResult EkkoMathMultiply(long a, long b)
    {
        try
        {
            var result = MathApi.Multiply(a, b);
            return NativeResult.OkInt(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_math_divide")]
    public static unsafe NativeResult EkkoMathDivide(double a, double b)
    {
        try
        {
            var result = MathApi.Divide(a, b);
            return NativeResult.OkFloat(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_math_greet")]
    public static unsafe NativeResult EkkoMathGreet(NativeString name)
    {
        try
        {
            var result = MathApi.Greet(name.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_math_slowAdd")]
    public static void EkkoMathSlowadd(long a, long b, nint callbackPtr, long context)
    {
        _ = Task.Run(async () =>
        {
            NativeResult result;
            try
            {
                var r = await MathApi.SlowAdd(a, b);
                result = NativeResult.OkInt(r);
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
