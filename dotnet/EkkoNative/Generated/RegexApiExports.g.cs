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

public static class RegexApiExports
{
    [UnmanagedCallersOnly(EntryPoint = "ekko_regex_create")]
    public static unsafe NativeResult EkkoRegexCreate(NativeString pattern, NativeString flags)
    {
        try
        {
            var result = RegexApi.Create(pattern.ToManaged(), flags.ToManaged());
            return NativeResult.OkInt((long)result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_regex_test")]
    public static unsafe NativeResult EkkoRegexTest(int handle, NativeString input)
    {
        try
        {
            var result = RegexApi.Test(handle, input.ToManaged());
            return NativeResult.OkInt((long)result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_regex_match")]
    public static unsafe NativeResult EkkoRegexMatch(int handle, NativeString input)
    {
        try
        {
            var result = RegexApi.Match(handle, input.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_regex_matchAll")]
    public static unsafe NativeResult EkkoRegexMatchall(int handle, NativeString input)
    {
        try
        {
            var result = RegexApi.MatchAll(handle, input.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_regex_replace")]
    public static unsafe NativeResult EkkoRegexReplace(int handle, NativeString input, NativeString replacement)
    {
        try
        {
            var result = RegexApi.Replace(handle, input.ToManaged(), replacement.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_regex_split")]
    public static unsafe NativeResult EkkoRegexSplit(int handle, NativeString input)
    {
        try
        {
            var result = RegexApi.Split(handle, input.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_regex_dispose")]
    public static unsafe NativeResult EkkoRegexDispose(int handle)
    {
        try
        {
            RegexApi.Dispose(handle);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

}
