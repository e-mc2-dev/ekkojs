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
    let keywords = r"as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while|yield|box|do|final|macro|override|priv|typeof|unsized|virtual|abstract|become|try|union";
    let types = r"i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str|String|Vec|Option|Result|Box|Rc|Arc|HashMap|HashSet|BTreeMap|BTreeSet|Some|None|Ok|Err";

    let rules = vec![
        (Regex::new(r"//[^\n]*").unwrap(), TokenKind::Comment),
        (Regex::new(r"/\*.*?\*/").unwrap(), TokenKind::Comment),
        
        (Regex::new(r##"r#+"[^"]*"#+"##).unwrap(), TokenKind::String),
        (Regex::new(r##"r"[^"]*""##).unwrap(), TokenKind::String),
        (Regex::new(r##"b?"(?:\\.|[^"\\])*""##).unwrap(), TokenKind::String),
        (Regex::new(r"b?'(?:\\.|[^'\\])'").unwrap(), TokenKind::String),
        
        (Regex::new(r"'[a-zA-Z_][a-zA-Z0-9_]*").unwrap(), TokenKind::Type),
        
        (Regex::new(r"#!?\[[^\]]*\]").unwrap(), TokenKind::Preprocessor),
        (Regex::new(&format!(r"\b(?:{})\b", keywords)).unwrap(), TokenKind::Keyword),
        (Regex::new(&format!(r"\b(?:{})\b", types)).unwrap(), TokenKind::Type),
        (Regex::new(r"\b(?:0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?(?:[iuf](?:8|16|32|64|128|size))?)\b").unwrap(), TokenKind::Number),
        
        (Regex::new(r"\b[a-zA-Z_][a-zA-Z0-9_]*!").unwrap(), TokenKind::Function),
        
        (Regex::new(r"\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()").unwrap(), TokenKind::Function),
        
        (Regex::new(r"\b[A-Z][a-zA-Z0-9_]*\b").unwrap(), TokenKind::Type),
        (Regex::new(r"[{}\[\]();,.]").unwrap(), TokenKind::Punctuation),
        (Regex::new(r"[+\-*/%=<>!&|^~?:@]+").unwrap(), TokenKind::Operator),
    ];
    RegexHighlighter::with_block_comments("rust", rules)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::highlight::token::Highlighter;

    #[test]
    fn rust_keywords() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("fn main() {", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Keyword));
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Function));
    }

    #[test]
    fn rust_types() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("let x: Vec<String> = Vec::new();", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Type));
    }

    #[test]
    fn rust_lifetimes() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("fn foo<'a>(s: &'a str) {", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Type));
    }

    #[test]
    fn rust_macros() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("println!(\"hello\");", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Function));
        assert!(tokens.iter().any(|t| t.kind == TokenKind::String));
    }

    #[test]
    fn rust_attributes() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("#[derive(Debug)]", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Preprocessor));
    }

    #[test]
    fn rust_numbers() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("let x = 42;", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Number));
        let mut state = 0;
        let tokens = h.tokenize_line("let y = 3.14;", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Number));
    }
}
