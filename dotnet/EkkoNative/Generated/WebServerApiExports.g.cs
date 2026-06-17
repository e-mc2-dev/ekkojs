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

public static class WebServerApiExports
{
    [UnmanagedCallersOnly(EntryPoint = "ekko_webserver_registerCallback")]
    public static unsafe NativeResult EkkoWebserverRegistercallback(nint callbackPtr, long context)
    {
        try
        {
            WebServerApi.RegisterCallback(callbackPtr, context);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_webserver_start")]
    public static unsafe NativeResult EkkoWebserverStart(NativeString host, int port, NativeString certPath, NativeString keyPath, NativeString pfxPath, NativeString pfxPassword, int http2, int compression, int maxBodySizeMb, int maxWsMessageSizeKb)
    {
        try
        {
            var result = WebServerApi.Start(host.ToManaged(), port, certPath.ToManaged(), keyPath.ToManaged(), pfxPath.ToManaged(), pfxPassword.ToManaged(), http2, compression, maxBodySizeMb, maxWsMessageSizeKb);
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_webserver_sendResponse")]
    public static unsafe NativeResult EkkoWebserverSendresponse(int requestId, int status, NativeString headersJson, NativeBuffer body)
    {
        try
        {
            WebServerApi.SendResponse(requestId, status, headersJson.ToManaged(), body.ToArray());
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_webserver_wsSend")]
    public static unsafe NativeResult EkkoWebserverWssend(int wsHandle, NativeString data)
    {
        try
        {
            WebServerApi.WsSend(wsHandle, data.ToManaged());
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_webserver_wsClose")]
    public static unsafe NativeResult EkkoWebserverWsclose(int wsHandle, int code)
    {
        try
        {
            WebServerApi.WsServerClose(wsHandle, code);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_webserver_stop")]
    public static unsafe NativeResult EkkoWebserverStop()
    {
        try
        {
            WebServerApi.Stop();
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

}
