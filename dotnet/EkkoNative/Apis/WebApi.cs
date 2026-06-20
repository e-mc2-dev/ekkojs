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
using System.Linq;
using System.Net.Http;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

public static class WebApi
{
    private static readonly HttpClient _client = new HttpClient(new SocketsHttpHandler
    {
        PooledConnectionLifetime = TimeSpan.FromMinutes(10),
    })
    {
        DefaultRequestHeaders = { ExpectContinue = false },
    };

    [EkkoExport("web.fetch")]
    public static async Task<string> Fetch(string url, string method, string headersJson, byte[] body)
    {
        var req = new HttpRequestMessage(new HttpMethod(method ?? "GET"), url);

        if (body != null && body.Length > 0)
            req.Content = new ByteArrayContent(body);

        ApplyJsonHeaders(req, headersJson);

        var res = await _client.SendAsync(req);
        var handle = HandleTable.Register(res);

        var sb = new StringBuilder();
        sb.Append("{\"_handle\":").Append(handle);
        sb.Append(",\"status\":").Append((int)res.StatusCode);
        sb.Append(",\"statusText\":\"").Append(EscapeJson(res.ReasonPhrase ?? "")).Append('"');
        sb.Append(",\"ok\":").Append(res.IsSuccessStatusCode ? "true" : "false");
        sb.Append(",\"headers\":{");
        bool first = true;
        IEnumerable<KeyValuePair<string, IEnumerable<string>>> allHeaders = res.Headers;
        if (res.Content?.Headers != null)
            allHeaders = allHeaders.Concat(res.Content.Headers);
        foreach (var h in allHeaders)
        {
            if (!first) sb.Append(',');
            sb.Append('"').Append(EscapeJson(h.Key.ToLowerInvariant())).Append("\":\"");
            sb.Append(EscapeJson(string.Join(", ", h.Value))).Append('"');
            first = false;
        }
        sb.Append("}}");
        return sb.ToString();
    }

    [EkkoExport("web.fetchBodyText")]
    public static async Task<string> FetchBodyText(int handle)
    {
        var res = HandleTable.Get<HttpResponseMessage>(handle);
        return await res.Content.ReadAsStringAsync();
    }

    [EkkoExport("web.fetchBodyBytes")]
    public static async Task<byte[]> FetchBodyBytes(int handle)
    {
        var res = HandleTable.Get<HttpResponseMessage>(handle);
        return await res.Content.ReadAsByteArrayAsync();
    }

    [EkkoExport("web.fetchDispose")]
    public static void FetchDispose(int handle)
    {
        HandleTable.Release(handle);
    }

    [EkkoExport("web.httpRequest")]
    public static string HttpRequest(string url, string method, string headersJson, byte[] body)
    {
        try
        {
            var handler = new SocketsHttpHandler
            {
                PooledConnectionLifetime = TimeSpan.FromMinutes(5),
            };
            using var client = new HttpClient(handler);
            var req = new HttpRequestMessage(new HttpMethod(method ?? "GET"), url);

            if (body != null && body.Length > 0)
                req.Content = new ByteArrayContent(body);

            ApplyJsonHeaders(req, headersJson);

            var res = client.SendAsync(req).GetAwaiter().GetResult();
            var statusCode = (int)res.StatusCode;
            var bodyText = res.Content.ReadAsStringAsync().GetAwaiter().GetResult();
            var bodyBytes = res.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult();

            var sb = new StringBuilder();
            sb.Append("{\"status\":").Append(statusCode);
            sb.Append(",\"ok\":").Append(res.IsSuccessStatusCode ? "true" : "false");
            sb.Append(",\"body\":\"").Append(EscapeJson(bodyText)).Append('"');
            sb.Append(",\"headers\":{");
            bool first = true;
            IEnumerable<KeyValuePair<string, IEnumerable<string>>> allHeaders = res.Headers;
            if (res.Content?.Headers != null)
                allHeaders = allHeaders.Concat(res.Content.Headers);
            foreach (var h in allHeaders)
            {
                if (!first) sb.Append(',');
                sb.Append('"').Append(EscapeJson(h.Key.ToLowerInvariant())).Append("\":\"");
                sb.Append(EscapeJson(string.Join(", ", h.Value))).Append('"');
                first = false;
            }
            sb.Append("}}");
            return sb.ToString();
        }
        catch (Exception ex)
        {
            return "{\"status\":0,\"ok\":false,\"body\":\"" + EscapeJson(ex.Message) + "\",\"headers\":{}}";
        }
    }

    [EkkoExport("web.httpRequestBytes")]
    public static byte[] HttpRequestBytes(string url, string method, string headersJson, byte[] body)
    {
        try
        {
            var handler = new SocketsHttpHandler();
            using var client = new HttpClient(handler);
            var req = new HttpRequestMessage(new HttpMethod(method ?? "GET"), url);

            if (body != null && body.Length > 0)
                req.Content = new ByteArrayContent(body);

            ApplyJsonHeaders(req, headersJson);

            var res = client.SendAsync(req).GetAwaiter().GetResult();
            if (!res.IsSuccessStatusCode)
                return Array.Empty<byte>();
            return res.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult();
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    [EkkoExport("web.wsConnect")]
    public static async Task<int> WsConnect(string url)
    {
        var ws = new ClientWebSocket();
        await ws.ConnectAsync(new Uri(url), CancellationToken.None);
        return HandleTable.Register(ws);
    }

    [EkkoExport("web.wsSend")]
    public static void WsClientSend(int handle, string data)
    {
        var ws = HandleTable.Get<ClientWebSocket>(handle);
        var bytes = Encoding.UTF8.GetBytes(data);
        ws.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None).GetAwaiter().GetResult();
    }

    [EkkoExport("web.wsClose")]
    public static void WsClientClose(int handle, int code, string reason)
    {
        var ws = HandleTable.Get<ClientWebSocket>(handle);
        try { ws.CloseAsync((WebSocketCloseStatus)code, reason ?? "", CancellationToken.None).GetAwaiter().GetResult(); } catch {}
        HandleTable.Release(handle);
    }

    [EkkoExport("web.wsStartRecvLoop")]
    public static void WsStartRecvLoop(int handle, nint callbackPtr, long context)
    {
        var ws = HandleTable.Get<ClientWebSocket>(handle);
        _ = Task.Run(async () => {
            var buffer = new byte[4096];
            const long wsMaxMessage = 64L * 1024L;
            try {
                while (ws.State == WebSocketState.Open) {
                    using var ms = new System.IO.MemoryStream();
                    WebSocketReceiveResult result;
                    do {
                        result = await ws.ReceiveAsync(buffer, CancellationToken.None);
                        if (result.MessageType == WebSocketMessageType.Close) break;
                        ms.Write(buffer, 0, result.Count);
                        if (ms.Length > wsMaxMessage) {
                            var errJson = "{\"type\":\"ws_error\",\"wsHandle\":" + handle + ",\"error\":\"WebSocket message exceeds 64KB limit\"}";
                            unsafe { var cb = (delegate* unmanaged<NativeString, long, long, void>)callbackPtr; cb(NativeString.FromManaged(errJson), 0, context); }
                            try { await ws.CloseAsync(WebSocketCloseStatus.MessageTooBig, "Message too large", CancellationToken.None); } catch (Exception ex) { Console.Error.WriteLine("[ws] close after size limit failed: " + ex.Message); }
                            break;
                        }
                    } while (!result.EndOfMessage);
                    if (result.MessageType == WebSocketMessageType.Close) {
                        var json = "{\"type\":\"ws_close\",\"wsHandle\":" + handle + ",\"code\":" + (int)(result.CloseStatus ?? WebSocketCloseStatus.NormalClosure) + "}";
                        unsafe { var cb = (delegate* unmanaged<NativeString, long, long, void>)callbackPtr; cb(NativeString.FromManaged(json), 0, context); }
                        break;
                    }
                    var data = Encoding.UTF8.GetString(ms.GetBuffer(), 0, (int)ms.Length);
                    var msgJson = "{\"type\":\"ws_message\",\"wsHandle\":" + handle + ",\"data\":\"" + EscapeJson(data) + "\"}";
                    unsafe { var cb = (delegate* unmanaged<NativeString, long, long, void>)callbackPtr; cb(NativeString.FromManaged(msgJson), 0, context); }
                }
            } catch (Exception ex) { Console.Error.WriteLine("[ws] client receive loop error: " + ex.Message); }
        });
    }

    private static void ApplyJsonHeaders(HttpRequestMessage req, string headersJson)
    {
        if (string.IsNullOrEmpty(headersJson) || headersJson == "{}") return;
        using var doc = JsonDocument.Parse(headersJson);
        foreach (var prop in doc.RootElement.EnumerateObject())
        {
            var key = prop.Name;
            var val = prop.Value.GetString() ?? "";
            if (key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) && req.Content != null)
                req.Content.Headers.TryAddWithoutValidation(key, val);
            else
                req.Headers.TryAddWithoutValidation(key, val);
        }
    }

    private static string EscapeJson(string s)
    {
        var sb = new StringBuilder(s.Length);
        foreach (var c in s)
        {
            if (c == '\\') sb.Append("\\\\");
            else if (c == '"') sb.Append("\\\"");
            else if (c == '\n') sb.Append("\\n");
            else if (c == '\r') sb.Append("\\r");
            else if (c == '\t') sb.Append("\\t");
            else if (c < 0x20) sb.Append("\\u").Append(((int)c).ToString("x4"));
            else sb.Append(c);
        }
        return sb.ToString();
    }
}
