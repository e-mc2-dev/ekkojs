// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



pub fn char_width(ch: char) -> usize {
    let cp = ch as u32;

    if cp < 0x20 || (cp >= 0x7F && cp < 0xA0) { return 0; }

    if is_combining(cp) { return 0; }

    if cp == 0x200B || cp == 0x200C || cp == 0x200D || cp == 0xFEFF { return 0; }
    if (0xFE00..=0xFE0F).contains(&cp) { return 0; }
    if (0xE0100..=0xE01EF).contains(&cp) { return 0; }

    if cp == 0x00AD { return 1; }

    if (0x1100..=0x115F).contains(&cp) { return 2; }
    if (0x2329..=0x232A).contains(&cp) { return 2; }

    if cp == 0x231A || cp == 0x231B { return 2; }
    if (0x23E9..=0x23FA).contains(&cp) { return 2; }
    if cp == 0x25AA || cp == 0x25AB { return 2; }
    if cp == 0x25B6 || cp == 0x25C0 { return 2; }
    if (0x25FB..=0x25FE).contains(&cp) { return 2; }
    if (0x2600..=0x27BF).contains(&cp) { return 2; }
    if cp == 0x2934 || cp == 0x2935 { return 2; }
    if (0x2B05..=0x2B07).contains(&cp) { return 2; }
    if cp == 0x2B1B || cp == 0x2B1C { return 2; }
    if cp == 0x2B50 { return 2; }
    if cp == 0x2B55 { return 2; }
    if cp == 0x3030 || cp == 0x303D { return 2; }
    if cp == 0x3297 || cp == 0x3299 { return 2; }

    if (0x2E80..=0x303E).contains(&cp) { return 2; }
    
    if (0x3041..=0x33BF).contains(&cp) { return 2; }
    
    if (0x3400..=0x4DBF).contains(&cp) { return 2; }
    if (0x4E00..=0x9FFF).contains(&cp) { return 2; }
    
    if (0xA000..=0xA4CF).contains(&cp) { return 2; }
    
    if (0xAC00..=0xD7AF).contains(&cp) { return 2; }
    
    if (0xF900..=0xFAFF).contains(&cp) { return 2; }
    
    if (0xFE30..=0xFE6F).contains(&cp) { return 2; }
    
    if (0xFF01..=0xFF60).contains(&cp) { return 2; }
    if (0xFFE0..=0xFFE6).contains(&cp) { return 2; }

    if (0x20000..=0x2FA1F).contains(&cp) { return 2; }
    if (0x30000..=0x323AF).contains(&cp) { return 2; }

    if (0x1F000..=0x1FAFF).contains(&cp) { return 2; }
    if (0x1FC00..=0x1FFFF).contains(&cp) { return 2; }
    if (0x1F300..=0x1F9FF).contains(&cp) { return 2; }

    if (0x1F1E0..=0x1F1FF).contains(&cp) { return 2; }

    if (0x1F0A0..=0x1F0FF).contains(&cp) { return 2; }
    if (0x1F100..=0x1F1FF).contains(&cp) { return 2; }

    1
}

fn is_combining(cp: u32) -> bool {
    if (0x0300..=0x036F).contains(&cp) { return true; }
    if (0x1AB0..=0x1AFF).contains(&cp) { return true; }
    if (0x1DC0..=0x1DFF).contains(&cp) { return true; }
    if (0x20D0..=0x20FF).contains(&cp) { return true; }
    if (0xFE20..=0xFE2F).contains(&cp) { return true; }
    if (0x0E31..=0x0E3A).contains(&cp) { return true; }
    if (0x0EB1..=0x0EBC).contains(&cp) { return true; }
    if (0x0610..=0x061A).contains(&cp) { return true; }
    if (0x064B..=0x065F).contains(&cp) { return true; }
    if (0x0591..=0x05BD).contains(&cp) { return true; }
    if (0x0900..=0x0903).contains(&cp) { return true; }
    if (0x093A..=0x094F).contains(&cp) { return true; }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ascii_width_1() {
        assert_eq!(char_width('A'), 1);
        assert_eq!(char_width('z'), 1);
        assert_eq!(char_width('0'), 1);
        assert_eq!(char_width(' '), 1);
        assert_eq!(char_width('~'), 1);
    }

    #[test]
    fn control_width_0() {
        assert_eq!(char_width('\0'), 0);
        assert_eq!(char_width('\x01'), 0);
        assert_eq!(char_width('\x1B'), 0);
        assert_eq!(char_width('\x7F'), 0);
    }

    #[test]
    fn cjk_width_2() {
        assert_eq!(char_width('\u{4E00}'), 2); 
        assert_eq!(char_width('\u{AC00}'), 2); 
        assert_eq!(char_width('\u{3041}'), 2); 
        assert_eq!(char_width('\u{FF01}'), 2); 
    }

    #[test]
    fn emoji_width_2() {
        assert_eq!(char_width('\u{2705}'), 2); 
        assert_eq!(char_width('\u{231A}'), 2); 
        assert_eq!(char_width('\u{2B50}'), 2); 
    }

    #[test]
    fn supplementary_emoji_width_2() {
        assert_eq!(char_width('\u{1F600}'), 2); 
        assert_eq!(char_width('\u{1F4A9}'), 2); 
        assert_eq!(char_width('\u{1F680}'), 2); 
    }

    #[test]
    fn combining_width_0() {
        assert_eq!(char_width('\u{0300}'), 0); 
        assert_eq!(char_width('\u{0301}'), 0); 
        assert_eq!(char_width('\u{036F}'), 0); 
    }

    #[test]
    fn zero_width_chars() {
        assert_eq!(char_width('\u{200B}'), 0); 
        assert_eq!(char_width('\u{200D}'), 0); 
        assert_eq!(char_width('\u{FEFF}'), 0); 
        assert_eq!(char_width('\u{FE0F}'), 0); 
    }

    #[test]
    fn soft_hyphen_width_1() {
        assert_eq!(char_width('\u{00AD}'), 1);
    }
}
