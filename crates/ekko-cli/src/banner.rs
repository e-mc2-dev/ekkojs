// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



use std::io::IsTerminal;
use unicode_width::UnicodeWidthStr;

fn dwidth(s: &str) -> usize {
    UnicodeWidthStr::width(s)
}

const LOGO_SMALL: [&str; 4] = [
    " ___  _    _           _  ___ ",
    "| __|| |__| |__ ___   | |/ __|",
    "| _| | / /| / // _ \\ _| |\\__ \\",
    "|___||_\\_\\|_\\_\\\\___/|__/ |___/",
];

const SPLIT_SMALL: usize = 20;

const WHITE: &str = "\x1b[97m"; 
const GREEN: &str = "\x1b[38;2;61;214;168m"; 
const BLUE: &str = "\x1b[38;2;88;166;255m"; 
const RESET: &str = "\x1b[0m";

pub fn inline(color: bool) -> String {
    if color {
        format!("{GREEN}--=[ {WHITE}Ekko{GREEN}JS ]=--{RESET}")
    } else {
        "--=[ EkkoJS ]=--".to_string()
    }
}

pub fn version_str(version: &str, color: bool) -> String {
    if color { format!("{BLUE}{version}{RESET}") } else { version.to_string() }
}

fn boxed(content: &[(String, usize)], color: bool) -> String {
    const PAD: usize = 2;
    let inner = content.iter().map(|(_, w)| *w).max().unwrap_or(0);
    let span = inner + PAD * 2;
    let (g, rs) = if color { (GREEN, RESET) } else { ("", "") };
    let rule = |left: char, right: char| -> String {
        let mut s = String::new();
        s.push_str(g);
        s.push(left);
        for _ in 0..span { s.push('─'); }
        s.push(right);
        s.push_str(rs);
        s.push('\n');
        s
    };
    let mut out = String::new();
    out.push_str(&rule('╭', '╮'));
    for (line, vw) in content {
        out.push_str(g); out.push('│'); out.push_str(rs);
        out.push_str("  ");
        out.push_str(line);
        for _ in 0..(inner.saturating_sub(*vw) + PAD) { out.push(' '); }
        out.push_str(g); out.push('│'); out.push_str(rs);
        out.push('\n');
    }
    out.push_str(&rule('╰', '╯'));
    out
}

pub fn help_card(version: &str, color: bool) -> String {
    let mut content: Vec<(String, usize)> = Vec::new();
    for row in LOGO_SMALL {
        let line = if color {
            let at = row.char_indices().nth(SPLIT_SMALL).map(|(i, _)| i).unwrap_or(row.len());
            format!("{WHITE}{}{GREEN}{}{RESET}", &row[..at], &row[at..])
        } else {
            row.to_string()
        };
        content.push((line, 30)); 
    }
    let ver = version_str(version, color);
    content.push((ver, dwidth(version)));
    boxed(&content, color)
}

pub fn repl_card(version: &str, subtitle: &str, color: bool) -> String {
    const INNER: usize = 30; 
    const PAD: usize = 2;
    let span = INNER + PAD * 2;
    let (g, rs) = if color { (GREEN, RESET) } else { ("", "") };

    let mut out = String::with_capacity(512);
    let rule = |out: &mut String, left: char, right: char| {
        out.push_str(g);
        out.push(left);
        for _ in 0..span { out.push('─'); }
        out.push(right);
        out.push_str(rs);
        out.push('\n');
    };

    rule(&mut out, '╭', '╮');
    for row in LOGO_SMALL {
        out.push_str(g); out.push('│'); out.push_str(rs);
        out.push_str("  ");
        if color {
            let at = row.char_indices().nth(SPLIT_SMALL).map(|(i, _)| i).unwrap_or(row.len());
            out.push_str(WHITE); out.push_str(&row[..at]);
            out.push_str(GREEN); out.push_str(&row[at..]); out.push_str(RESET);
        } else {
            out.push_str(row);
        }
        out.push_str("  ");
        out.push_str(g); out.push('│'); out.push_str(rs);
        out.push('\n');
    }

    let visible = dwidth(version) + dwidth(" · ") + dwidth(subtitle);
    let fill = INNER.saturating_sub(visible);
    out.push_str(g); out.push('│'); out.push_str(rs);
    out.push_str("  ");
    if color { out.push_str(BLUE); out.push_str(version); out.push_str(RESET); } else { out.push_str(version); }
    out.push_str(" · ");
    out.push_str(subtitle);
    out.push_str(&" ".repeat(fill));
    out.push_str("  ");
    out.push_str(g); out.push('│'); out.push_str(rs);
    out.push('\n');
    rule(&mut out, '╰', '╯');
    out
}

#[derive(Clone, Copy)]
pub enum Align { Left, Right }

pub fn table(
    headers: &[&str],
    rows: &[Vec<String>],
    aligns: &[Align],
    color: bool,
    cell_color: impl Fn(usize, &str) -> &'static str,
) -> String {
    let ncols = headers.len();
    let mut w: Vec<usize> = headers.iter().map(|h| dwidth(h)).collect();
    for row in rows {
        for (i, c) in row.iter().enumerate().take(ncols) {
            w[i] = w[i].max(dwidth(c));
        }
    }
    let (g, rs, bold) = if color { (GREEN, RESET, "\x1b[1m") } else { ("", "", "") };
    let align_of = |i: usize| aligns.get(i).copied().unwrap_or(Align::Left);

    let rule = |left: char, mid: char, right: char| -> String {
        let mut s = String::new();
        s.push_str(g);
        s.push(left);
        for (i, width) in w.iter().enumerate() {
            for _ in 0..width + 2 { s.push('─'); }
            s.push(if i + 1 == ncols { right } else { mid });
        }
        s.push_str(rs);
        s.push('\n');
        s
    };
    
    let emit = |out: &mut String, i: usize, text: &str, style: &str| {
        let pad = w[i].saturating_sub(dwidth(text));
        out.push(' ');
        if matches!(align_of(i), Align::Right) { for _ in 0..pad { out.push(' '); } }
        out.push_str(style); out.push_str(text); if !style.is_empty() { out.push_str(rs); }
        if matches!(align_of(i), Align::Left) { for _ in 0..pad { out.push(' '); } }
        out.push(' ');
        out.push_str(g); out.push('│'); out.push_str(rs);
    };

    let mut out = String::with_capacity(rows.len() * 64 + 128);
    out.push_str(&rule('╭', '┬', '╮'));
    out.push_str(g); out.push('│'); out.push_str(rs);
    for (i, h) in headers.iter().enumerate() { emit(&mut out, i, h, bold); }
    out.push('\n');
    out.push_str(&rule('├', '┼', '┤'));
    for row in rows {
        out.push_str(g); out.push('│'); out.push_str(rs);
        for i in 0..ncols {
            let val = row.get(i).map(|s| s.as_str()).unwrap_or("");
            let style = if color { cell_color(i, val) } else { "" };
            emit(&mut out, i, val, style);
        }
        out.push('\n');
    }
    out.push_str(&rule('╰', '┴', '╯'));
    out
}

pub fn stdout_color() -> bool {
    std::env::var_os("NO_COLOR").is_none() && std::io::stdout().is_terminal()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn line_art_row_widths_are_fixed() {
        for row in LOGO_SMALL {
            assert_eq!(row.chars().count(), 30, "line-art row width drifted: {row}");
        }
    }

    #[test]
    fn inline_plain_is_exact_and_colored_splits_ekko_js() {
        assert_eq!(inline(false), "--=[ EkkoJS ]=--");
        let c = inline(true);
        
        let wi = c.find(&format!("{WHITE}Ekko")).expect("white Ekko");
        let gi = c.rfind(&format!("{GREEN}JS")).expect("green JS");
        assert!(gi > wi);
        assert!(c.ends_with(RESET));
    }

    #[test]
    fn version_str_is_blue_when_colored() {
        assert_eq!(version_str("v1.2.3", false), "v1.2.3");
        let c = version_str("v1.2.3", true);
        assert!(c.starts_with(BLUE) && c.contains("v1.2.3") && c.ends_with(RESET));
    }

    #[test]
    fn table_is_a_rounded_grid_with_aligned_columns() {
        let t = table(&["Package", "Version"], &[
            vec!["@ekko/asgard".into(), "v1.0.0".into()],
            vec!["@ekko/react".into(), "v0.1.0".into()],
        ], &[Align::Left, Align::Left], false, |_, _| "");
        assert!(!t.contains('\x1b'));
        for ch in ['╭', '┬', '╮', '├', '┼', '┤', '╰', '┴', '╯', '│', '─'] {
            assert!(t.contains(ch), "missing table glyph {ch}");
        }
        
        let widths: Vec<usize> = t.lines().map(|l| l.chars().count()).collect();
        assert_eq!(widths.len(), 6);
        assert!(widths.windows(2).all(|w| w[0] == w[1]), "table rows differ in width: {widths:?}");
        
        assert!(table(&["A"], &[vec!["b".into()]], &[Align::Left], true, |_, _| "").contains(GREEN));
        assert!(table(&["T"], &[vec!["x".into()]], &[Align::Left], true, |_, _| "\x1b[33m").contains("\x1b[33m"));
        
        let r = table(&["N"], &[vec!["7".into()], vec!["123".into()]], &[Align::Right], false, |_, _| "");
        assert!(r.contains("  7 "), "right-aligned cell should pad left: {r:?}");
    }

    #[test]
    fn table_aligns_by_display_width_not_char_count() {
        
        let t = table(&["Name"], &[vec!["📁 dir".into()], vec!["plain".into()]], &[Align::Left], false, |_, _| "");
        let widths: Vec<usize> = t.lines().map(dwidth).collect();
        assert!(widths.windows(2).all(|w| w[0] == w[1]), "display widths must all match: {widths:?}");
        
        assert!(dwidth("📁") == 2 && "📁".chars().count() == 1);
    }

    #[test]
    fn repl_card_is_a_rounded_frame_with_equal_width_lines() {
        let plain = repl_card("v0.0.0", "interactive REPL", false);
        assert!(!plain.contains('\x1b'), "plain card leaked an escape");
        for corner in ['╭', '╮', '╰', '╯'] {
            assert!(plain.contains(corner), "missing corner {corner}");
        }
        
        let widths: Vec<usize> = plain.lines().map(|l| l.chars().count()).collect();
        assert!(widths.windows(2).all(|w| w[0] == w[1]), "card rows differ in width: {widths:?}");
        
        let c = repl_card("v0.0.0", "interactive REPL", true);
        assert!(c.contains(BLUE), "version should be blue");
        assert!(c.contains(GREEN), "frame should be green");
    }
}
