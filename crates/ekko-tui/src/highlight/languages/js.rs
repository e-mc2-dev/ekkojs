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

pub fn build_javascript() -> RegexHighlighter {
    build_clike(
        "javascript",
        r"break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|from|function|if|import|in|instanceof|let|new|of|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield|async|await",
        r"true|false|null|undefined|NaN|Infinity",
    )
}

pub fn build_typescript() -> RegexHighlighter {
    build_clike(
        "typescript",
        r"abstract|as|async|await|break|case|catch|class|const|continue|debugger|declare|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|infer|instanceof|interface|is|keyof|let|module|namespace|new|of|package|private|protected|public|readonly|return|satisfies|set|static|super|switch|this|throw|try|type|typeof|var|void|while|with|yield",
        r"any|boolean|never|null|number|object|string|symbol|undefined|unknown|true|false|bigint|NaN|Infinity",
    )
}

fn build_clike(name: &str, keywords: &str, types: &str) -> RegexHighlighter {
    let rules = vec![
        (Regex::new(r"//[^\n]*").unwrap(), TokenKind::Comment),
        (Regex::new(r"/\*.*?\*/").unwrap(), TokenKind::Comment),
        (Regex::new(r#""(?:\\.|[^"\\])*""#).unwrap(), TokenKind::String),
        (Regex::new(r"'(?:\\.|[^'\\])*'").unwrap(), TokenKind::String),
        (Regex::new(r"`(?:\\.|[^`\\])*`").unwrap(), TokenKind::String),
        (Regex::new(&format!(r"\b(?:{})\b", keywords)).unwrap(), TokenKind::Keyword),
        (Regex::new(&format!(r"\b(?:{})\b", types)).unwrap(), TokenKind::Type),
        (Regex::new(r"\b(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b").unwrap(), TokenKind::Number),
        (Regex::new(r"\b[A-Za-z_$][A-Za-z_0-9$]*(?=\s*\()").unwrap(), TokenKind::Function),
        (Regex::new(r"[{}\[\]();,.]").unwrap(), TokenKind::Punctuation),
        (Regex::new(r"[+\-*/%=<>!&|^~?:]+").unwrap(), TokenKind::Operator),
    ];
    RegexHighlighter::with_block_comments(name, rules)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::highlight::token::Highlighter;

    #[test]
    fn js_keywords() {
        let h = build_javascript();
        let mut state = 0;
        let tokens = h.tokenize_line("const x = 42;", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Keyword));
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Number));
    }

    #[test]
    fn js_string_and_template() {
        let h = build_javascript();
        let mut state = 0;
        let tokens = h.tokenize_line(r#"let s = "hello" + `world`"#, &mut state);
        let strings: Vec<_> = tokens.iter().filter(|t| t.kind == TokenKind::String).collect();
        assert_eq!(strings.len(), 2);
    }

    #[test]
    fn ts_types() {
        let h = build_typescript();
        let mut state = 0;
        let tokens = h.tokenize_line("let x: string = undefined;", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Type));
    }

    #[test]
    fn ts_keywords() {
        let h = build_typescript();
        let mut state = 0;
        let tokens = h.tokenize_line("interface Foo { readonly bar: number }", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Keyword));
    }

    #[test]
    fn js_block_comment() {
        let h = build_javascript();
        let mut state = 0;
        let _ = h.tokenize_line("/* start", &mut state);
        assert_eq!(state, 1);
        let t = h.tokenize_line("middle", &mut state);
        assert_eq!(t[0].kind, TokenKind::Comment);
        let _ = h.tokenize_line("*/ done", &mut state);
        assert_eq!(state, 0);
    }

    #[test]
    fn js_function_call() {
        let h = build_javascript();
        let mut state = 0;
        let tokens = h.tokenize_line("console.log(foo(42))", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Function));
    }
}
