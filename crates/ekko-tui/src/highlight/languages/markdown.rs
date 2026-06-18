// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use fancy_regex::Regex;
use crate::highlight::token::{RegexHighlighter, TokenKind};

pub fn build() -> RegexHighlighter {
    let rules = vec![
        
        (Regex::new(r"^#{1,6}\s.*$").unwrap(), TokenKind::Heading),
        
        (Regex::new(r"`[^`]+`").unwrap(), TokenKind::CodeSpan),
        
        (Regex::new(r"\*\*[^*]+\*\*").unwrap(), TokenKind::Bold),
        (Regex::new(r"__[^_]+__").unwrap(), TokenKind::Bold),
        
        (Regex::new(r"\*[^*]+\*").unwrap(), TokenKind::Italic),
        (Regex::new(r"_[^_]+_").unwrap(), TokenKind::Italic),
        
        (Regex::new(r"\[[^\]]+\]\([^)]+\)").unwrap(), TokenKind::Link),
        
        (Regex::new(r"^\s*(?:[-*+]|\d+\.)\s").unwrap(), TokenKind::Punctuation),
        
        (Regex::new(r"^>.*$").unwrap(), TokenKind::Comment),
    ];
    RegexHighlighter::new("markdown", rules)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::highlight::token::Highlighter;

    #[test]
    fn md_heading() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("## Hello World", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Heading));
    }

    #[test]
    fn md_code_span() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("Use `println!` to print", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::CodeSpan));
    }

    #[test]
    fn md_bold() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("This is **bold** text", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Bold));
    }

    #[test]
    fn md_italic() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("This is *italic* text", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Italic));
    }

    #[test]
    fn md_link() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("[click here](https://example.com)", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Link));
    }

    #[test]
    fn md_blockquote() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("> quoted text", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Comment));
    }

    #[test]
    fn md_list_marker() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("- list item", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Punctuation));
    }
}
