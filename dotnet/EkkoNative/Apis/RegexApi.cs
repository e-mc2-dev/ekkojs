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
using System.Text;
using System.Text.RegularExpressions;

public static class RegexApi
{
    [EkkoExport("regex.create")]
    public static int Create(string pattern, string flags)
    {
        var opts = RegexOptions.Compiled;
        if (flags.Contains('i')) opts |= RegexOptions.IgnoreCase;
        if (flags.Contains('m')) opts |= RegexOptions.Multiline;
        if (flags.Contains('s')) opts |= RegexOptions.Singleline;
        if (flags.Contains('x')) opts |= RegexOptions.IgnorePatternWhitespace;   

        var regex = new Regex(pattern, opts, TimeSpan.FromSeconds(2));
        return HandleTable.Register(regex);
    }

    [EkkoExport("regex.test")]
    public static int Test(int handle, string input)
    {
        var re = HandleTable.Get<Regex>(handle);
        return re.IsMatch(input) ? 1 : 0;
    }

    [EkkoExport("regex.match")]
    public static string Match(int handle, string input)
    {
        var re = HandleTable.Get<Regex>(handle);
        var m = re.Match(input);
        if (!m.Success) return "";
        return FormatMatch(m, re);
    }

    [EkkoExport("regex.matchAll")]
    public static string MatchAll(int handle, string input)
    {
        var re = HandleTable.Get<Regex>(handle);
        var matches = re.Matches(input);
        if (matches.Count == 0) return "[]";
        var sb = new StringBuilder();
        sb.Append('[');
        for (int i = 0; i < matches.Count; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append(FormatMatch(matches[i], re));
        }
        sb.Append(']');
        return sb.ToString();
    }

    [EkkoExport("regex.replace")]
    public static string Replace(int handle, string input, string replacement)
    {
        var re = HandleTable.Get<Regex>(handle);
        return re.Replace(input, replacement);
    }

    [EkkoExport("regex.split")]
    public static string Split(int handle, string input)
    {
        var re = HandleTable.Get<Regex>(handle);
        var parts = re.Split(input);
        var sb = new StringBuilder();
        sb.Append('[');
        for (int i = 0; i < parts.Length; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append('"');
            sb.Append(EscapeJson(parts[i]));
            sb.Append('"');
        }
        sb.Append(']');
        return sb.ToString();
    }

    [EkkoExport("regex.dispose")]
    public static void Dispose(int handle)
    {
        HandleTable.Release(handle);
    }

    private static string FormatMatch(Match m, Regex re)
    {
        var sb = new StringBuilder();
        sb.Append("{\"value\":\"");   
        sb.Append(EscapeJson(m.Value));
        sb.Append("\",\"index\":");
        sb.Append(m.Index);

        var groupNames = re.GetGroupNames();
        bool hasNamed = false;
        foreach (var name in groupNames)
        {
            if (name != "0" && !int.TryParse(name, out _))
            {
                hasNamed = true;
                break;
            }
        }

        if (hasNamed)
        {
            sb.Append(",\"groups\":{");
            bool first = true;
            foreach (var name in groupNames)
            {
                if (name == "0" || int.TryParse(name, out _)) continue;
                var g = m.Groups[name];
                if (!g.Success) continue;
                if (!first) sb.Append(',');
                first = false;
                sb.Append('"');
                sb.Append(EscapeJson(name));
                sb.Append("\":\"");
                sb.Append(EscapeJson(g.Value));
                sb.Append('"');
            }
            sb.Append('}');
        }
        else
        {
            sb.Append(",\"groups\":[");
            for (int i = 1; i < m.Groups.Count; i++)
            {
                if (i > 1) sb.Append(',');
                sb.Append('"');
                sb.Append(EscapeJson(m.Groups[i].Value));
                sb.Append('"');
            }
            sb.Append(']');
        }

        sb.Append('}');
        return sb.ToString();
    }

    private static string EscapeJson(string s)
    {
        
        var sb = new StringBuilder(s.Length + 16);
        foreach (var c in s)
        {
            switch (c)
            {
                case '\\': sb.Append("\\\\"); break;
                case '"': sb.Append("\\\""); break;
                case '\n': sb.Append("\\n"); break;
                case '\r': sb.Append("\\r"); break;
                case '\t': sb.Append("\\t"); break;
                case '\b': sb.Append("\\b"); break;
                case '\f': sb.Append("\\f"); break;
                default:
                    if (c < 0x20) sb.Append("\\u").Append(((int)c).ToString("x4"));
                    else sb.Append(c);
                    break;
            }
        }
        return sb.ToString();
    }
}
