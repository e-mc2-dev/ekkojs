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
        (Regex::new(r#""(?:\\.|[^"\\])*"\s*:"#).unwrap(), TokenKind::Type),
        (Regex::new(r#""(?:\\.|[^"\\])*""#).unwrap(), TokenKind::String),
        (Regex::new(r"\b(?:true|false|null)\b").unwrap(), TokenKind::Keyword),
        (Regex::new(r"-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?").unwrap(), TokenKind::Number),
        (Regex::new(r"[{}\[\]]").unwrap(), TokenKind::Punctuation),
        (Regex::new(r"[:,]").unwrap(), TokenKind::Operator),
    ];
    RegexHighlighter::new("json", rules)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::highlight::token::Highlighter;

    #[test]
    fn json_keys() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line(r#"  "name": "ekko""#, &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Type));
        assert!(tokens.iter().any(|t| t.kind == TokenKind::String));
    }

    #[test]
    fn json_literals() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line(r#"  "active": true, "count": null"#, &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Keyword));
    }

    #[test]
    fn json_numbers() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line(r#"  "value": -3.14e+2"#, &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Number));
    }

    #[test]
    fn json_structure() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line(r#"{ "items": [1, 2, 3] }"#, &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Punctuation));
    }
}
