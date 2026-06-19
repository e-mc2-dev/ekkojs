// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Col {
    tag: u8,
    r: u8,
    g: u8,
    b: u8,
}

impl Col {
    pub const DEFAULT: Col = Col { tag: 0, r: 0, g: 0, b: 0 };
    pub const BLACK: Col = Col::named(0);
    pub const RED: Col = Col::named(1);
    pub const GREEN: Col = Col::named(2);
    pub const YELLOW: Col = Col::named(3);
    pub const BLUE: Col = Col::named(4);
    pub const MAGENTA: Col = Col::named(5);
    pub const CYAN: Col = Col::named(6);
    pub const WHITE: Col = Col::named(7);
    pub const BRIGHT_BLACK: Col = Col::named(8);
    pub const BRIGHT_RED: Col = Col::named(9);
    pub const BRIGHT_GREEN: Col = Col::named(10);
    pub const BRIGHT_YELLOW: Col = Col::named(11);
    pub const BRIGHT_BLUE: Col = Col::named(12);
    pub const BRIGHT_MAGENTA: Col = Col::named(13);
    pub const BRIGHT_CYAN: Col = Col::named(14);
    pub const BRIGHT_WHITE: Col = Col::named(15);

    pub const fn rgb(r: u8, g: u8, b: u8) -> Self {
        Col { tag: 2, r, g, b }
    }

    pub const fn named(idx: u8) -> Self {
        Col { tag: 1, r: idx & 0x0F, g: 0, b: 0 }
    }

    pub const fn is_default(self) -> bool { self.tag == 0 }
    pub const fn is_named(self) -> bool { self.tag == 1 }
    pub const fn is_rgb(self) -> bool { self.tag == 2 }
    pub const fn named_index(self) -> u8 { if self.tag == 1 { self.r } else { 0 } }
    pub const fn r(self) -> u8 { self.r }
    pub const fn g(self) -> u8 { self.g }
    pub const fn b(self) -> u8 { self.b }
}

impl Default for Col {
    fn default() -> Self { Col::DEFAULT }
}

impl std::fmt::Display for Col {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self.tag {
            0 => write!(f, "Default"),
            1 => write!(f, "Named({})", self.r),
            2 => write!(f, "RGB({},{},{})", self.r, self.g, self.b),
            _ => write!(f, "Unknown"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]
pub struct Style(u8);

impl Style {
    pub const NONE: Style = Style(0);
    pub const BOLD: Style = Style(1);
    pub const UNDERLINE: Style = Style(2);
    pub const ITALIC: Style = Style(4);
    pub const REVERSE: Style = Style(8);

    pub const fn from_bits(bits: u8) -> Style { Style(bits) }

    pub const fn contains(self, other: Style) -> bool {
        (self.0 & other.0) != 0
    }

    pub const fn without(self, other: Style) -> Style {
        Style(self.0 & !other.0)
    }

    pub const fn union(self, other: Style) -> Style {
        Style(self.0 | other.0)
    }

    pub const fn bits(self) -> u8 { self.0 }
}

impl std::ops::BitOr for Style {
    type Output = Style;
    fn bitor(self, rhs: Self) -> Self { Style(self.0 | rhs.0) }
}

impl std::ops::BitAnd for Style {
    type Output = Style;
    fn bitand(self, rhs: Self) -> Self { Style(self.0 & rhs.0) }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Cell {
    pub ch: char,
    pub fg: Col,
    pub bg: Col,
    pub style: Style,
    pub is_cont: bool,
}

impl Cell {
    pub const BLANK: Cell = Cell {
        ch: ' ',
        fg: Col::DEFAULT,
        bg: Col::DEFAULT,
        style: Style::NONE,
        is_cont: false,
    };

    pub const fn new(ch: char, fg: Col, bg: Col, style: Style) -> Self {
        Cell { ch, fg, bg, style, is_cont: false }
    }

    pub const fn cont(fg: Col, bg: Col, style: Style) -> Self {
        Cell { ch: ' ', fg, bg, style, is_cont: true }
    }
}

impl Default for Cell {
    fn default() -> Self { Cell::BLANK }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn col_default() {
        let c = Col::DEFAULT;
        assert!(c.is_default());
        assert!(!c.is_named());
        assert!(!c.is_rgb());
    }

    #[test]
    fn col_named() {
        let c = Col::RED;
        assert!(!c.is_default());
        assert!(c.is_named());
        assert_eq!(c.named_index(), 1);
    }

    #[test]
    fn col_rgb() {
        let c = Col::rgb(255, 128, 0);
        assert!(c.is_rgb());
        assert_eq!(c.r(), 255);
        assert_eq!(c.g(), 128);
        assert_eq!(c.b(), 0);
    }

    #[test]
    fn col_equality() {
        assert_eq!(Col::RED, Col::named(1));
        assert_ne!(Col::RED, Col::GREEN);
        assert_ne!(Col::DEFAULT, Col::BLACK);
    }

    #[test]
    fn style_bitflags() {
        let s = Style::BOLD | Style::ITALIC;
        assert!(s.contains(Style::BOLD));
        assert!(s.contains(Style::ITALIC));
        assert!(!s.contains(Style::UNDERLINE));
    }

    #[test]
    fn cell_blank() {
        let c = Cell::BLANK;
        assert_eq!(c.ch, ' ');
        assert!(c.fg.is_default());
        assert!(!c.is_cont);
    }

    #[test]
    fn cell_cont() {
        let c = Cell::cont(Col::RED, Col::DEFAULT, Style::NONE);
        assert!(c.is_cont);
        assert_eq!(c.ch, ' ');
    }
}
