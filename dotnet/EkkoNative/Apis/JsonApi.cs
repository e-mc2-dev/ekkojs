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
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.Json;

public static class JsonApi
{
    [EkkoExport("json.createReader")]
    public static int CreateReader(byte[] data)
    {
        var wrapper = new JsonStreamReader(data);
        return HandleTable.Register(wrapper);
    }

    [EkkoExport("json.readerRead")]
    public static string ReaderRead(int handle)
    {
        var r = HandleTable.Get<JsonStreamReader>(handle);
        return r.ReadNext();
    }

    [EkkoExport("json.readerClose")]
    public static void ReaderClose(int handle)
    {
        HandleTable.Release(handle);
    }

    [EkkoExport("json.createWriter")]
    public static int CreateWriter()
    {
        var wrapper = new JsonStreamWriter();
        return HandleTable.Register(wrapper);
    }

    [EkkoExport("json.writerWrite")]
    public static void WriterWrite(int handle, string command)
    {
        var w = HandleTable.Get<JsonStreamWriter>(handle);
        w.Write(command);
    }

    [EkkoExport("json.writerFinish")]
    public static byte[] WriterFinish(int handle)
    {
        var w = HandleTable.Get<JsonStreamWriter>(handle);
        var result = w.Finish();
        HandleTable.Release(handle);
        return result;
    }
}

internal class JsonStreamReader : IDisposable
{
    private readonly byte[] _data;
    private int _position;
    private JsonReaderState _state;

    public JsonStreamReader(byte[] data)
    {
        _data = data;
        _position = 0;
        _state = new JsonReaderState();
    }

    public string ReadNext()
    {
        if (_position >= _data.Length) return "";
        var span = _data.AsSpan(_position);
        var reader = new Utf8JsonReader(span, isFinalBlock: true, _state);
        if (!reader.Read()) return "";
        _state = reader.CurrentState;
        _position += (int)reader.BytesConsumed;

        var tokenType = reader.TokenType switch
        {
            JsonTokenType.StartObject => "startObject",
            JsonTokenType.EndObject => "endObject",
            JsonTokenType.StartArray => "startArray",
            JsonTokenType.EndArray => "endArray",
            JsonTokenType.PropertyName => "propertyName",
            JsonTokenType.String => "string",
            JsonTokenType.Number => "number",
            JsonTokenType.True => "true",
            JsonTokenType.False => "false",
            JsonTokenType.Null => "null",
            _ => "none",
        };

        var value = reader.TokenType switch
        {
            JsonTokenType.PropertyName => reader.GetString() ?? "",
            JsonTokenType.String => reader.GetString() ?? "",

            
            JsonTokenType.Number => Encoding.UTF8.GetString(reader.ValueSpan),
            JsonTokenType.True => "true",
            JsonTokenType.False => "false",
            _ => "",
        };

        return tokenType + "\t" + value;
    }

    public void Dispose() { }
}

internal class JsonStreamWriter : IDisposable
{
    private readonly MemoryStream _buffer;
    private readonly Utf8JsonWriter _writer;

    public JsonStreamWriter()
    {
        _buffer = new MemoryStream();
        _writer = new Utf8JsonWriter(_buffer);
    }

    public void Write(string command)
    {
        if (command == "startObject") { _writer.WriteStartObject(); return; }
        if (command == "endObject") { _writer.WriteEndObject(); return; }
        if (command == "startArray") { _writer.WriteStartArray(); return; }
        if (command == "endArray") { _writer.WriteEndArray(); return; }
        if (command == "valueNull") { _writer.WriteNullValue(); return; }

        
        
        int c = command.IndexOf(':');
        if (c < 0) return;                       
        string cmd = command.Substring(0, c);
        string rest = command.Substring(c + 1);  

        switch (cmd)
        {
            
            case "valueString": _writer.WriteStringValue(rest); break;
            case "valueNumber": _writer.WriteNumberValue(double.Parse(rest, CultureInfo.InvariantCulture)); break;
            case "valueBool": _writer.WriteBooleanValue(rest == "true"); break;
            case "propertyName": _writer.WritePropertyName(rest); break;
            case "null": _writer.WriteNull(rest); break;   
            
            case "string": { int k = rest.IndexOf(':'); if (k < 0) { _writer.WriteString(rest, ""); } else { _writer.WriteString(rest.Substring(0, k), rest.Substring(k + 1)); } break; }
            case "number": { int k = rest.IndexOf(':'); if (k < 0) return; _writer.WriteNumber(rest.Substring(0, k), double.Parse(rest.Substring(k + 1), CultureInfo.InvariantCulture)); break; }
            case "bool": { int k = rest.IndexOf(':'); if (k < 0) return; _writer.WriteBoolean(rest.Substring(0, k), rest.Substring(k + 1) == "true"); break; }
        }
    }

    public byte[] Finish()
    {
        _writer.Flush();
        return _buffer.ToArray();
    }

    public void Dispose()
    {
        _writer.Dispose();
        _buffer.Dispose();
    }
}
