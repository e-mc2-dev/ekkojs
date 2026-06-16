// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::io::Write;
use super::cell::{Cell, Col, Style};
use super::unicode_width::char_width;

const SENTINEL: Cell = Cell {
    ch: '\0',
    fg: Col::DEFAULT,
    bg: Col::DEFAULT,
    style: Style::NONE,
    is_cont: false,
};

pub struct Surface {
    back: Vec<Cell>,
    front: Vec<Cell>,
    width: usize,
    height: usize,
}

impl Surface {
    
    pub fn new(width: usize, height: usize) -> Self {
        let size = width * height;
        let mut s = Surface {
            back: vec![Cell::BLANK; size],
            front: vec![SENTINEL; size],
            width,
            height,
        };
        s.clear();
        s
    }

    pub fn width(&self) -> usize { self.width }
    
    pub fn height(&self) -> usize { self.height }

    pub fn resize(&mut self, w: usize, h: usize) {
        if w == self.width && h == self.height { return; }
        self.width = w;
        self.height = h;
        let size = w * h;
        self.back = vec![Cell::BLANK; size];
        self.front = vec![SENTINEL; size];
    }

    pub fn clear(&mut self) {
        self.back.fill(Cell::BLANK);
    }

    
    pub fn set(&mut self, x: usize, y: usize, ch: char, fg: Col, bg: Col, style: Style) {
        if x >= self.width || y >= self.height { return; }
        let w = char_width(ch);
        if w == 0 { return; }
        self.back[y * self.width + x] = Cell::new(ch, fg, bg, style);
        if w == 2 && x + 1 < self.width {
            self.back[y * self.width + x + 1] = Cell::cont(fg, bg, style);
        }
    }

    pub fn set_cell(&mut self, x: usize, y: usize, cell: Cell) {
        if x >= self.width || y >= self.height { return; }
        self.back[y * self.width + x] = cell;
    }

    
    pub fn write_str(&mut self, x: usize, y: usize, s: &str, fg: Col, bg: Col, style: Style) {
        let mut cx = x;
        for ch in s.chars() {
            let w = char_width(ch);
            if w == 0 { continue; }
            self.set(cx, y, ch, fg, bg, style);
            cx += w;
        }
    }

    pub fn fill(&mut self, x: usize, y: usize, w: usize, h: usize, ch: char, fg: Col, bg: Col) {
        let ch = if (ch as u32) < 0x20 { ' ' } else { ch };
        for yy in 0..h {
            for xx in 0..w {
                self.set(x + xx, y + yy, ch, fg, bg, Style::NONE);
            }
        }
    }

    

    pub fn to_text(&self) -> String {
        let mut out = String::with_capacity(self.width * self.height + self.height);
        for y in 0..self.height {
            for x in 0..self.width {
                let c = &self.back[y * self.width + x];
                if c.is_cont { continue; }
                out.push(c.ch);
            }
            if y + 1 < self.height { out.push('\n'); }
        }
        out
    }

    
    
    pub fn to_debug(&self) -> String {
        let mut out = String::new();
        for y in 0..self.height {
            for x in 0..self.width {
                let c = &self.back[y * self.width + x];
                if x > 0 { out.push(' '); }
                if c.is_cont {
                    out.push_str(">>");
                } else {
                    out.push(if c.ch == ' ' { '·' } else { c.ch });
                    out.push('[');
                    out.push_str(&col_tag(c.fg));
                    out.push('/');
                    out.push_str(&col_tag(c.bg));
                    if c.style != Style::NONE {
                        out.push(':');
                        if c.style.contains(Style::BOLD) { out.push('B'); }
                        if c.style.contains(Style::ITALIC) { out.push('I'); }
                        if c.style.contains(Style::UNDERLINE) { out.push('U'); }
                        if c.style.contains(Style::REVERSE) { out.push('R'); }
                    }
                    out.push(']');
                }
            }
            if y + 1 < self.height { out.push('\n'); }
        }
        out
    }

    
    
    pub fn flush_to_string(&mut self) -> String {
        let mut buf = Vec::new();
        let _ = self.flush(&mut buf);
        String::from_utf8(buf).unwrap_or_default()
    }

    
    pub fn snapshot(&self) -> Vec<Vec<(char, Col, Col, Style, bool)>> {
        (0..self.height).map(|y| {
            (0..self.width).map(|x| {
                let c = &self.back[y * self.width + x];
                (c.ch, c.fg, c.bg, c.style, c.is_cont)
            }).collect()
        }).collect()
    }

    

    pub fn flush(&mut self, writer: &mut dyn Write) -> std::io::Result<()> {
        let mut buf = String::with_capacity(4096);
        let mut sgr_init = false;
        let mut cur_fg = Col::DEFAULT;
        let mut cur_bg = Col::DEFAULT;
        let mut cur_st = Style::NONE;

        for y in 0..self.height {
            for x in 0..self.width {
                let idx = y * self.width + x;
                let b = self.back[idx];
                let f = self.front[idx];
                if b == f { continue; }

                if b.is_cont { self.front[idx] = b; continue; }

                buf.push_str("\x1b[");
                buf.push_str(&(y + 1).to_string());
                buf.push(';');
                buf.push_str(&(x + 1).to_string());
                buf.push('H');

                if !sgr_init || b.fg != cur_fg || b.bg != cur_bg || b.style != cur_st {
                    buf.push_str("\x1b[0");
                    if b.style.contains(Style::BOLD) { buf.push_str(";1"); }
                    if b.style.contains(Style::ITALIC) { buf.push_str(";3"); }
                    if b.style.contains(Style::UNDERLINE) { buf.push_str(";4"); }
                    if b.style.contains(Style::REVERSE) { buf.push_str(";7"); }
                    append_fg(&mut buf, b.fg);
                    append_bg(&mut buf, b.bg);
                    buf.push('m');
                    cur_fg = b.fg;
                    cur_bg = b.bg;
                    cur_st = b.style;
                    sgr_init = true;
                }

                buf.push(b.ch);
                self.front[idx] = b;
            }
        }

        if !buf.is_empty() {
            writer.write_all(buf.as_bytes())?;
            writer.flush()?;
        }
        Ok(())
    }
}

fn append_fg(buf: &mut String, c: Col) {
    if c.is_default() { return; }
    if c.is_named() {
        let n = c.named_index();
        buf.push(';');
        if n < 8 {
            buf.push_str(&(30 + n as u32).to_string());
        } else {
            buf.push_str(&(90 + (n - 8) as u32).to_string());
        }
        return;
    }
    buf.push_str(";38;2;");
    buf.push_str(&c.r().to_string());
    buf.push(';');
    buf.push_str(&c.g().to_string());
    buf.push(';');
    buf.push_str(&c.b().to_string());
}

fn append_bg(buf: &mut String, c: Col) {
    if c.is_default() { buf.push_str(";48;2;0;0;0"); return; }
    if c.is_named() {
        let n = c.named_index();
        buf.push(';');
        if n < 8 {
            buf.push_str(&(40 + n as u32).to_string());
        } else {
            buf.push_str(&(100 + (n - 8) as u32).to_string());
        }
        return;
    }
    buf.push_str(";48;2;");
    buf.push_str(&c.r().to_string());
    buf.push(';');
    buf.push_str(&c.g().to_string());
    buf.push(';');
    buf.push_str(&c.b().to_string());
}

fn col_tag(c: Col) -> String {
    if c.is_default() { return "-".to_string(); }
    if c.is_named() { return format!("n{}", c.named_index()); }
    format!("#{:02x}{:02x}{:02x}", c.r(), c.g(), c.b())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_surface_dimensions() {
        let s = Surface::new(80, 25);
        assert_eq!(s.width(), 80);
        assert_eq!(s.height(), 25);
    }

    #[test]
    fn flush_empty_surface() {
        let mut s = Surface::new(3, 1);
        s.clear();
        let mut out = Vec::new();
        
        s.flush(&mut out).unwrap();
        let output = String::from_utf8(out).unwrap();
        assert!(output.contains("\x1b[1;1H"));
        assert!(output.contains("\x1b[1;2H"));
        assert!(output.contains("\x1b[1;3H"));
    }

    #[test]
    fn flush_single_char() {
        let mut s = Surface::new(5, 1);
        
        let mut out = Vec::new();
        s.flush(&mut out).unwrap();
        s.clear();
        s.set(2, 0, 'X', Col::RED, Col::DEFAULT, Style::BOLD);
        let mut out = Vec::new();
        s.flush(&mut out).unwrap();
        let output = String::from_utf8(out).unwrap();
        assert!(output.contains("\x1b[1;3H"));
        assert!(output.contains(";1")); 
        assert!(output.contains(";31")); 
        assert!(output.contains('X'));
    }

    #[test]
    fn flush_wide_char() {
        let mut s = Surface::new(5, 1);
        let mut out = Vec::new();
        s.flush(&mut out).unwrap();
        s.clear();
        s.set(1, 0, '\u{4E00}', Col::DEFAULT, Col::DEFAULT, Style::NONE); 
        let mut out = Vec::new();
        s.flush(&mut out).unwrap();
        let output = String::from_utf8(out).unwrap();
        
        assert!(output.contains("\x1b[1;2H"));
        assert!(output.contains('\u{4E00}'));
    }

    #[test]
    fn flush_skips_unchanged() {
        let mut s = Surface::new(3, 1);
        s.set(0, 0, 'A', Col::DEFAULT, Col::DEFAULT, Style::NONE);
        let mut out = Vec::new();
        s.flush(&mut out).unwrap();
        
        s.set(2, 0, 'C', Col::DEFAULT, Col::DEFAULT, Style::NONE);
        let mut out = Vec::new();
        s.flush(&mut out).unwrap();
        let output = String::from_utf8(out).unwrap();
        
        assert!(!output.contains("\x1b[1;1H"));
        
        assert!(output.contains("\x1b[1;3H"));
    }

    #[test]
    fn flush_attribute_change() {
        let mut s = Surface::new(2, 1);
        let mut out = Vec::new();
        s.flush(&mut out).unwrap();
        s.clear();
        s.set(0, 0, 'A', Col::RED, Col::DEFAULT, Style::NONE);
        s.set(1, 0, 'B', Col::GREEN, Col::DEFAULT, Style::BOLD);
        let mut out = Vec::new();
        s.flush(&mut out).unwrap();
        let output = String::from_utf8(out).unwrap();
        
        assert!(output.contains(";31")); 
        assert!(output.contains(";32")); 
        assert!(output.contains(";1"));  
    }

    #[test]
    fn flush_rgb_colors() {
        let mut s = Surface::new(1, 1);
        let mut out = Vec::new();
        s.flush(&mut out).unwrap();
        s.clear();
        s.set(0, 0, 'X', Col::rgb(255, 128, 0), Col::rgb(0, 0, 64), Style::NONE);
        let mut out = Vec::new();
        s.flush(&mut out).unwrap();
        let output = String::from_utf8(out).unwrap();
        assert!(output.contains(";38;2;255;128;0"));
        assert!(output.contains(";48;2;0;0;64"));
    }

    #[test]
    fn flush_bright_named_colors() {
        let mut s = Surface::new(1, 1);
        let mut out = Vec::new();
        s.flush(&mut out).unwrap();
        s.clear();
        s.set(0, 0, 'X', Col::BRIGHT_RED, Col::BRIGHT_BLUE, Style::NONE);
        let mut out = Vec::new();
        s.flush(&mut out).unwrap();
        let output = String::from_utf8(out).unwrap();
        assert!(output.contains(";91")); 
        assert!(output.contains(";104")); 
    }

    #[test]
    fn write_str_advances_by_width() {
        let mut s = Surface::new(10, 1);
        s.write_str(0, 0, "A\u{4E00}B", Col::DEFAULT, Col::DEFAULT, Style::NONE);
        
        assert_eq!(s.back[0].ch, 'A');
        assert_eq!(s.back[1].ch, '\u{4E00}');
        assert!(s.back[2].is_cont);
        assert_eq!(s.back[3].ch, 'B');
    }

    #[test]
    fn resize_clears_buffers() {
        let mut s = Surface::new(5, 5);
        s.set(0, 0, 'X', Col::DEFAULT, Col::DEFAULT, Style::NONE);
        s.resize(3, 3);
        assert_eq!(s.width(), 3);
        assert_eq!(s.height(), 3);
        assert_eq!(s.back[0], Cell::BLANK);
    }

    #[test]
    fn set_out_of_bounds_ignored() {
        let mut s = Surface::new(3, 3);
        s.set(10, 10, 'X', Col::DEFAULT, Col::DEFAULT, Style::NONE);
        
    }

    #[test]
    fn wide_char_at_right_edge() {
        let mut s = Surface::new(3, 1);
        s.set(2, 0, '\u{4E00}', Col::DEFAULT, Col::DEFAULT, Style::NONE);
        
        assert_eq!(s.back[2].ch, '\u{4E00}');
        
    }

    #[test]
    fn fill_area() {
        let mut s = Surface::new(5, 5);
        s.fill(1, 1, 2, 2, '#', Col::GREEN, Col::DEFAULT);
        assert_eq!(s.back[1 * 5 + 1].ch, '#');
        assert_eq!(s.back[1 * 5 + 2].ch, '#');
        assert_eq!(s.back[2 * 5 + 1].ch, '#');
        assert_eq!(s.back[2 * 5 + 2].ch, '#');
        assert_eq!(s.back[0].ch, ' '); 
    }

    #[test]
    fn vli_to_text_basic() {
        let mut s = Surface::new(10, 2);
        s.write_str(0, 0, "Hello", Col::DEFAULT, Col::DEFAULT, Style::NONE);
        s.write_str(0, 1, "World", Col::DEFAULT, Col::DEFAULT, Style::NONE);
        let text = s.to_text();
        assert_eq!(text, "Hello     \nWorld     ");
    }

    #[test]
    fn vli_to_text_wide_chars() {
        let mut s = Surface::new(8, 1);
        
        s.write_str(0, 0, "A\u{4E00}B", Col::DEFAULT, Col::DEFAULT, Style::NONE);
        let text = s.to_text();
        
        assert_eq!(text, "A\u{4E00}B    ");
    }

    #[test]
    fn vli_to_debug_shows_colors() {
        let mut s = Surface::new(3, 1);
        s.set(0, 0, 'R', Col::RED, Col::DEFAULT, Style::BOLD);
        s.set(1, 0, 'G', Col::GREEN, Col::BLUE, Style::NONE);
        s.set(2, 0, ' ', Col::DEFAULT, Col::DEFAULT, Style::NONE);
        let dbg = s.to_debug();
        assert!(dbg.contains("R[n1/-:B]"));  
        assert!(dbg.contains("G[n2/n4]"));   
        assert!(dbg.contains("·[-/-]"));     
    }

    #[test]
    fn vli_to_debug_wide_continuation() {
        let mut s = Surface::new(4, 1);
        s.set(0, 0, '\u{4E00}', Col::DEFAULT, Col::DEFAULT, Style::NONE);
        let dbg = s.to_debug();
        
        assert!(dbg.contains('\u{4E00}'));
        assert!(dbg.contains(">>"));
    }

    #[test]
    fn vli_flush_to_string_captures_ansi() {
        let mut s = Surface::new(3, 1);
        let ansi = s.flush_to_string();
        
        assert!(ansi.contains("\x1b[1;1H"));

        
        assert!(ansi.contains("\x1b[0"));
    }

    #[test]
    fn vli_flush_to_string_diff_only() {
        let mut s = Surface::new(5, 1);
        let _ = s.flush_to_string(); 
        s.set(3, 0, 'X', Col::CYAN, Col::DEFAULT, Style::ITALIC);
        let ansi = s.flush_to_string();
        
        assert!(ansi.contains("\x1b[1;4H")); 
        assert!(ansi.contains(";3"));        
        assert!(ansi.contains(";36"));       
        assert!(ansi.contains('X'));
        
        assert!(!ansi.contains("\x1b[1;1H"));
    }

    #[test]
    fn vli_snapshot_roundtrip() {
        let mut s = Surface::new(4, 2);
        s.set(0, 0, 'A', Col::RED, Col::DEFAULT, Style::BOLD);
        s.set(1, 0, '\u{4E00}', Col::GREEN, Col::DEFAULT, Style::NONE);
        
        s.set(3, 0, 'B', Col::DEFAULT, Col::DEFAULT, Style::NONE);
        let snap = s.snapshot();
        assert_eq!(snap.len(), 2);
        assert_eq!(snap[0].len(), 4);
        assert_eq!(snap[0][0].0, 'A');
        assert_eq!(snap[0][0].1, Col::RED);
        assert_eq!(snap[0][0].3, Style::BOLD);
        assert_eq!(snap[0][1].0, '\u{4E00}');
        assert!(snap[0][2].4); 
        assert_eq!(snap[0][3].0, 'B');
        
        assert_eq!(snap[1][0].0, ' ');
    }

    #[test]
    fn vli_full_pipeline() {
        let mut s = Surface::new(20, 3);
        s.write_str(0, 0, "fn main() {", Col::CYAN, Col::DEFAULT, Style::BOLD);
        s.write_str(4, 1, "println!(\"hi\");", Col::GREEN, Col::DEFAULT, Style::NONE);
        s.write_str(0, 2, "}", Col::CYAN, Col::DEFAULT, Style::BOLD);

        let text = s.to_text();
        assert!(text.contains("fn main() {"));
        assert!(text.contains("println!(\"hi\");"));
        assert!(text.contains('}'));

        let dbg = s.to_debug();
        assert!(dbg.contains("f[n6/-:B]")); 
        assert!(dbg.contains("p[n2/-]"));   

        let ansi = s.flush_to_string();
        assert!(ansi.contains(";36")); 
        assert!(ansi.contains(";32")); 
        assert!(ansi.contains(";1"));  

        let snap = s.snapshot();
        assert_eq!(snap[0][0].0, 'f');
        assert_eq!(snap[0][0].1, Col::CYAN);
        assert_eq!(snap[0][0].3, Style::BOLD);
        assert_eq!(snap[1][4].0, 'p');
        assert_eq!(snap[1][4].1, Col::GREEN);
    }

    #[test]
    fn vli_mixed_widths_and_styles() {
        let mut s = Surface::new(12, 1);
        s.set(0, 0, 'H', Col::RED, Col::DEFAULT, Style::BOLD);
        s.set(1, 0, '\u{4E00}', Col::GREEN, Col::DEFAULT, Style::NONE); 
        
        s.set(3, 0, 'i', Col::BLUE, Col::rgb(32, 32, 32), Style::ITALIC);

        let text = s.to_text();
        assert_eq!(&text[..1], "H");
        assert!(text.contains('\u{4E00}'));
        assert!(text.contains('i'));

        let dbg = s.to_debug();
        assert!(dbg.contains("H[n1/-:B]"));
        assert!(dbg.contains(">>"));
        assert!(dbg.contains("i[n4/#202020:I]"));

        let snap = s.snapshot();
        assert!(!snap[0][0].4); 
        assert!(snap[0][2].4);  
        assert_eq!(snap[0][3].2, Col::rgb(32, 32, 32)); 
    }
}
