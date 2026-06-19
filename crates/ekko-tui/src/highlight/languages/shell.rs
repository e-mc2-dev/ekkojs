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
    let keywords = r"if|then|else|elif|fi|case|esac|for|select|while|until|do|done|in|function|time|coproc|return|break|continue|exit|export|local|readonly|declare|typeset|unset|shift|set|trap|source|alias|unalias";
    let builtins = r"echo|printf|read|cd|pwd|pushd|popd|dirs|jobs|bg|fg|kill|wait|test|true|false|let|eval|exec|sudo|env|grep|sed|awk|cat|tail|head|ls|cp|mv|rm|mkdir|rmdir|touch|chmod|chown|find|xargs|tar|gzip|gunzip|curl|wget|git";

    let rules = vec![
        (Regex::new(r"#[^\n]*").unwrap(), TokenKind::Comment),
        (Regex::new(r#""(?:\\.|[^"\\])*""#).unwrap(), TokenKind::String),
        (Regex::new(r"'[^']*'").unwrap(), TokenKind::String),
        
        (Regex::new(r"\$\{[^}]*\}").unwrap(), TokenKind::Preprocessor),
        (Regex::new(r"\$[A-Za-z_][A-Za-z_0-9]*|\$\d+|\$[@#?$!*\-]").unwrap(), TokenKind::Preprocessor),
        (Regex::new(&format!(r"\b(?:{})\b", keywords)).unwrap(), TokenKind::Keyword),
        (Regex::new(&format!(r"\b(?:{})\b", builtins)).unwrap(), TokenKind::Function),
        (Regex::new(r"\b\d+\b").unwrap(), TokenKind::Number),
        
        (Regex::new(r"-{1,2}[A-Za-z][A-Za-z0-9-]*").unwrap(), TokenKind::Type),
        (Regex::new(r"[{}\[\]();,]").unwrap(), TokenKind::Punctuation),
        (Regex::new(r"[|&<>!=]+").unwrap(), TokenKind::Operator),
    ];
    RegexHighlighter::new("shell", rules)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::highlight::token::Highlighter;

    #[test]
    fn shell_keywords() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("if [ -f file ]; then", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Keyword));
    }

    #[test]
    fn shell_builtins() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("echo \"hello\" | grep foo", &mut state);
        assert!(tokens.iter().filter(|t| t.kind == TokenKind::Function).count() >= 2);
    }

    #[test]
    fn shell_variables() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("echo $HOME ${PATH} $1 $?", &mut state);
        assert!(tokens.iter().filter(|t| t.kind == TokenKind::Preprocessor).count() >= 2);
    }

    #[test]
    fn shell_comments() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("# this is a comment", &mut state);
        assert_eq!(tokens[0].kind, TokenKind::Comment);
    }

    #[test]
    fn shell_flags() {
        let h = build();
        let mut state = 0;
        let tokens = h.tokenize_line("ls -la --color=auto", &mut state);
        assert!(tokens.iter().any(|t| t.kind == TokenKind::Type));
    }
}
