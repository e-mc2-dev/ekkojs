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
using System.Text;

public static class DateTimeApi
{
    [EkkoExport("datetime.now")]
    public static string Now()
    {
        return FormatResult(DateTimeOffset.Now);
    }

    [EkkoExport("datetime.nowUtc")]
    public static string NowUtc()
    {
        return FormatResult(DateTimeOffset.UtcNow);
    }

    [EkkoExport("datetime.parse")]
    public static string Parse(string input, string format)
    {
        DateTimeOffset dto;
        if (string.IsNullOrEmpty(format))
            dto = DateTimeOffset.Parse(input, CultureInfo.InvariantCulture);
        else
            dto = DateTimeOffset.ParseExact(input, format, CultureInfo.InvariantCulture);
        return FormatResult(dto);
    }

    [EkkoExport("datetime.format")]
    public static string Format(string isoInput, string pattern)
    {
        var dto = DateTimeOffset.Parse(isoInput, CultureInfo.InvariantCulture);
        return dto.ToString(pattern, CultureInfo.InvariantCulture);
    }

    [EkkoExport("datetime.add")]
    public static string Add(string isoInput, int days, int hours, int minutes, int seconds, int milliseconds)
    {
        var dto = DateTimeOffset.Parse(isoInput, CultureInfo.InvariantCulture);
        dto = dto.AddDays(days).AddHours(hours).AddMinutes(minutes).AddSeconds(seconds).AddMilliseconds(milliseconds);
        return FormatResult(dto);
    }

    [EkkoExport("datetime.diff")]
    public static string Diff(string isoA, string isoB)
    {
        var a = DateTimeOffset.Parse(isoA, CultureInfo.InvariantCulture);
        var b = DateTimeOffset.Parse(isoB, CultureInfo.InvariantCulture);
        var span = a - b;
        var sb = new StringBuilder();
        sb.Append("{\"milliseconds\":");
        sb.Append((long)span.TotalMilliseconds);
        sb.Append(",\"seconds\":");
        sb.Append((long)span.TotalSeconds);
        sb.Append(",\"minutes\":");
        sb.Append((long)span.TotalMinutes);
        sb.Append(",\"hours\":");
        sb.Append((long)span.TotalHours);
        sb.Append(",\"days\":");
        sb.Append((long)span.TotalDays);
        sb.Append('}');
        return sb.ToString();
    }

    [EkkoExport("datetime.epoch")]
    public static long Epoch()
    {
        return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    }

    [EkkoExport("datetime.fromEpoch")]
    public static string FromEpoch(long epochMs)
    {
        return FormatResult(DateTimeOffset.FromUnixTimeMilliseconds(epochMs));
    }

    [EkkoExport("timezone.list")]
    public static string List()
    {
        var zones = TimeZoneInfo.GetSystemTimeZones();
        var sb = new StringBuilder();
        sb.Append('[');
        bool first = true;
        var seen = new System.Collections.Generic.HashSet<string>();
        foreach (var z in zones)
        {

            string id = z.Id;
            if (TimeZoneInfo.TryConvertWindowsIdToIanaId(z.Id, out var iana))
                id = iana;
            if (!seen.Add(id)) continue; 
            if (!first) sb.Append(',');
            first = false;
            sb.Append('"');
            sb.Append(id);
            sb.Append('"');
        }
        sb.Append(']');
        return sb.ToString();
    }

    [EkkoExport("timezone.convert")]
    public static string Convert(string isoInput, string zoneId)
    {
        var dto = DateTimeOffset.Parse(isoInput, CultureInfo.InvariantCulture);
        var tz = TimeZoneInfo.FindSystemTimeZoneById(zoneId);
        var converted = TimeZoneInfo.ConvertTime(dto, tz);
        var sb = new StringBuilder();
        sb.Append("{\"iso\":\"");
        sb.Append(converted.ToString("o"));
        sb.Append("\",\"epoch\":");
        sb.Append(converted.ToUnixTimeMilliseconds());
        sb.Append(",\"offset\":\"");
        sb.Append(converted.Offset >= TimeSpan.Zero ? "+" : "-");
        sb.Append(converted.Offset.Duration().ToString(@"hh\:mm"));
        sb.Append("\",\"zone\":\"");
        sb.Append(zoneId);
        sb.Append("\"}");
        return sb.ToString();
    }

    [EkkoExport("timezone.info")]
    public static string Info(string zoneId)
    {
        var tz = TimeZoneInfo.FindSystemTimeZoneById(zoneId);
        var isDst = tz.IsDaylightSavingTime(DateTimeOffset.UtcNow);
        var sb = new StringBuilder();
        sb.Append("{\"id\":\"");
        sb.Append(tz.Id);
        sb.Append("\",\"displayName\":\"");
        sb.Append(tz.DisplayName.Replace("\"", "\\\""));
        sb.Append("\",\"utcOffset\":\"");
        sb.Append(tz.BaseUtcOffset >= TimeSpan.Zero ? "+" : "-");
        sb.Append(tz.BaseUtcOffset.Duration().ToString(@"hh\:mm"));
        sb.Append("\",\"isDst\":");
        sb.Append(isDst ? "true" : "false");
        sb.Append('}');
        return sb.ToString();
    }

    private static string FormatResult(DateTimeOffset dto)
    {
        var sb = new StringBuilder();
        sb.Append("{\"iso\":\"");
        sb.Append(dto.ToString("o"));
        sb.Append("\",\"epoch\":");
        sb.Append(dto.ToUnixTimeMilliseconds());
        sb.Append(",\"offset\":\"");
        sb.Append(dto.Offset >= TimeSpan.Zero ? "+" : "-");
        sb.Append(dto.Offset.Duration().ToString(@"hh\:mm"));
        sb.Append("\"}");
        return sb.ToString();
    }
}
