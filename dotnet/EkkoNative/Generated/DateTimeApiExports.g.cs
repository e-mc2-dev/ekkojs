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

public static class DateTimeApiExports
{
    [UnmanagedCallersOnly(EntryPoint = "ekko_datetime_now")]
    public static unsafe NativeResult EkkoDatetimeNow()
    {
        try
        {
            var result = DateTimeApi.Now();
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_datetime_nowUtc")]
    public static unsafe NativeResult EkkoDatetimeNowutc()
    {
        try
        {
            var result = DateTimeApi.NowUtc();
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_datetime_parse")]
    public static unsafe NativeResult EkkoDatetimeParse(NativeString input, NativeString format)
    {
        try
        {
            var result = DateTimeApi.Parse(input.ToManaged(), format.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_datetime_format")]
    public static unsafe NativeResult EkkoDatetimeFormat(NativeString isoInput, NativeString pattern)
    {
        try
        {
            var result = DateTimeApi.Format(isoInput.ToManaged(), pattern.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_datetime_add")]
    public static unsafe NativeResult EkkoDatetimeAdd(NativeString isoInput, int days, int hours, int minutes, int seconds, int milliseconds)
    {
        try
        {
            var result = DateTimeApi.Add(isoInput.ToManaged(), days, hours, minutes, seconds, milliseconds);
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_datetime_diff")]
    public static unsafe NativeResult EkkoDatetimeDiff(NativeString isoA, NativeString isoB)
    {
        try
        {
            var result = DateTimeApi.Diff(isoA.ToManaged(), isoB.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_datetime_epoch")]
    public static unsafe NativeResult EkkoDatetimeEpoch()
    {
        try
        {
            var result = DateTimeApi.Epoch();
            return NativeResult.OkInt(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_datetime_fromEpoch")]
    public static unsafe NativeResult EkkoDatetimeFromepoch(long epochMs)
    {
        try
        {
            var result = DateTimeApi.FromEpoch(epochMs);
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_timezone_list")]
    public static unsafe NativeResult EkkoTimezoneList()
    {
        try
        {
            var result = DateTimeApi.List();
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_timezone_convert")]
    public static unsafe NativeResult EkkoTimezoneConvert(NativeString isoInput, NativeString zoneId)
    {
        try
        {
            var result = DateTimeApi.Convert(isoInput.ToManaged(), zoneId.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_timezone_info")]
    public static unsafe NativeResult EkkoTimezoneInfo(NativeString zoneId)
    {
        try
        {
            var result = DateTimeApi.Info(zoneId.ToManaged());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }
}
