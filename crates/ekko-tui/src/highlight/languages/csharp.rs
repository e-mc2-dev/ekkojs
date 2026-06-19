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
    let keywords = r"abstract|as|async|await|base|break|case|catch|checked|class|const|continue|default|delegate|do|else|enum|event|explicit|extern|finally|fixed|for|foreach|from|get|global|goto|if|implicit|in|init|interface|internal|is|let|lock|namespace|new|operator|out|override|params|partial|private|protected|public|readonly|record|ref|required|return|sealed|set|sizeof|stackalloc|static|struct|switch|this|throw|try|typeof|unchecked|unsafe|using|value|var|virtual|void|volatile|when|where|while|with|yield|nameof";
    let types = r"bool|byte|sbyte|char|decimal|double|float|int|uint|long|ulong|object|short|ushort|string|dynamic|nint|nuint|true|false|null";

    let rules = vec![
        (Regex::new(r"//[^\n]*").unwrap(), TokenKind::Comment),
        (Regex::new(r"/\*.*?\*/").unwrap(), TokenKind::Comment),
        
        (Regex::new(r#"@"(?:""|[^"])*""#).unwrap(), TokenKind::String),
        
        (Regex::new(r#"\$"(?:\\.|[^"\\])*""#).unwrap(), TokenKind::String),
        (Regex::new(r#""(?:\\.|[^"\\])*""#).unwrap(), TokenKind::String),
        (Regex::new(r"'(?:\\.|[^'\\])'").unwrap(), TokenKind::String),
        
        (Regex::new(r"^\s*#[A-Za-z]+").unwrap(), TokenKind::Preprocessor),
        (Regex::new(&format!(r"\b(?:{})\b", keywords)).unwrap(), TokenKind::Keyword),
        (Regex::new(&format!(r"\b(?:{})\b", types)).unwrap(), TokenKind::Type),
        (Regex::new(r"\b(?:0[xX][0-9a-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?[fFdDmMlLuU]*)\b").unwrap(), TokenKind::Number),
        
        (Regex::new(r"\[[A-Za-z_][A-Za-z_0-9.]*(?:\([^)]*\))?\]").unwrap(), TokenKind::Preprocessor),
        
        (Regex::new(r"\b[A-Z][A-Za-z_0-9]*\b").unwrap(), TokenKind::Type),
        
        (Regex::new(r"\b[A-Za-z_][A-Za-z_0-9]*(?=\s*\()").unwrap(), TokenKind::Function),
        (Regex::new(r"[{}\[\]();,.]").unwrap(), TokenKind::Punctuation),
        (Regex::new(r"[+\-*/%=<>!&|^~?:]+").unwrap(), TokenKind::Operator),
    ];
    RegexHighlighter::with_block_comments("csharp", rules)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::highlight::token::Highlighter;

    #[test]
    fn csharp_keywords() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("public static void Main()", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Keyword));
    }

    #[test]
    fn csharp_verbatim_string() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line(r#"var s = @"hello ""world""";"#, &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::String));
    }

    #[test]
    fn csharp_attributes() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("[Serializable]", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Preprocessor));
    }

    #[test]
    fn csharp_preprocessor() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("#region MyRegion", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Preprocessor));
    }
}
