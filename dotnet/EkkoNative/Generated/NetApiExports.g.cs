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

public static class NetApiExports
{
    [UnmanagedCallersOnly(EntryPoint = "ekko_net_tcpWrite")]
    public static unsafe NativeResult EkkoNetTcpwrite(int handle, NativeBuffer data)
    {
        try
        {
            NetApi.TcpWrite(handle, data.ToArray());
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_net_tcpClose")]
    public static unsafe NativeResult EkkoNetTcpclose(int handle)
    {
        try
        {
            NetApi.TcpClose(handle);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_net_tcpListen")]
    public static unsafe NativeResult EkkoNetTcplisten(NativeString host, int port, nint callbackPtr, long context)
    {
        try
        {
            var result = NetApi.TcpListen(host.ToManaged(), port, callbackPtr, context);
            return NativeResult.OkString(result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_net_tcpServerClose")]
    public static unsafe NativeResult EkkoNetTcpserverclose(int handle)
    {
        try
        {
            NetApi.TcpServerClose(handle);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_net_udpCreate")]
    public static unsafe NativeResult EkkoNetUdpcreate(int port)
    {
        try
        {
            var result = NetApi.UdpCreate(port);
            return NativeResult.OkInt((long)result);
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_net_udpSend")]
    public static unsafe NativeResult EkkoNetUdpsend(int handle, NativeBuffer data, NativeString host, int port)
    {
        try
        {
            NetApi.UdpSend(handle, data.ToArray(), host.ToManaged(), port);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_net_udpClose")]
    public static unsafe NativeResult EkkoNetUdpclose(int handle)
    {
        try
        {
            NetApi.UdpClose(handle);
            return NativeResult.OkVoid();
        }
        catch (Exception ex)
        {
            return NativeResult.Err(ex);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_net_tcpConnect")]
    public static void EkkoNetTcpconnect(NativeString host, int port, nint callbackPtr, long context)
    {
        _ = Task.Run(async () =>
        {
            NativeResult result;
            try
            {
                var r = await NetApi.TcpConnect(host.ToManaged(), port);
                result = NativeResult.OkInt((long)r);
            }
            catch (Exception ex)
            {
                result = NativeResult.Err(ex);
            }
            InvokeNativeCallback(callbackPtr, result, context);
        });
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_net_tcpRead")]
    public static void EkkoNetTcpread(int handle, int maxBytes, nint callbackPtr, long context)
    {
        _ = Task.Run(async () =>
        {
            NativeResult result;
            try
            {
                var r = await NetApi.TcpRead(handle, maxBytes);
                result = NativeResult.OkBuffer(r);
            }
            catch (Exception ex)
            {
                result = NativeResult.Err(ex);
            }
            InvokeNativeCallback(callbackPtr, result, context);
        });
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_net_udpRecv")]
    public static void EkkoNetUdprecv(int handle, nint callbackPtr, long context)
    {
        _ = Task.Run(async () =>
        {
            NativeResult result;
            try
            {
                var r = await NetApi.UdpRecv(handle);
                result = NativeResult.OkString(r);
            }
            catch (Exception ex)
            {
                result = NativeResult.Err(ex);
            }
            InvokeNativeCallback(callbackPtr, result, context);
        });
    }

    [UnmanagedCallersOnly(EntryPoint = "ekko_net_dnsResolve")]
    public static void EkkoNetDnsresolve(NativeString hostname, nint callbackPtr, long context)
    {
        _ = Task.Run(async () =>
        {
            NativeResult result;
            try
            {
                var r = await NetApi.DnsResolve(hostname.ToManaged());
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
        ((delegate* unmanaged<NativeResult, long, void>)cbPtr)(result, context);
    }

}
