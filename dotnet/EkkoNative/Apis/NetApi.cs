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
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

public static class NetApi
{

    [EkkoExport("net.tcpConnect")]
    public static async Task<int> TcpConnect(string host, int port)
    {
        var client = new TcpClient();
        await client.ConnectAsync(host, port);
        return HandleTable.Register(client);
    }

    [EkkoExport("net.tcpWrite")]
    public static void TcpWrite(int handle, byte[] data)
    {
        var client = HandleTable.Get<TcpClient>(handle);
        client.GetStream().Write(data, 0, data.Length);
    }

    [EkkoExport("net.tcpRead")]
    public static async Task<byte[]> TcpRead(int handle, int maxBytes)
    {
        var client = HandleTable.Get<TcpClient>(handle);
        var buf = new byte[maxBytes > 0 ? maxBytes : 4096];
        var n = await client.GetStream().ReadAsync(buf, 0, buf.Length);
        if (n == 0) return Array.Empty<byte>();
        var result = new byte[n];
        Buffer.BlockCopy(buf, 0, result, 0, n);
        return result;
    }

    [EkkoExport("net.tcpClose")]
    public static void TcpClose(int handle)
    {
        HandleTable.Release(handle);
    }

    [EkkoExport("net.tcpListen")]
    public static string TcpListen(string host, int port, nint callbackPtr, long context)
    {
        
        IPAddress addr = host == "localhost" ? IPAddress.Loopback
                       : (IPAddress.TryParse(host, out var parsed) ? parsed : IPAddress.Any);
        var listener = new TcpListener(addr, port);
        listener.Start();
        var handle = HandleTable.Register(listener);

        _ = Task.Run(async () =>
        {
            try
            {
                while (true)
                {
                    var client = await listener.AcceptTcpClientAsync();
                    var connHandle = HandleTable.Register(client);
                    var ep = client.Client.RemoteEndPoint as IPEndPoint;

                    var json = "{\"type\":\"tcp_connect\",\"server\":" + handle + ",\"handle\":" + connHandle + ",\"ip\":\"" + (ep?.Address.ToString() ?? "") + "\",\"port\":" + (ep?.Port ?? 0) + "}";
                    if (callbackPtr != 0)
                    {
                        try { unsafe { ((delegate* unmanaged<NativeString, long, long, void>)callbackPtr)(NativeString.FromManaged(json), 0, context); } }
                        catch (Exception ex) { Console.Error.WriteLine($"[error] tcp accept callback failed: {ex.Message}"); }
                    }
                }
            }
            catch (SocketException ex) { Console.Error.WriteLine("[tcp] accept loop socket error: " + ex.Message); }
            catch (ObjectDisposedException) { }
        });

        
        return handle.ToString();
    }

    [EkkoExport("net.tcpServerClose")]
    public static void TcpServerClose(int handle)
    {
        var listener = HandleTable.Get<TcpListener>(handle);
        listener.Stop();
        HandleTable.Release(handle);
    }

    [EkkoExport("net.udpCreate")]
    public static int UdpCreate(int port)
    {
        var udp = port > 0 ? new UdpClient(port) : new UdpClient();
        return HandleTable.Register(udp);
    }

    [EkkoExport("net.udpSend")]
    public static void UdpSend(int handle, byte[] data, string host, int port)
    {
        var udp = HandleTable.Get<UdpClient>(handle);
        udp.Send(data, data.Length, host, port);
    }

    [EkkoExport("net.udpRecv")]
    public static async Task<string> UdpRecv(int handle)
    {
        var udp = HandleTable.Get<UdpClient>(handle);
        var result = await udp.ReceiveAsync();
        var dataB64 = Convert.ToBase64String(result.Buffer);
        var ep = result.RemoteEndPoint;
        
        return "{\"data\":\"" + dataB64 + "\",\"address\":\"" + ep.Address + "\",\"port\":" + ep.Port + "}";
    }

    [EkkoExport("net.udpClose")]
    public static void UdpClose(int handle)
    {
        HandleTable.Release(handle);
    }

    [EkkoExport("net.dnsResolve")]
    public static async Task<string> DnsResolve(string hostname)
    {
        var addrs = await Dns.GetHostAddressesAsync(hostname);
        var sb = new StringBuilder("[");
        for (int i = 0; i < addrs.Length; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append('"').Append(addrs[i].ToString()).Append('"');
        }
        sb.Append(']');
        return sb.ToString();
    }
}
