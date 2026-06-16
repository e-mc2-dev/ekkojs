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
        
        (Regex::new(r"<!--.*?-->").unwrap(), TokenKind::Comment),
        
        (Regex::new(r"<\?[^?]*\?>").unwrap(), TokenKind::Preprocessor),
        
        (Regex::new(r"<!\[CDATA\[.*?\]\]>").unwrap(), TokenKind::String),
        
        (Regex::new(r"(?i)<!DOCTYPE[^>]*>").unwrap(), TokenKind::Preprocessor),
        
        (Regex::new(r#""[^"]*""#).unwrap(), TokenKind::String),
        (Regex::new(r"'[^']*'").unwrap(), TokenKind::String),
        
        (Regex::new(r"</?[A-Za-z][A-Za-z0-9:_.-]*").unwrap(), TokenKind::Keyword),
        
        (Regex::new(r"/?>").unwrap(), TokenKind::Keyword),
        
        (Regex::new(r"\b[A-Za-z_:][A-Za-z0-9_:.-]*(?=\s*=)").unwrap(), TokenKind::Type),
        
        (Regex::new(r"&(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);").unwrap(), TokenKind::Number),
    ];
    RegexHighlighter::new("html", rules)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::highlight::token::Highlighter;

    #[test]
    fn html_tags() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("<div class=\"foo\">hello</div>", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Keyword));
        assert!(tokens.iter().any(|t| t.kind == TokenKind::String));
    }

    #[test]
    fn html_attributes() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line(r#"<input type="text" disabled>"#, &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Type));
    }

    #[test]
    fn html_comment() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("<!-- comment -->", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Comment));
    }

    #[test]
    fn html_entities() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("&amp; &#x1F600; &#123;", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Number));
    }

    #[test]
    fn html_doctype() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("<!DOCTYPE html>", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Preprocessor));
    }
}
