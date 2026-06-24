// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



use std::sync::OnceLock;

use ekko_tui::highlight::registry::{FileTokenCache, LanguageRegistry};
use ekko_tui::highlight::token::{Token, TokenKind};
use unicode_width::UnicodeWidthStr;

const RESET: &str = "\x1b[0m";

const HEADING_MARKS: [&str; 6] = ["═══ ", "─── ", "▪ ", "▸ ", "· ", "· "];

pub fn render(markdown: &str, width: usize, color: bool) -> String {
    let width = width.max(20);
    let mut out = String::new();
    for block in parse_blocks(markdown) {
        render_block(&block, width, color, &mut out);
    }
    out
}

enum Block {
    Heading(usize, String),
    Code(String, String), 
    Quote(String),
    Hr,
    Ul(Vec<String>),
    Ol(Vec<String>),
    Table(Vec<String>),
    Para(String),
}

fn parse_blocks(md: &str) -> Vec<Block> {
    let lines: Vec<&str> = md.split('\n').collect();
    let mut blocks = Vec::new();
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i];

        if let Some(rest) = line.strip_prefix("```") {
            let lang = rest.trim().to_string();
            let mut code = Vec::new();
            i += 1;
            while i < lines.len() && !lines[i].starts_with("```") {
                code.push(lines[i]);
                i += 1;
            }
            if i < lines.len() {
                i += 1; 
            }
            blocks.push(Block::Code(lang, code.join("\n")));
            continue;
        }
        
        if let Some((level, text)) = parse_heading(line) {
            blocks.push(Block::Heading(level, text));
            i += 1;
            continue;
        }
        
        if is_hr(line) {
            blocks.push(Block::Hr);
            i += 1;
            continue;
        }
        
        if line.starts_with("> ") {
            let mut q = Vec::new();
            while i < lines.len() && lines[i].starts_with("> ") {
                q.push(&lines[i][2..]);
                i += 1;
            }
            blocks.push(Block::Quote(q.join("\n")));
            continue;
        }
        
        if line.contains('|') && i + 1 < lines.len() && is_table_sep(lines[i + 1]) {
            let mut t = Vec::new();
            while i < lines.len() && lines[i].contains('|') {
                t.push(lines[i].to_string());
                i += 1;
            }
            blocks.push(Block::Table(t));
            continue;
        }
        
        if is_ul(line) {
            let mut items = Vec::new();
            while i < lines.len() && is_ul(lines[i]) {
                items.push(strip_ul(lines[i]));
                i += 1;
            }
            blocks.push(Block::Ul(items));
            continue;
        }
        
        if is_ol(line) {
            let mut items = Vec::new();
            while i < lines.len() && is_ol(lines[i]) {
                items.push(strip_ol(lines[i]));
                i += 1;
            }
            blocks.push(Block::Ol(items));
            continue;
        }
        
        if line.trim().is_empty() {
            i += 1;
            continue;
        }
        
        let mut para = Vec::new();
        while i < lines.len()
            && !lines[i].trim().is_empty()
            && !lines[i].starts_with('#')
            && !lines[i].starts_with('>')
            && !lines[i].starts_with("```")
        {
            para.push(lines[i]);
            i += 1;
        }
        blocks.push(Block::Para(para.join(" ")));
    }
    blocks
}

fn parse_heading(line: &str) -> Option<(usize, String)> {
    let hashes = line.chars().take_while(|&c| c == '#').count();
    if (1..=6).contains(&hashes) {
        let rest = &line[hashes..];
        if let Some(text) = rest.strip_prefix(' ') {
            let text = text.trim().to_string();
            if !text.is_empty() {
                return Some((hashes, text));
            }
        }
    }
    None
}

fn is_hr(line: &str) -> bool {
    let t = line.trim();
    if t.len() < 3 {
        return false;
    }
    let c0 = t.chars().next().unwrap();
    matches!(c0, '-' | '*' | '_') && t.chars().all(|c| c == c0)
}

fn is_table_sep(line: &str) -> bool {
    let t = line.trim().trim_start_matches('|');
    !t.is_empty()
        && t.chars().all(|c| matches!(c, '-' | ':' | '|' | ' '))
        && t.contains(|c| c == '-' || c == ':')
}

fn is_ul(line: &str) -> bool {
    let t = line.trim_start();
    t.starts_with("- ") || t.starts_with("* ") || t.starts_with("+ ")
}
fn strip_ul(line: &str) -> String {
    line.trim_start()[2..].to_string()
}
fn is_ol(line: &str) -> bool {
    let t = line.trim_start();
    let digits = t.chars().take_while(|c| c.is_ascii_digit()).count();
    digits > 0 && t[digits..].starts_with(". ")
}
fn strip_ol(line: &str) -> String {
    let t = line.trim_start();
    let digits = t.chars().take_while(|c| c.is_ascii_digit()).count();
    t[digits + 2..].to_string()
}

fn render_block(b: &Block, width: usize, color: bool, out: &mut String) {
    match b {
        Block::Heading(level, text) => {
            let mark = HEADING_MARKS[(level - 1).min(5)];
            let text = inline_plain(text);
            if color {
                out.push_str(&format!("\x1b[1;93m{mark}{text}{RESET}\n\n"));
            } else {
                out.push_str(&format!("{mark}{text}\n\n"));
            }
        }
        Block::Code(lang, content) => {
            render_code_block(lang, content, color, out);
        }
        Block::Quote(content) => {
            for line in content.split('\n') {
                let text = inline_plain(line);
                if color {
                    out.push_str(&format!("\x1b[90m│{RESET} \x1b[3m{text}{RESET}\n"));
                } else {
                    out.push_str(&format!("| {text}\n"));
                }
            }
            out.push('\n');
        }
        Block::Hr => {
            let bar = "─".repeat(width.min(80));
            if color {
                out.push_str(&format!("\x1b[90m{bar}{RESET}\n\n"));
            } else {
                out.push_str(&format!("{bar}\n\n"));
            }
        }
        Block::Ul(items) => {
            for it in items {
                let marker = if color { "\x1b[96m●\x1b[0m".to_string() } else { "*".to_string() };
                let text = if color { inline_ansi(it) } else { inline_plain(it) };
                push_list_item(out, &marker, &wrap(&text, width.saturating_sub(4)));
            }
            out.push('\n');
        }
        Block::Ol(items) => {
            for (n, it) in items.iter().enumerate() {
                let marker = if color {
                    format!("\x1b[96m{}.\x1b[0m", n + 1)
                } else {
                    format!("{}.", n + 1)
                };
                let text = if color { inline_ansi(it) } else { inline_plain(it) };
                push_list_item(out, &marker, &wrap(&text, width.saturating_sub(4)));
            }
            out.push('\n');
        }
        Block::Table(lines) => {
            render_table(lines, color, out);
            out.push('\n');
        }
        Block::Para(text) => {
            let t = if color { inline_ansi(text) } else { inline_plain(text) };
            for line in wrap(&t, width) {
                out.push_str(&line);
                out.push('\n');
            }
            out.push('\n');
        }
    }
}

fn push_list_item(out: &mut String, marker: &str, lines: &[String]) {
    if lines.is_empty() {
        out.push_str(&format!("  {marker} \n"));
        return;
    }
    for (i, l) in lines.iter().enumerate() {
        if i == 0 {
            out.push_str(&format!("  {marker} {l}\n"));
        } else {
            out.push_str(&format!("    {l}\n"));
        }
    }
}

fn render_table(lines: &[String], color: bool, out: &mut String) {
    if lines.len() < 2 {
        for l in lines {
            out.push_str(l);
            out.push('\n');
        }
        return;
    }
    let parse_row = |line: &str| -> Vec<String> {
        let t = line.trim();
        let t = t.strip_prefix('|').unwrap_or(t);
        let t = t.strip_suffix('|').unwrap_or(t);
        t.split('|').map(|c| inline_plain(c.trim())).collect()
    };
    let headers = parse_row(&lines[0]);
    let ncol = headers.len();
    let rows: Vec<Vec<String>> = lines[2..].iter().map(|l| parse_row(l)).collect();

    let mut widths = vec![0usize; ncol];
    for (ci, h) in headers.iter().enumerate() {
        widths[ci] = UnicodeWidthStr::width(h.as_str());
    }
    for r in &rows {
        for (ci, w) in widths.iter_mut().enumerate() {
            if let Some(c) = r.get(ci) {
                *w = (*w).max(UnicodeWidthStr::width(c.as_str()));
            }
        }
    }

    let bar = |left: &str, mid: &str, right: &str| -> String {
        let mut s = String::from(left);
        for (ci, w) in widths.iter().enumerate() {
            if ci > 0 {
                s.push_str(mid);
            }
            s.push_str(&"─".repeat(w + 2));
        }
        s.push_str(right);
        s
    };
    let cell = |s: &str, w: usize| -> String {
        let mut x = s.to_string();
        for _ in UnicodeWidthStr::width(s)..w {
            x.push(' ');
        }
        x
    };

    out.push_str(&bar("┌", "┬", "┐"));
    out.push('\n');
    let mut hrow = String::from("│");
    for (ci, h) in headers.iter().enumerate() {
        hrow.push_str(&format!(" {} │", cell(h, widths[ci])));
    }
    if color {
        out.push_str(&format!("\x1b[1;93m{hrow}{RESET}\n"));
    } else {
        out.push_str(&hrow);
        out.push('\n');
    }
    out.push_str(&bar("├", "┼", "┤"));
    out.push('\n');
    for r in &rows {
        let mut row = String::from("│");
        for (ci, w) in widths.iter().enumerate() {
            let c = r.get(ci).map(|s| s.as_str()).unwrap_or("");
            row.push_str(&format!(" {} │", cell(c, *w)));
        }
        out.push_str(&row);
        out.push('\n');
    }
    out.push_str(&bar("└", "┴", "┘"));
    out.push('\n');
}

fn guide_sgr(level: usize) -> &'static str {
    const P: [&str; 4] = ["\x1b[90m", "\x1b[94m", "\x1b[95m", "\x1b[96m"];
    P[level % 4]
}

fn gcd(a: usize, b: usize) -> usize { if b == 0 { a } else { gcd(b, a % b) } }

fn detect_unit(lines: &[&str]) -> usize {
    let mut u = 0usize;
    for l in lines {
        let lead = l.chars().take_while(|c| *c == ' ').count();
        if lead > 0 { u = if u == 0 { lead } else { gcd(u, lead) }; }
    }
    if u == 0 { 2 } else { u.clamp(1, 8) }
}

fn render_code_block(lang: &str, content: &str, color: bool, out: &mut String) {

    
    if lang.eq_ignore_ascii_case("ansi")
        || lang.eq_ignore_ascii_case("terminal")
        || lang.eq_ignore_ascii_case("console")
    {
        let decoded = decode_printable_ansi(content);
        out.push('\n');
        if color {
            out.push_str(&decoded);
            if !decoded.ends_with('\n') { out.push('\n'); }
            out.push_str(RESET); 
            out.push('\n');
        } else {
            out.push_str(&strip_ansi(&decoded));
            if !decoded.ends_with('\n') { out.push('\n'); }
        }
        out.push('\n');
        return;
    }

    let label = if lang.is_empty() { "code" } else { lang };
    if color { out.push_str(&format!("\n\x1b[90m─── {label} ───{RESET}\n")); }
    else { out.push_str(&format!("\n─── {label} ───\n")); }

    let src: Vec<&str> = content.lines().collect();
    let unit = detect_unit(&src);
    let gw = src.len().to_string().len().max(2);
    let reg = LanguageRegistry::new();
    let cache = if color && !lang.is_empty() {
        reg.for_name(lang).map(|h| FileTokenCache::tokenize_file(h, content))
    } else {
        None
    };

    for (i, line) in src.iter().enumerate() {
        let indent_b = line.len() - line.trim_start_matches(' ').len(); 
        let levels = if unit > 0 { indent_b / unit } else { 0 };
        let mut s = String::new();
        if color { s.push_str(&format!("\x1b[90m{:>gw$} │ {RESET}", i + 1)); }
        else { s.push_str(&format!("{:>gw$} │ ", i + 1)); }
        for l in 0..levels {
            if color { s.push_str(guide_sgr(l)); s.push('│'); s.push_str(RESET); } else { s.push('│'); }
            if unit > 1 { s.push_str(&" ".repeat(unit - 1)); }
        }
        s.push_str(&" ".repeat(indent_b.saturating_sub(levels * unit)));
        let rest = &line[indent_b..];
        match &cache {
            Some(c) => {
                let toks: Vec<Token> = c
                    .get_tokens(i)
                    .iter()
                    .filter(|t| t.start >= indent_b)
                    .map(|t| Token::new(t.start - indent_b, t.length, t.kind))
                    .collect();
                s.push_str(&render_tokens(rest, &toks));
            }
            None => s.push_str(rest),
        }
        out.push_str(&s);
        out.push('\n');
    }
    if color { out.push_str(&format!("\x1b[90m─── end ───{RESET}\n\n")); }
    else { out.push_str("─── end ───\n\n"); }
}

fn render_tokens(line: &str, toks: &[Token]) -> String {
    if toks.is_empty() {
        return line.to_string();
    }
    let mut s = String::new();
    let mut pos = 0usize;
    for t in toks {
        let start = clamp_boundary(line, t.start);
        let end = clamp_boundary(line, t.end().max(t.start));
        if start > pos {
            s.push_str(safe(line, pos, start));
        }
        if end > start {
            let sgr = sgr_for(t.kind);
            if sgr.is_empty() {
                s.push_str(safe(line, start, end));
            } else {
                s.push_str(sgr);
                s.push_str(safe(line, start, end));
                s.push_str(RESET);
            }
        }
        pos = end.max(pos);
    }
    if pos < line.len() {
        s.push_str(safe(line, pos, line.len()));
    }
    s
}

fn sgr_for(k: TokenKind) -> &'static str {
    match k {
        TokenKind::Keyword | TokenKind::Link => "\x1b[94m", 
        TokenKind::Type | TokenKind::Preprocessor => "\x1b[96m", 
        TokenKind::String | TokenKind::CodeSpan => "\x1b[92m", 
        TokenKind::Number | TokenKind::Function | TokenKind::Heading => "\x1b[93m", 
        TokenKind::Comment => "\x1b[90m", 
        TokenKind::Operator => "\x1b[95m", 
        TokenKind::Bold | TokenKind::BoldItalic => "\x1b[1;97m", 
        TokenKind::Italic => "\x1b[3;96m", 
        TokenKind::Plain
        | TokenKind::Punctuation
        | TokenKind::Identifier => "",
    }
}

fn clamp_boundary(s: &str, i: usize) -> usize {
    let mut i = i.min(s.len());
    while i > 0 && !s.is_char_boundary(i) {
        i -= 1;
    }
    i
}
fn safe(s: &str, a: usize, b: usize) -> &str {
    let a = clamp_boundary(s, a);
    let b = clamp_boundary(s, b.max(a));
    &s[a..b]
}

fn re_code() -> &'static regex::Regex {
    static R: OnceLock<regex::Regex> = OnceLock::new();
    R.get_or_init(|| regex::Regex::new(r"`([^`]+)`").unwrap())
}
fn re_bolditalic() -> &'static regex::Regex {
    static R: OnceLock<regex::Regex> = OnceLock::new();
    R.get_or_init(|| regex::Regex::new(r"\*\*\*(.+?)\*\*\*").unwrap())
}
fn re_bold() -> &'static regex::Regex {
    static R: OnceLock<regex::Regex> = OnceLock::new();
    R.get_or_init(|| regex::Regex::new(r"\*\*(.+?)\*\*").unwrap())
}
fn re_italic() -> &'static regex::Regex {
    static R: OnceLock<regex::Regex> = OnceLock::new();
    R.get_or_init(|| regex::Regex::new(r"\*(.+?)\*").unwrap())
}
fn re_link() -> &'static regex::Regex {
    static R: OnceLock<regex::Regex> = OnceLock::new();
    R.get_or_init(|| regex::Regex::new(r"\[([^\]]+)\]\(([^)]+)\)").unwrap())
}
fn re_sentinel() -> &'static regex::Regex {
    static R: OnceLock<regex::Regex> = OnceLock::new();
    R.get_or_init(|| regex::Regex::new("\u{0}(\\d+)\u{0}").unwrap())
}

fn inline_plain(text: &str) -> String {
    let s: String = re_bolditalic().replace_all(text, "$1").into_owned();
    let s: String = re_bold().replace_all(&s, "$1").into_owned();
    let s: String = re_italic().replace_all(&s, "$1").into_owned();
    let s: String = re_code().replace_all(&s, "$1").into_owned();
    re_link().replace_all(&s, "$1").into_owned()
}

fn inline_ansi(text: &str) -> String {
    let mut codes: Vec<String> = Vec::new();
    let protected: String = re_code()
        .replace_all(text, |c: &regex::Captures| {
            codes.push(c[1].to_string());
            format!("\u{0}{}\u{0}", codes.len() - 1)
        })
        .into_owned();

    
    let s: String = re_link().replace_all(&protected, "\x1b[4;94m$1\x1b[0m").into_owned();
    let s: String = re_bolditalic().replace_all(&s, "\x1b[1;97m$1\x1b[0m").into_owned();
    let s: String = re_bold().replace_all(&s, "\x1b[1;97m$1\x1b[0m").into_owned();
    let s: String = re_italic().replace_all(&s, "\x1b[3;96m$1\x1b[0m").into_owned();
    re_sentinel()
        .replace_all(&s, |c: &regex::Captures| {
            let idx: usize = c[1].parse().unwrap_or(usize::MAX);
            format!("\x1b[92m{}\x1b[0m", codes.get(idx).cloned().unwrap_or_default())
        })
        .into_owned()
}

fn wrap(text: &str, width: usize) -> Vec<String> {
    if width == 0 {
        return vec![text.to_string()];
    }
    let mut lines = Vec::new();
    let mut cur = String::new();
    let mut cur_w = 0usize;
    for word in text.split(' ') {
        let ww = visible_width(word);
        if cur_w == 0 {
            cur.push_str(word);
            cur_w = ww;
        } else if cur_w + 1 + ww <= width {
            cur.push(' ');
            cur.push_str(word);
            cur_w += 1 + ww;
        } else {
            lines.push(std::mem::take(&mut cur));
            cur.push_str(word);
            cur_w = ww;
        }
    }
    if !cur.is_empty() || lines.is_empty() {
        lines.push(cur);
    }
    lines
}

fn visible_width(s: &str) -> usize {
    UnicodeWidthStr::width(strip_ansi(s).as_str())
}

fn decode_printable_ansi(s: &str) -> String {
    s.replace("\\u001b", "\x1b")
        .replace("\\x1b", "\x1b")
        .replace("\\x1B", "\x1b")
        .replace("\\033", "\x1b")
        .replace("\\e", "\x1b")
}

fn strip_ansi(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\x1b' {
            if chars.peek() == Some(&'[') {
                chars.next();
                while let Some(&n) = chars.peek() {
                    chars.next();
                    if n.is_ascii_alphabetic() {
                        break;
                    }
                }
            }
        } else {
            out.push(c);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn heading_marks_and_color() {
        let c = render("# Title", 80, true);
        assert!(c.contains("═══ Title"));
        assert!(c.contains("\x1b[1;93m"));
        let p = render("## Sub", 80, false);
        assert!(p.contains("─── Sub"));
        assert!(!p.contains('\x1b'));
    }

    #[test]
    fn code_block_is_highlighted_in_color() {
        let md = "```ts\nconst x = 42;\n```";
        let c = render(md, 80, true);
        assert!(c.contains('\x1b'), "highlighted code should emit SGR");
        assert!(c.contains("42"));
        
        let p = render(md, 80, false);
        assert!(!p.contains('\x1b'));
        assert!(p.contains("─── ts ───"));
        assert!(p.contains("1 │ "));
    }

    #[test]
    fn ansi_block_passes_through_verbatim() {
        
        let md = "```ansi\n\\e[31mRED\\e[0m and \x1b[32mGREEN\x1b[0m\n```";
        let c = render(md, 80, true);
        assert!(c.contains("\x1b[31m"), "printable \\e[31m must decode to a real ESC");
        assert!(c.contains("\x1b[32m"), "literal ESC must pass through");
        assert!(c.contains("RED") && c.contains("GREEN"));
        
        assert!(!c.contains("─── ansi ───"), "ansi block must not get the code frame");
        assert!(!c.contains("1 │ "), "ansi block must not get a line-number gutter");
        
        let p = render(md, 80, false);
        assert!(!p.contains('\x1b'), "no-color mode strips SGR");
        assert!(p.contains("RED") && p.contains("GREEN"));
        assert!(!p.contains("─── ansi ───"));
    }

    #[test]
    fn link_inside_bold_does_not_leak_sgr_as_text() {

        let out = inline_ansi("**[Overview](/docs/getting-started)**, install EkkoJS");
        assert!(!out.contains("1;97m["), "SGR code must not leak as literal text: {out:?}");
        assert!(!out.contains("4;94m1;97m"), "no merged/garbled SGR: {out:?}");
        assert!(out.contains("Overview"), "link text kept");
        assert!(out.contains("\x1b[4;94m"), "link styled underline+brightblue");
        assert!(out.contains("install EkkoJS"));
        
        let p = inline_ansi("see [the docs](/x) now");
        assert!(p.contains("\x1b[4;94mthe docs\x1b[0m") && !p.contains("]("), "plain link styled: {p:?}");
    }

    #[test]
    fn terminal_and_console_aliases_also_pass_through() {
        for lang in ["terminal", "console"] {
            let md = format!("```{lang}\n\\e[36mhi\\e[0m\n```");
            let c = render(&md, 80, true);
            assert!(c.contains("\x1b[36m"), "{lang} block must decode escapes");
            assert!(!c.contains(&format!("─── {lang} ───")), "{lang} block must not be framed");
        }
    }

    #[test]
    fn unknown_language_code_renders_plain() {
        let md = "```\nplain text line\n```";
        let out = render(md, 80, true);
        assert!(out.contains("plain text line"));
    }

    #[test]
    fn list_blockquote_hr() {
        let out = render("- one\n- two", 80, false);
        assert!(out.contains("* one") && out.contains("* two"));
        let q = render("> quoted", 80, false);
        assert!(q.contains("| quoted"));
        let hr = render("---", 80, false);
        assert!(hr.contains('─'));
    }

    #[test]
    fn ordered_list_numbers() {
        let out = render("1. alpha\n2. beta", 80, false);
        assert!(out.contains("1. alpha"));
        assert!(out.contains("2. beta"));
    }

    #[test]
    fn table_aligns_columns() {
        let md = "| A | BB |\n|---|----|\n| 1 | 2 |";
        let out = render(md, 80, false);
        assert!(out.contains("┌"));
        assert!(out.contains("│ A "));
        assert!(out.contains("└"));
    }

    #[test]
    fn paragraph_wraps_to_width() {
        
        let md = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda";
        let out = render(md, 20, false);
        assert!(out.lines().filter(|l| !l.is_empty()).count() >= 2);
        for l in out.lines() {
            assert!(visible_width(l) <= 20 || !l.contains(' '));
        }
    }

    #[test]
    fn inline_plain_strips_markup() {
        assert_eq!(inline_plain("a **b** `c` [d](http://x)"), "a b c d");
    }

    #[test]
    fn inline_ansi_protects_code_span() {
        
        let out = inline_ansi("see `a*b*c` end");
        assert!(out.contains("a*b*c"), "code content preserved: {out}");
        assert!(out.contains("\x1b[92m"), "code span colored bright green");
    }

    #[test]
    fn unicode_in_code_block_does_not_panic() {
        let md = "```ts\nconst s = \"café 日本語 🚀\";\n```";
        let _ = render(md, 80, true); 
    }

    #[test]
    fn strip_ansi_roundtrip_width() {
        let s = "\x1b[1;36mhi\x1b[0m";
        assert_eq!(strip_ansi(s), "hi");
        assert_eq!(visible_width(s), 2);
    }
}
