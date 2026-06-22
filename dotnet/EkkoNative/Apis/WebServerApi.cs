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
using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.WebSockets;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

public static class WebServerApi
{

    

    private sealed class NoopHostLifetime : IHostLifetime
    {
        public Task WaitForStartAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private static nint _requestCallbackPtr;
    private static long _requestContext;
    private static CancellationTokenSource? _cts;
    private static Thread? _serverThread;

    private static unsafe void NotifyRequest(string json, long handle)
    {
        if (_requestCallbackPtr == 0) return;
        try { ((delegate* unmanaged<NativeString, long, long, void>)_requestCallbackPtr)(NativeString.FromManaged(json), handle, _requestContext); }
        catch (Exception ex) { Console.Error.WriteLine($"[error] request callback failed: {ex.Message}"); }
    }

    [EkkoExport("webserver.registerCallback")]
    public static void RegisterCallback(nint callbackPtr, long context)
    {
        _requestCallbackPtr = callbackPtr;
        _requestContext = context;
    }

    [EkkoExport("webserver.start")]
    public static string Start(string host, int port, string certPath, string keyPath, string pfxPath, string pfxPassword, int http2, int compression, int maxBodySizeMb, int maxWsMessageSizeKb)
    {
        var useTls = !string.IsNullOrEmpty(certPath) || !string.IsNullOrEmpty(pfxPath);
        var scheme = useTls ? "https" : "http";
        var url = $"{scheme}://{host}:{port}";
        _cts = new CancellationTokenSource();
        var ct = _cts.Token;

        

        var ready = new ManualResetEventSlim(false);
        Exception? startupError = null;   

        _serverThread = new Thread(() =>
        {
            try
            {
                var bodyLimit = maxBodySizeMb > 0 ? maxBodySizeMb * 1024L * 1024L : 10L * 1024L * 1024L;
                var wsLimit = maxWsMessageSizeKb > 0 ? maxWsMessageSizeKb * 1024L : 64L * 1024L;
                Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Production");
                Environment.SetEnvironmentVariable("Logging__LogLevel__Default", "None");
                Environment.SetEnvironmentVariable("Logging__LogLevel__Microsoft", "None");
                var builder = WebApplication.CreateSlimBuilder();
                
                builder.Services.AddSingleton<IHostLifetime, NoopHostLifetime>();
                if (compression != 0)
                {
                    builder.Services.AddResponseCompression(options =>
                    {
                        options.EnableForHttps = true;
                        options.MimeTypes = Microsoft.AspNetCore.ResponseCompression.ResponseCompressionDefaults.MimeTypes
                            .Concat(new[] { "application/javascript", "text/css", "application/json", "image/svg+xml" });
                    });
                }
                builder.WebHost.ConfigureKestrel(options =>
                {
                    options.AllowSynchronousIO = true;
                    options.AddServerHeader = false;
                    options.Limits.MaxRequestBodySize = bodyLimit;
                    options.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(30);
                    options.Limits.KeepAliveTimeout = TimeSpan.FromSeconds(120);
                    options.Listen(IPAddress.Parse(host == "0.0.0.0" ? "0.0.0.0" : host), port, listenOptions =>
                    {
                        if (!string.IsNullOrEmpty(certPath) && !string.IsNullOrEmpty(keyPath))
                        {
                            var cert = X509Certificate2.CreateFromPemFile(certPath, keyPath);
                            listenOptions.UseHttps(cert);
                        }
                        else if (!string.IsNullOrEmpty(pfxPath))
                        {
                            listenOptions.UseHttps(pfxPath, pfxPassword ?? "");
                        }

                        if (http2 != 0)
                        {
                            listenOptions.Protocols = HttpProtocols.Http1AndHttp2;
                        }
                    });
                });
                var app = builder.Build();
                if (compression != 0) app.UseResponseCompression();
                app.UseWebSockets();
                app.Run(async (HttpContext ctx) =>
                {
                    if (ctx.WebSockets.IsWebSocketRequest)
                    {
                        var ws = await ctx.WebSockets.AcceptWebSocketAsync();
                        var wsHandle = HandleTable.Register(ws);
                        var connectJson = "{\"type\":\"ws_connect\",\"wsHandle\":" + wsHandle + ",\"path\":\"" + EscapeJson(ctx.Request.Path.Value ?? "/") + "\"}";
                        NotifyRequest(connectJson, 0);
                        var buffer = new byte[4096];
                        try {
                            while (ws.State == WebSocketState.Open) {
                                using var ms = new MemoryStream();
                                WebSocketReceiveResult result;
                                do {
                                    result = await ws.ReceiveAsync(buffer, CancellationToken.None);
                                    if (result.MessageType == WebSocketMessageType.Close) break;
                                    ms.Write(buffer, 0, result.Count);
                                    if (ms.Length > wsLimit) {
                                        var errJson = "{\"type\":\"ws_error\",\"wsHandle\":" + wsHandle + ",\"error\":\"WebSocket message exceeds limit (" + wsLimit / 1024 + "KB). Configure maxWsMessageSize to increase.\"}";
                                        NotifyRequest(errJson, 0);
                                        try { await ws.CloseAsync(WebSocketCloseStatus.MessageTooBig, "Message too large", CancellationToken.None); } catch (Exception ex) { Console.Error.WriteLine("[ws] close after size limit failed: " + ex.Message); }
                                        break;
                                    }
                                } while (!result.EndOfMessage);
                                if (result.MessageType == WebSocketMessageType.Close) {
                                    var closeJson = "{\"type\":\"ws_close\",\"wsHandle\":" + wsHandle + ",\"code\":" + (int)(result.CloseStatus ?? WebSocketCloseStatus.NormalClosure) + "}";
                                    NotifyRequest(closeJson, 0);
                                    try { await ws.CloseOutputAsync(WebSocketCloseStatus.NormalClosure, "", CancellationToken.None); } catch {}
                                    break;
                                }
                                var data = Encoding.UTF8.GetString(ms.GetBuffer(), 0, (int)ms.Length);
                                var msgJson = "{\"type\":\"ws_message\",\"wsHandle\":" + wsHandle + ",\"data\":\"" + EscapeJson(data) + "\"}";
                                NotifyRequest(msgJson, 0);
                            }
                        } catch (Exception ex) { Console.Error.WriteLine("[ws] server receive loop error: " + ex.Message); } finally { HandleTable.Release(wsHandle); }
                        return;
                    }

                    var id = HandleTable.Register(new RequestContext(ctx));

                    var body = "";
                    var bodyEncoding = "";
                    var maxBody = bodyLimit;
                    if (ctx.Request.ContentLength > maxBody)
                    {
                        ctx.Response.StatusCode = 413;
                        await ctx.Response.WriteAsync("{\"error\":\"Request body too large\"}");
                        HandleTable.Release(id);
                        return;
                    }
                    if (ctx.Request.ContentLength > 0)
                    {

                        

                        
                        var ct2 = (ctx.Request.ContentType ?? "").Split(';')[0].Trim().ToLowerInvariant();
                        bool isText = ct2 == "application/json"
                                   || ct2 == "application/x-www-form-urlencoded"
                                   || ct2 == "application/xml"
                                   || ct2 == "application/javascript"
                                   || ct2 == "application/graphql"
                                   || ct2.StartsWith("text/")
                                   || ct2.EndsWith("+json")
                                   || ct2.EndsWith("+xml");
                        if (isText)
                        {
                            using var reader = new StreamReader(ctx.Request.Body, Encoding.UTF8);
                            body = await reader.ReadToEndAsync();
                        }
                        else
                        {
                            using var ms = new MemoryStream();
                            await ctx.Request.Body.CopyToAsync(ms);
                            if (ms.Length > maxBody)
                            {
                                ctx.Response.StatusCode = 413;
                                await ctx.Response.WriteAsync("{\"error\":\"Request body too large\"}");
                                HandleTable.Release(id);
                                return;
                            }
                            body = Convert.ToBase64String(ms.ToArray());
                            bodyEncoding = "base64";
                        }
                    }

                    var sb = new StringBuilder();
                    sb.Append("{\"id\":").Append(id);
                    sb.Append(",\"method\":\"").Append(ctx.Request.Method).Append('"');
                    sb.Append(",\"path\":\"").Append(EscapeJson(ctx.Request.Path.Value ?? "/")).Append('"');
                    sb.Append(",\"query\":\"").Append(EscapeJson(ctx.Request.QueryString.Value ?? "")).Append('"');
                    sb.Append(",\"ip\":\"").Append(ctx.Connection.RemoteIpAddress?.ToString() ?? "").Append('"');
                    sb.Append(",\"headers\":{");
                    bool first = true;
                    foreach (var h in ctx.Request.Headers)
                    {
                        if (!first) sb.Append(',');
                        sb.Append('"').Append(EscapeJson(h.Key.ToLowerInvariant())).Append("\":\"");
                        sb.Append(EscapeJson(h.Value.ToString())).Append('"');
                        first = false;
                    }
                    sb.Append("},\"body\":\"").Append(EscapeJson(body)).Append('"');
                    if (bodyEncoding.Length > 0)
                        sb.Append(",\"bodyEncoding\":\"").Append(bodyEncoding).Append('"');
                    sb.Append('}');

                    NotifyRequest(sb.ToString(), id);

                    var reqCtx = HandleTable.Get<RequestContext>(id);

                    using var cts2 = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                    try
                    {
                        await reqCtx.Completion.Task.WaitAsync(cts2.Token);
                    }
                    catch (OperationCanceledException)
                    {
                        ctx.Response.StatusCode = 504;
                        await ctx.Response.WriteAsync("Gateway Timeout");
                        HandleTable.Release(id);
                    }
                });

                ct.Register(() => app.StopAsync().GetAwaiter().GetResult());
                app.StartAsync().GetAwaiter().GetResult(); 
                ready.Set();          
                ct.WaitHandle.WaitOne(); 
            }
            catch (Exception ex)
            {
                startupError = ex;   
                ready.Set();          
            }
        });
        _serverThread.IsBackground = true;
        _serverThread.Start();

        
        
        if (!ready.Wait(TimeSpan.FromSeconds(15)))
            throw new Exception($"Could not start the server on {url}: it did not bind within 15 seconds.");
        if (startupError != null)
            throw new Exception(BuildStartError(startupError, url, port));
        return url;
    }

    
    private static string BuildStartError(Exception ex, string url, int port)
    {
        bool noColor = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("NO_COLOR"));
        string esc = ((char)27).ToString();
        string red = noColor ? "" : esc + "[31m", blue = noColor ? "" : esc + "[94m",
               green = noColor ? "" : esc + "[32m", rst = noColor ? "" : esc + "[0m";
        string m = ex.Message ?? "";
        bool inUse = m.Contains("address already in use") || m.Contains("Address already in use")
                  || m.Contains("already in use") || m.Contains("EADDRINUSE")
                  || m.Contains("Only one usage of each socket address"); 
        if (inUse)
            return $"{red}Could not start the server: port {port} is already in use.{rst}\n  "
                 + $"{blue}Another process is already listening on {url}; this server did not start.{rst}\n  "
                 + $"{green}Fix: stop whatever is using port {port}, or start on another port "
                 + $"(createServer({{ port: {port + 1} }}) / createApp({{ port: {port + 1} }})).{rst}";
        return $"{red}Could not start the server on {url}.{rst}\n  "
             + $"{blue}{m}{rst}\n  "
             + $"{green}Fix: check the host and port, and that you have permission to bind it.{rst}";
    }

    [EkkoExport("webserver.sendResponse")]
    public static void SendResponse(int requestId, int status, string headersJson, byte[] body)
    {
        var reqCtx = HandleTable.Get<RequestContext>(requestId);
        var ctx = reqCtx.HttpContext;

        ctx.Response.StatusCode = status;

        if (!string.IsNullOrEmpty(headersJson) && headersJson != "{}")
        {
            try
            {
                var doc = System.Text.Json.JsonDocument.Parse(headersJson);
                foreach (var prop in doc.RootElement.EnumerateObject())
                {
                    ctx.Response.Headers.Append(prop.Name, prop.Value.GetString());
                }
            }
            catch (Exception ex) { Console.Error.WriteLine("[http] response header parse error: " + ex.Message); }
        }

        if (body != null && body.Length > 0)
        {
            var accept = ctx.Request.Headers["Accept-Encoding"].ToString();
            var ct = ctx.Response.ContentType ?? "";
            bool compressible = body.Length > 512 && (ct.Contains("text/") || ct.Contains("javascript") || ct.Contains("json") || ct.Contains("svg") || ct.Contains("css"));

            

            if (compressible && accept.Contains("br"))
            {
                ctx.Response.Headers.Append("content-encoding", "br");
                using var ms = new MemoryStream();
                using (var br = new System.IO.Compression.BrotliStream(ms, System.IO.Compression.CompressionLevel.Fastest)) { br.Write(body, 0, body.Length); }
                var compressed = ms.ToArray();
                ctx.Response.ContentLength = compressed.Length;
                ctx.Response.Body.WriteAsync(compressed, 0, compressed.Length).GetAwaiter().GetResult();
            }
            else if (compressible && accept.Contains("gzip"))
            {
                ctx.Response.Headers.Append("content-encoding", "gzip");
                using var ms = new MemoryStream();
                using (var gz = new System.IO.Compression.GZipStream(ms, System.IO.Compression.CompressionLevel.Fastest)) { gz.Write(body, 0, body.Length); }
                var compressed = ms.ToArray();
                ctx.Response.ContentLength = compressed.Length;
                ctx.Response.Body.WriteAsync(compressed, 0, compressed.Length).GetAwaiter().GetResult();
            }
            else
            {
                ctx.Response.ContentLength = body.Length;
                ctx.Response.Body.WriteAsync(body, 0, body.Length).GetAwaiter().GetResult();
            }
        }

        reqCtx.Completion.SetResult();
        HandleTable.Release(requestId);
    }

    [EkkoExport("webserver.wsSend")]
    public static void WsSend(int wsHandle, string data)
    {
        var ws = HandleTable.Get<WebSocket>(wsHandle);
        var bytes = Encoding.UTF8.GetBytes(data);
        ws.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None).GetAwaiter().GetResult();
    }

    [EkkoExport("webserver.wsClose")]
    public static void WsServerClose(int wsHandle, int code)
    {
        var ws = HandleTable.Get<WebSocket>(wsHandle);
        try { ws.CloseAsync((WebSocketCloseStatus)code, "", CancellationToken.None).GetAwaiter().GetResult(); } catch {}
        HandleTable.Release(wsHandle);
    }

    [EkkoExport("webserver.stop")]
    public static void Stop()
    {
        _cts?.Cancel();
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

    private class RequestContext
    {
        public Microsoft.AspNetCore.Http.HttpContext HttpContext { get; }
        public TaskCompletionSource Completion { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public RequestContext(Microsoft.AspNetCore.Http.HttpContext ctx) => HttpContext = ctx;
    }
}
