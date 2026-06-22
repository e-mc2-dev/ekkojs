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
        
        (Regex::new(r"#[^\n]*").unwrap(), TokenKind::Comment),
        
        (Regex::new(r#""""[^"]*""""#).unwrap(), TokenKind::String),
        (Regex::new(r"'''[^']*'''").unwrap(), TokenKind::String),
        
        (Regex::new(r#""(?:\\.|[^"\\])*""#).unwrap(), TokenKind::String),
        (Regex::new(r"'[^']*'").unwrap(), TokenKind::String),
        
        (Regex::new(r"\[\[?[^\]]+\]\]?").unwrap(), TokenKind::Keyword),
        
        (Regex::new(r"\b(?:true|false)\b").unwrap(), TokenKind::Type),
        
        (Regex::new(r"\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?").unwrap(), TokenKind::Number),
        
        (Regex::new(r"\b(?:0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|[+-]?(?:inf|nan)|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)\b").unwrap(), TokenKind::Number),
        
        (Regex::new(r"\b[A-Za-z_][A-Za-z_0-9.-]*(?=\s*=)").unwrap(), TokenKind::Identifier),
        
        (Regex::new(r"=").unwrap(), TokenKind::Operator),
        (Regex::new(r"[{}\[\],.]").unwrap(), TokenKind::Punctuation),
    ];
    RegexHighlighter::new("toml", rules)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::highlight::token::Highlighter;

    #[test]
    fn toml_section() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("[package]", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Keyword));
    }

    #[test]
    fn toml_array_section() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("[[dependencies]]", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Keyword));
    }

    #[test]
    fn toml_key_value() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line(r#"name = "ekko""#, &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Identifier));
        assert!(tokens.iter().any(|t| t.kind == TokenKind::String));
    }

    #[test]
    fn toml_booleans() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("enabled = true", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Type));
    }

    #[test]
    fn toml_numbers() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("port = 8080", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Number));
    }

    #[test]
    fn toml_comments() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("# This is a comment", &mut state);
        assert_eq!(tokens[0].kind, TokenKind::Comment);
    }
}
