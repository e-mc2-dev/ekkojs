// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use super::cell::{Cell, Col, Style};
use super::unicode_width::char_width;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum State { Ground, Esc, Csi, Osc, OscEsc }

pub struct AnsiParser {
    cols: usize,
    rows: usize,
    grid: Vec<Cell>,
    pub cursor_x: usize,
    pub cursor_y: usize,
    pub cursor_visible: bool,

    fg: Col,
    bg: Col,
    style: Style,

    saved_x: usize,
    saved_y: usize,
    scroll_top: usize,
    scroll_bot: usize,

    state: State,
    params: String,
    csi_private: u8,

    utf8_acc: u32,
    utf8_need: u8,
}

impl AnsiParser {
    
    pub fn new(cols: usize, rows: usize) -> Self {
        let cols = cols.max(1);
        let rows = rows.max(1);
        let mut p = AnsiParser {
            cols, rows,
            grid: vec![Cell::BLANK; cols * rows],
            cursor_x: 0, cursor_y: 0,
            cursor_visible: true,
            fg: Col::DEFAULT, bg: Col::DEFAULT, style: Style::NONE,
            saved_x: 0, saved_y: 0,
            scroll_top: 0, scroll_bot: rows - 1,
            state: State::Ground,
            params: String::new(),
            csi_private: 0,
            utf8_acc: 0, utf8_need: 0,
        };
        p.clear();
        p
    }

    pub fn cols(&self) -> usize { self.cols }
    
    pub fn rows(&self) -> usize { self.rows }
    
    pub fn grid(&self) -> &[Cell] { &self.grid }

    pub fn cell(&self, x: usize, y: usize) -> Cell {
        if x < self.cols && y < self.rows { self.grid[y * self.cols + x] } else { Cell::BLANK }
    }

    pub fn resize(&mut self, cols: usize, rows: usize) {
        let cols = cols.max(1);
        let rows = rows.max(1);
        if cols == self.cols && rows == self.rows { return; }
        let mut fresh = vec![Cell::BLANK; cols * rows];
        let copy_rows = self.rows.min(rows);
        let copy_cols = self.cols.min(cols);
        for y in 0..copy_rows {
            for x in 0..copy_cols {
                fresh[y * cols + x] = self.grid[y * self.cols + x];
            }
        }
        self.cols = cols;
        self.rows = rows;
        self.grid = fresh;
        self.scroll_top = 0;
        self.scroll_bot = rows - 1;
        if self.cursor_x >= cols { self.cursor_x = cols - 1; }
        if self.cursor_y >= rows { self.cursor_y = rows - 1; }
    }

    pub fn clear(&mut self) {
        self.grid.fill(Cell::BLANK);
        self.cursor_x = 0;
        self.cursor_y = 0;
    }

    pub fn feed(&mut self, bytes: &[u8]) {
        for &b in bytes {
            self.feed_byte(b);
        }
    }

    fn feed_byte(&mut self, b: u8) {
        match self.state {
            State::Ground => self.handle_ground(b),
            State::Esc => self.handle_esc(b),
            State::Csi => self.handle_csi(b),
            State::Osc => {
                if b == 0x07 { self.state = State::Ground; self.params.clear(); }
                else if b == 0x1b { self.state = State::OscEsc; }
                else { self.params.push(b as char); }
            }
            State::OscEsc => { self.state = State::Ground; self.params.clear(); }
        }
    }

    
    fn handle_ground(&mut self, b: u8) {
        if self.utf8_need > 0 && (b & 0xC0) == 0x80 {
            self.utf8_acc = (self.utf8_acc << 6) | (b & 0x3F) as u32;
            self.utf8_need -= 1;
            if self.utf8_need == 0 { self.write_code_point(self.utf8_acc); }
            return;
        }
        if self.utf8_need > 0 {
            self.utf8_need = 0;
            self.write_char('\u{FFFD}');
        }

        match b {
            0x1b => { self.state = State::Esc; return; }
            0x0d => { self.cursor_x = 0; return; }
            0x0a => { self.line_feed(); return; }
            0x08 => { if self.cursor_x > 0 { self.cursor_x -= 1; } return; }
            0x09 => {
                self.cursor_x = (self.cols - 1).min((self.cursor_x & !7) + 8);
                return;
            }
            0x07 | 0x00 => { return; }
            _ if b < 0x20 => { return; }
            _ => {}
        }

        if b < 0x80 {
            self.write_char(b as char);
            return;
        }

        if b & 0xE0 == 0xC0 { self.utf8_acc = (b & 0x1F) as u32; self.utf8_need = 1; }
        else if b & 0xF0 == 0xE0 { self.utf8_acc = (b & 0x0F) as u32; self.utf8_need = 2; }
        else if b & 0xF8 == 0xF0 { self.utf8_acc = (b & 0x07) as u32; self.utf8_need = 3; }
        else { self.write_char('\u{FFFD}'); }
    }

    fn write_code_point(&mut self, cp: u32) {
        if let Some(ch) = char::from_u32(cp) {
            self.write_char(ch);
        } else {
            self.write_char('\u{FFFD}');
        }
    }

    fn handle_esc(&mut self, b: u8) {
        match b {
            b'[' => { self.state = State::Csi; self.params.clear(); self.csi_private = 0; }
            b']' => { self.state = State::Osc; self.params.clear(); }
            b'7' => { self.saved_x = self.cursor_x; self.saved_y = self.cursor_y; self.state = State::Ground; }
            b'8' => { self.cursor_x = self.saved_x; self.cursor_y = self.saved_y; self.state = State::Ground; }
            b'M' => {
                if self.cursor_y > self.scroll_top { self.cursor_y -= 1; }
                else { self.scroll_down(); }
                self.state = State::Ground;
            }
            _ => { self.state = State::Ground; }
        }
    }

    fn handle_csi(&mut self, b: u8) {
        if b >= 0x30 && b <= 0x3f {
            if self.params.is_empty() && matches!(b, b'?' | b'>' | b'<' | b'=') {
                self.csi_private = b;
                return;
            }
            self.params.push(b as char);
            return;
        }
        if b >= 0x20 && b <= 0x2f { return; }
        if b >= 0x40 && b <= 0x7e {
            self.dispatch_csi(b as char);
            self.state = State::Ground;
            self.params.clear();
            self.csi_private = 0;
        }
    }

    fn dispatch_csi(&mut self, final_ch: char) {
        let params_owned = self.params.clone();
        let parts: Vec<&str> = params_owned.split(';').collect();
        let pn = |idx: usize, dflt: i32| -> i32 {
            parts.get(idx).and_then(|s| s.parse().ok()).unwrap_or(dflt)
        };

        if self.csi_private == b'?' {
            let mode = pn(0, 0);
            let set = final_ch == 'h';
            if mode == 25 { self.cursor_visible = set; return; }
            if mode == 1049 { self.clear(); return; }
            return;
        }

        match final_ch {
            'A' => { self.cursor_y = self.cursor_y.saturating_sub(pn(0, 1).max(1) as usize); }
            'B' => { self.cursor_y = (self.rows - 1).min(self.cursor_y + pn(0, 1).max(1) as usize); }
            'C' => { self.cursor_x = (self.cols - 1).min(self.cursor_x + pn(0, 1).max(1) as usize); }
            'D' => { self.cursor_x = self.cursor_x.saturating_sub(pn(0, 1).max(1) as usize); }
            'E' => { self.cursor_y = (self.rows - 1).min(self.cursor_y + pn(0, 1).max(1) as usize); self.cursor_x = 0; }
            'F' => { self.cursor_y = self.cursor_y.saturating_sub(pn(0, 1).max(1) as usize); self.cursor_x = 0; }
            'G' => { self.cursor_x = ((pn(0, 1) - 1).max(0) as usize).min(self.cols - 1); }
            'H' | 'f' => {
                self.cursor_y = ((pn(0, 1) - 1).max(0) as usize).min(self.rows - 1);
                self.cursor_x = ((pn(1, 1) - 1).max(0) as usize).min(self.cols - 1);
            }
            'd' => { self.cursor_y = ((pn(0, 1) - 1).max(0) as usize).min(self.rows - 1); }
            'J' => { self.erase_in_display(pn(0, 0)); }
            'K' => { self.erase_in_line(pn(0, 0)); }
            'L' => { self.insert_lines(pn(0, 1).max(1) as usize); }
            'M' => { self.delete_lines(pn(0, 1).max(1) as usize); }
            'P' => { self.delete_chars(pn(0, 1).max(1) as usize); }
            'X' => { self.erase_chars(pn(0, 1).max(1) as usize); }
            'r' => {
                self.scroll_top = (pn(0, 1) - 1).max(0) as usize;
                self.scroll_bot = ((pn(1, self.rows as i32) - 1).max(0) as usize).min(self.rows - 1);
            }
            'm' => { self.apply_sgr(&parts); }
            's' => { self.saved_x = self.cursor_x; self.saved_y = self.cursor_y; }
            'u' => { self.cursor_x = self.saved_x; self.cursor_y = self.saved_y; }
            _ => {}
        }
    }

    fn apply_sgr(&mut self, parts: &[&str]) {
        if parts.is_empty() || (parts.len() == 1 && parts[0].is_empty()) {
            self.fg = Col::DEFAULT; self.bg = Col::DEFAULT; self.style = Style::NONE;
            return;
        }
        let mut i = 0;
        while i < parts.len() {
            let n: i32 = parts[i].parse().unwrap_or(0);
            match n {
                0 => { self.fg = Col::DEFAULT; self.bg = Col::DEFAULT; self.style = Style::NONE; }
                1 => { self.style = self.style | Style::BOLD; }
                3 => { self.style = self.style | Style::ITALIC; }
                4 => { self.style = self.style | Style::UNDERLINE; }
                7 => { self.style = self.style | Style::REVERSE; }
                22 => { self.style = self.style.without(Style::BOLD); }
                23 => { self.style = self.style.without(Style::ITALIC); }
                24 => { self.style = self.style.without(Style::UNDERLINE); }
                27 => { self.style = self.style.without(Style::REVERSE); }
                30..=37 => { self.fg = Col::named((n - 30) as u8); }
                38 => {
                    if i + 2 < parts.len() && parts[i + 1] == "5" {
                        if let Ok(idx) = parts[i + 2].parse::<i32>() {
                            self.fg = index_256_to_col(idx);
                            i += 2;
                        }
                    } else if i + 4 < parts.len() && parts[i + 1] == "2" {
                        if let (Ok(r), Ok(g), Ok(b)) = (
                            parts[i + 2].parse::<u8>(),
                            parts[i + 3].parse::<u8>(),
                            parts[i + 4].parse::<u8>(),
                        ) {
                            self.fg = Col::rgb(r, g, b);
                            i += 4;
                        }
                    }
                }
                39 => { self.fg = Col::DEFAULT; }
                40..=47 => { self.bg = Col::named((n - 40) as u8); }
                48 => {
                    if i + 2 < parts.len() && parts[i + 1] == "5" {
                        if let Ok(idx) = parts[i + 2].parse::<i32>() {
                            self.bg = index_256_to_col(idx);
                            i += 2;
                        }
                    } else if i + 4 < parts.len() && parts[i + 1] == "2" {
                        if let (Ok(r), Ok(g), Ok(b)) = (
                            parts[i + 2].parse::<u8>(),
                            parts[i + 3].parse::<u8>(),
                            parts[i + 4].parse::<u8>(),
                        ) {
                            self.bg = Col::rgb(r, g, b);
                            i += 4;
                        }
                    }
                }
                49 => { self.bg = Col::DEFAULT; }
                90..=97 => { self.fg = Col::named(8 + (n - 90) as u8); }
                100..=107 => { self.bg = Col::named(8 + (n - 100) as u8); }
                _ => {}
            }
            i += 1;
        }
    }

    fn write_char(&mut self, ch: char) {
        if self.cursor_x >= self.cols {
            self.cursor_x = 0;
            self.line_feed();
        }
        let w = char_width(ch);
        if w == 0 { return; }
        self.grid[self.cursor_y * self.cols + self.cursor_x] =
            Cell::new(ch, self.fg, self.bg, self.style);
        self.cursor_x += 1;
        if w == 2 && self.cursor_x < self.cols {
            self.grid[self.cursor_y * self.cols + self.cursor_x] =
                Cell::cont(self.fg, self.bg, self.style);
            self.cursor_x += 1;
        }
    }

    fn line_feed(&mut self) {
        self.cursor_y += 1;
        if self.cursor_y > self.scroll_bot {
            self.scroll_up();
            self.cursor_y = self.scroll_bot;
        }
    }

    fn scroll_up(&mut self) {
        for y in self.scroll_top..self.scroll_bot {
            for x in 0..self.cols {
                self.grid[y * self.cols + x] = self.grid[(y + 1) * self.cols + x];
            }
        }
        for x in 0..self.cols {
            self.grid[self.scroll_bot * self.cols + x] = Cell::BLANK;
        }
    }

    fn scroll_down(&mut self) {
        for y in (self.scroll_top + 1..=self.scroll_bot).rev() {
            for x in 0..self.cols {
                self.grid[y * self.cols + x] = self.grid[(y - 1) * self.cols + x];
            }
        }
        for x in 0..self.cols {
            self.grid[self.scroll_top * self.cols + x] = Cell::BLANK;
        }
    }

    fn erase_in_line(&mut self, mode: i32) {
        let row = self.cursor_y;
        match mode {
            0 => { for x in self.cursor_x..self.cols { self.grid[row * self.cols + x] = Cell::BLANK; } }
            1 => { for x in 0..=self.cursor_x.min(self.cols - 1) { self.grid[row * self.cols + x] = Cell::BLANK; } }
            2 => { for x in 0..self.cols { self.grid[row * self.cols + x] = Cell::BLANK; } }
            _ => {}
        }
    }

    fn erase_in_display(&mut self, mode: i32) {
        match mode {
            0 => {
                self.erase_in_line(0);
                for y in (self.cursor_y + 1)..self.rows {
                    for x in 0..self.cols { self.grid[y * self.cols + x] = Cell::BLANK; }
                }
            }
            1 => {
                for y in 0..self.cursor_y {
                    for x in 0..self.cols { self.grid[y * self.cols + x] = Cell::BLANK; }
                }
                self.erase_in_line(1);
            }
            2 | 3 => { self.clear(); }
            _ => {}
        }
    }

    fn erase_chars(&mut self, n: usize) {
        for i in 0..n {
            if self.cursor_x + i < self.cols {
                self.grid[self.cursor_y * self.cols + self.cursor_x + i] = Cell::BLANK;
            }
        }
    }

    fn delete_chars(&mut self, n: usize) {
        let row = self.cursor_y;
        if n >= self.cols.saturating_sub(self.cursor_x) {
            for x in self.cursor_x..self.cols { self.grid[row * self.cols + x] = Cell::BLANK; }
            return;
        }
        for x in self.cursor_x..self.cols.saturating_sub(n) {
            self.grid[row * self.cols + x] = self.grid[row * self.cols + x + n];
        }
        for x in self.cols.saturating_sub(n)..self.cols {
            self.grid[row * self.cols + x] = Cell::BLANK;
        }
    }

    fn insert_lines(&mut self, n: usize) {
        let bot = self.scroll_bot;
        if self.cursor_y + n <= bot {
            for y in (self.cursor_y + n..=bot).rev() {
                for x in 0..self.cols {
                    self.grid[y * self.cols + x] = self.grid[(y - n) * self.cols + x];
                }
            }
        }
        for y in self.cursor_y..(self.cursor_y + n).min(self.rows) {
            for x in 0..self.cols { self.grid[y * self.cols + x] = Cell::BLANK; }
        }
    }

    fn delete_lines(&mut self, n: usize) {
        let bot = self.scroll_bot;
        if bot >= n {
            for y in self.cursor_y..=bot.saturating_sub(n) {
                for x in 0..self.cols {
                    self.grid[y * self.cols + x] = self.grid[(y + n) * self.cols + x];
                }
            }
        }
        let start = if bot >= n { bot - n + 1 } else { 0 };
        for y in start..=bot {
            for x in 0..self.cols { self.grid[y * self.cols + x] = Cell::BLANK; }
        }
    }

    pub fn to_text(&self) -> String {
        let mut out = String::new();
        for y in 0..self.rows {
            for x in 0..self.cols {
                let c = &self.grid[y * self.cols + x];
                if c.is_cont { continue; }
                out.push(c.ch);
            }
            if y + 1 < self.rows { out.push('\n'); }
        }
        out
    }
}

fn index_256_to_col(idx: i32) -> Col {
    if idx < 16 { return Col::named(idx as u8); }
    if idx >= 232 {
        let v = (8 + (idx - 232) * 10) as u8;
        return Col::rgb(v, v, v);
    }
    let idx = idx - 16;
    const STEPS: [u8; 6] = [0, 95, 135, 175, 215, 255];
    let r = STEPS[(idx / 36) as usize];
    let g = STEPS[((idx / 6) % 6) as usize];
    let b = STEPS[(idx % 6) as usize];
    Col::rgb(r, g, b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plain_text() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"Hello");
        assert_eq!(p.cell(0, 0).ch, 'H');
        assert_eq!(p.cell(4, 0).ch, 'o');
        assert_eq!(p.cursor_x, 5);
    }

    #[test]
    fn cr_lf() {
        let mut p = AnsiParser::new(10, 3);
        p.feed(b"AB\r\nCD");  
        assert_eq!(p.cell(0, 0).ch, 'A');
        assert_eq!(p.cell(1, 0).ch, 'B');
        assert_eq!(p.cell(0, 1).ch, 'C');
        assert_eq!(p.cell(1, 1).ch, 'D');
    }

    #[test]
    fn backspace() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"AB\x08C");
        assert_eq!(p.cell(0, 0).ch, 'A');
        assert_eq!(p.cell(1, 0).ch, 'C');
    }

    #[test]
    fn tab_stop() {
        let mut p = AnsiParser::new(20, 1);
        p.feed(b"A\tB");
        assert_eq!(p.cell(0, 0).ch, 'A');
        assert_eq!(p.cursor_x, 9); 
        assert_eq!(p.cell(8, 0).ch, 'B');
    }

    #[test]
    fn sgr_bold_red() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"\x1b[1;31mX");
        let c = p.cell(0, 0);
        assert_eq!(c.ch, 'X');
        assert!(c.style.contains(Style::BOLD));
        assert_eq!(c.fg, Col::RED);
    }

    #[test]
    fn sgr_reset() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"\x1b[1;31mA\x1b[0mB");
        let a = p.cell(0, 0);
        assert!(a.style.contains(Style::BOLD));
        assert_eq!(a.fg, Col::RED);
        let b = p.cell(1, 0);
        assert_eq!(b.style, Style::NONE);
        assert!(b.fg.is_default());
    }

    #[test]
    fn sgr_rgb() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"\x1b[38;2;255;128;0mX");
        assert_eq!(p.cell(0, 0).fg, Col::rgb(255, 128, 0));
    }

    #[test]
    fn sgr_256_color() {
        let mut p = AnsiParser::new(10, 1);
        
        p.feed(b"\x1b[38;5;196mX");
        assert_eq!(p.cell(0, 0).fg, Col::rgb(255, 0, 0));
    }

    #[test]
    fn sgr_bright_colors() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"\x1b[91mA\x1b[102mB");
        assert_eq!(p.cell(0, 0).fg, Col::BRIGHT_RED);
        assert_eq!(p.cell(1, 0).bg, Col::BRIGHT_GREEN);
    }

    #[test]
    fn sgr_named_bg() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"\x1b[44mX");
        assert_eq!(p.cell(0, 0).bg, Col::BLUE);
    }

    #[test]
    fn sgr_256_grayscale() {
        let mut p = AnsiParser::new(10, 1);
        
        p.feed(b"\x1b[38;5;240mX");
        assert_eq!(p.cell(0, 0).fg, Col::rgb(88, 88, 88));
    }

    #[test]
    fn cursor_cup() {
        let mut p = AnsiParser::new(10, 5);
        p.feed(b"\x1b[3;5H");
        assert_eq!(p.cursor_y, 2);
        assert_eq!(p.cursor_x, 4);
    }

    #[test]
    fn cursor_movement() {
        let mut p = AnsiParser::new(10, 10);
        p.feed(b"\x1b[5;5H"); 
        p.feed(b"\x1b[2A");   
        assert_eq!(p.cursor_y, 2);
        p.feed(b"\x1b[3C");   
        assert_eq!(p.cursor_x, 7);
        p.feed(b"\x1b[1D");   
        assert_eq!(p.cursor_x, 6);
        p.feed(b"\x1b[1B");   
        assert_eq!(p.cursor_y, 3);
    }

    #[test]
    fn erase_in_line_to_end() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"ABCDEFGHIJ");
        p.feed(b"\x1b[5G\x1b[K"); 
        assert_eq!(p.cell(3, 0).ch, 'D');
        assert_eq!(p.cell(4, 0).ch, ' ');
        assert_eq!(p.cell(9, 0).ch, ' ');
    }

    #[test]
    fn erase_in_line_whole() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"ABCDEFGHIJ");
        p.feed(b"\x1b[2K");
        for x in 0..10 { assert_eq!(p.cell(x, 0).ch, ' '); }
    }

    #[test]
    fn erase_in_display() {
        let mut p = AnsiParser::new(5, 3);
        p.feed(b"AAAAA\r\nBBBBB\r\nCCCCC");
        p.feed(b"\x1b[2;3H\x1b[J"); 
        assert_eq!(p.cell(0, 0).ch, 'A'); 
        assert_eq!(p.cell(1, 1).ch, 'B'); 
        assert_eq!(p.cell(2, 1).ch, ' '); 
        assert_eq!(p.cell(0, 2).ch, ' '); 
    }

    #[test]
    fn scroll_on_overflow() {
        let mut p = AnsiParser::new(5, 3);
        p.feed(b"AAA\r\nBBB\r\nCCC\r\nDDD");
        
        assert_eq!(p.cell(0, 0).ch, 'B');
        assert_eq!(p.cell(0, 1).ch, 'C');
        assert_eq!(p.cell(0, 2).ch, 'D');
    }

    #[test]
    fn line_wrap() {
        let mut p = AnsiParser::new(3, 2);
        p.feed(b"ABCDE");
        assert_eq!(p.cell(0, 0).ch, 'A');
        assert_eq!(p.cell(2, 0).ch, 'C');
        assert_eq!(p.cell(0, 1).ch, 'D');
        assert_eq!(p.cell(1, 1).ch, 'E');
    }

    #[test]
    fn utf8_multibyte() {
        let mut p = AnsiParser::new(10, 1);
        p.feed("é".as_bytes()); 
        assert_eq!(p.cell(0, 0).ch, 'é');
        assert_eq!(p.cursor_x, 1);
    }

    #[test]
    fn utf8_cjk_wide() {
        let mut p = AnsiParser::new(10, 1);
        p.feed("一".as_bytes()); 
        assert_eq!(p.cell(0, 0).ch, '一');
        assert!(p.cell(1, 0).is_cont);
        assert_eq!(p.cursor_x, 2);
    }

    #[test]
    fn utf8_emoji() {
        let mut p = AnsiParser::new(10, 1);
        p.feed("🚀".as_bytes()); 
        assert_eq!(p.cell(0, 0).ch, '🚀');
        assert!(p.cell(1, 0).is_cont);
        assert_eq!(p.cursor_x, 2);
    }

    #[test]
    fn save_restore_cursor() {
        let mut p = AnsiParser::new(10, 5);
        p.feed(b"\x1b[3;4H\x1b7"); 
        p.feed(b"\x1b[1;1H"); 
        assert_eq!(p.cursor_y, 0);
        p.feed(b"\x1b8"); 
        assert_eq!(p.cursor_y, 2);
        assert_eq!(p.cursor_x, 3);
    }

    #[test]
    fn cursor_visibility() {
        let mut p = AnsiParser::new(10, 1);
        assert!(p.cursor_visible);
        p.feed(b"\x1b[?25l");
        assert!(!p.cursor_visible);
        p.feed(b"\x1b[?25h");
        assert!(p.cursor_visible);
    }

    #[test]
    fn osc_title_ignored() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"\x1b]0;My Title\x07AB");
        assert_eq!(p.cell(0, 0).ch, 'A');
        assert_eq!(p.cell(1, 0).ch, 'B');
    }

    #[test]
    fn osc_st_terminator() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"\x1b]0;Title\x1b\\X");
        assert_eq!(p.cell(0, 0).ch, 'X');
    }

    #[test]
    fn delete_chars() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"ABCDE");
        p.feed(b"\x1b[2G\x1b[2P"); 
        assert_eq!(p.cell(0, 0).ch, 'A');
        assert_eq!(p.cell(1, 0).ch, 'D');
        assert_eq!(p.cell(2, 0).ch, 'E');
        assert_eq!(p.cell(3, 0).ch, ' ');
    }

    #[test]
    fn erase_chars() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"ABCDE");
        p.feed(b"\x1b[2G\x1b[3X"); 
        assert_eq!(p.cell(0, 0).ch, 'A');
        assert_eq!(p.cell(1, 0).ch, ' ');
        assert_eq!(p.cell(2, 0).ch, ' ');
        assert_eq!(p.cell(3, 0).ch, ' ');
        assert_eq!(p.cell(4, 0).ch, 'E');
    }

    #[test]
    fn insert_lines() {
        let mut p = AnsiParser::new(5, 4);
        p.feed(b"AAAAA\r\nBBBBB\r\nCCCCC\r\nDDDDD");
        p.feed(b"\x1b[2;1H\x1b[1L"); 
        assert_eq!(p.cell(0, 0).ch, 'A');
        assert_eq!(p.cell(0, 1).ch, ' '); 
        assert_eq!(p.cell(0, 2).ch, 'B'); 
        assert_eq!(p.cell(0, 3).ch, 'C'); 
    }

    #[test]
    fn delete_lines() {
        let mut p = AnsiParser::new(5, 4);
        p.feed(b"AAAAA\r\nBBBBB\r\nCCCCC\r\nDDDDD");
        p.feed(b"\x1b[2;1H\x1b[1M"); 
        assert_eq!(p.cell(0, 0).ch, 'A');
        assert_eq!(p.cell(0, 1).ch, 'C'); 
        assert_eq!(p.cell(0, 2).ch, 'D'); 
        assert_eq!(p.cell(0, 3).ch, ' '); 
    }

    #[test]
    fn resize_preserves_content() {
        let mut p = AnsiParser::new(5, 3);
        p.feed(b"ABCDE\r\nFGHIJ");
        p.resize(8, 4);
        assert_eq!(p.cell(0, 0).ch, 'A');
        assert_eq!(p.cell(4, 0).ch, 'E');
        assert_eq!(p.cell(0, 1).ch, 'F');
        assert_eq!(p.cell(5, 0).ch, ' '); 
        assert_eq!(p.cell(0, 3).ch, ' '); 
    }

    #[test]
    fn index_256_named() {
        assert_eq!(index_256_to_col(0), Col::named(0));
        assert_eq!(index_256_to_col(1), Col::named(1));
        assert_eq!(index_256_to_col(15), Col::named(15));
    }

    #[test]
    fn index_256_cube() {
        
        assert_eq!(index_256_to_col(16), Col::rgb(0, 0, 0));
        
        assert_eq!(index_256_to_col(196), Col::rgb(255, 0, 0));
        
        assert_eq!(index_256_to_col(21), Col::rgb(0, 0, 255));
    }

    #[test]
    fn index_256_grayscale() {
        assert_eq!(index_256_to_col(232), Col::rgb(8, 8, 8));
        assert_eq!(index_256_to_col(255), Col::rgb(238, 238, 238));
    }

    #[test]
    fn vli_to_text() {
        let mut p = AnsiParser::new(10, 2);
        p.feed(b"\x1b[1;31mHello\x1b[0m\r\n\x1b[32mWorld\x1b[0m");
        let text = p.to_text();
        assert!(text.contains("Hello"));
        assert!(text.contains("World"));
    }

    #[test]
    fn sgr_italic_underline_reverse() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"\x1b[3;4;7mX");
        let c = p.cell(0, 0);
        assert!(c.style.contains(Style::ITALIC));
        assert!(c.style.contains(Style::UNDERLINE));
        assert!(c.style.contains(Style::REVERSE));
    }

    #[test]
    fn sgr_clear_individual_styles() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"\x1b[1;3;4mA\x1b[23mB"); 
        let b = p.cell(1, 0);
        assert!(b.style.contains(Style::BOLD));
        assert!(!b.style.contains(Style::ITALIC));
        assert!(b.style.contains(Style::UNDERLINE));
    }

    #[test]
    fn reverse_line_feed() {
        let mut p = AnsiParser::new(5, 3);
        p.feed(b"\x1b[2;1H"); 
        p.feed(b"\x1bM");     
        assert_eq!(p.cursor_y, 0);
    }

    #[test]
    fn unknown_csi_swallowed() {
        let mut p = AnsiParser::new(10, 1);
        p.feed(b"\x1b[999zAB"); 
        assert_eq!(p.cell(0, 0).ch, 'A');
        assert_eq!(p.cell(1, 0).ch, 'B');
    }
}
