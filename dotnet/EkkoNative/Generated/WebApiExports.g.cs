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

public static class WebApiExports
{
    [UnmanagedCallersOnly(EntryPoint = "ekko_web_fetchDispose")]
    public static unsafe NativeResult EkkoWebFetchdispose(int handle)
    {
        try
        {
            WebApi.FetchDispose(handle);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_web_httpRequest")]
    public static unsafe NativeResult EkkoWebHttprequest(NativeString url, NativeString method, NativeString headersJson, NativeBuffer body)
    {
        try
        {
            var result = WebApi.HttpRequest(url.ToManaged(), method.ToManaged(), headersJson.ToManaged(), body.ToArray());
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_web_httpRequestBytes")]
    public static unsafe NativeResult EkkoWebHttprequestbytes(NativeString url, NativeString method, NativeString headersJson, NativeBuffer body)
    {
        try
        {
            var result = WebApi.HttpRequestBytes(url.ToManaged(), method.ToManaged(), headersJson.ToManaged(), body.ToArray());
            return NativeResult.OkBuffer(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_web_wsSend")]
    public static unsafe NativeResult EkkoWebWssend(int handle, NativeString data)
    {
        try
        {
            WebApi.WsClientSend(handle, data.ToManaged());
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_web_wsClose")]
    public static unsafe NativeResult EkkoWebWsclose(int handle, int code, NativeString reason)
    {
        try
        {
            WebApi.WsClientClose(handle, code, reason.ToManaged());
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_web_wsStartRecvLoop")]
    public static unsafe NativeResult EkkoWebWsstartrecvloop(int handle, nint callbackPtr, long context)
    {
        try
        {
            WebApi.WsStartRecvLoop(handle, callbackPtr, context);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_web_fetch")]
    public static void EkkoWebFetch(NativeString url, NativeString method, NativeString headersJson, NativeBuffer body, nint callbackPtr, long context)
    {
        _ = Task.Run(async () =>
        {
            NativeResult result;
            try
            {
                var r = await WebApi.Fetch(url.ToManaged(), method.ToManaged(), headersJson.ToManaged(), body.ToArray());
                result = NativeResult.OkString(r);
            }
            catch (Exception ex)
            {
                result = NativeResult.Err(ex);
            }
            InvokeNativeCallback(callbackPtr, result, context);
        });
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_web_fetchBodyText")]
    public static void EkkoWebFetchbodytext(int handle, nint callbackPtr, long context)
    {
        _ = Task.Run(async () =>
        {
            NativeResult result;
            try
            {
                var r = await WebApi.FetchBodyText(handle);
                result = NativeResult.OkString(r);
            }
            catch (Exception ex)
            {
                result = NativeResult.Err(ex);
            }
            InvokeNativeCallback(callbackPtr, result, context);
        });
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_web_fetchBodyBytes")]
    public static void EkkoWebFetchbodybytes(int handle, nint callbackPtr, long context)
    {
        _ = Task.Run(async () =>
        {
            NativeResult result;
            try
            {
                var r = await WebApi.FetchBodyBytes(handle);
                result = NativeResult.OkBuffer(r);
            }
            catch (Exception ex)
            {
                result = NativeResult.Err(ex);
            }
            InvokeNativeCallback(callbackPtr, result, context);
        });
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_web_wsConnect")]
    public static void EkkoWebWsconnect(NativeString url, nint callbackPtr, long context)
    {
        _ = Task.Run(async () =>
        {
            NativeResult result;
            try
            {
                var r = await WebApi.WsConnect(url.ToManaged());
                result = NativeResult.OkInt((long)r);
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
        ((delegate* unmanaged<NativeResult, long, void>)cbPtr)(result, context);
    }

}
