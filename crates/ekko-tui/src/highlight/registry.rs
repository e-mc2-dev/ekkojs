// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::collections::HashMap;
use std::path::Path;
use super::token::{Highlighter, Token};
use super::languages;

pub struct LanguageRegistry {
    by_ext: HashMap<String, usize>,
    by_name: HashMap<String, usize>,
    highlighters: Vec<Box<dyn Highlighter>>,
}

impl LanguageRegistry {
    
    pub fn new() -> Self {
        let mut reg = LanguageRegistry {
            by_ext: HashMap::new(),
            by_name: HashMap::new(),
            highlighters: Vec::new(),
        };
        reg.register_builtins();
        reg
    }

    fn register_builtins(&mut self) {
        let js = self.add(Box::new(languages::js::build_javascript()));
        let ts = self.add(Box::new(languages::js::build_typescript()));
        let rs = self.add(Box::new(languages::rust_lang::build()));
        let cs = self.add(Box::new(languages::csharp::build()));
        let json = self.add(Box::new(languages::json::build()));
        let html = self.add(Box::new(languages::html::build()));
        let sh = self.add(Box::new(languages::shell::build()));
        let md = self.add(Box::new(languages::markdown::build()));
        let toml = self.add(Box::new(languages::toml_lang::build()));

        for ext in [".js", ".mjs", ".cjs"] { self.by_ext.insert(ext.to_string(), js); }
        for ext in [".jsx"] { self.by_ext.insert(ext.to_string(), js); }
        for ext in [".ts", ".tsx"] { self.by_ext.insert(ext.to_string(), ts); }
        self.by_ext.insert(".rs".to_string(), rs);
        for ext in [".cs", ".csx"] { self.by_ext.insert(ext.to_string(), cs); }
        self.by_ext.insert(".json".to_string(), json);
        for ext in [".html", ".htm", ".xhtml", ".xml", ".svg"] {
            self.by_ext.insert(ext.to_string(), html);
        }
        for ext in [".sh", ".bash", ".zsh"] { self.by_ext.insert(ext.to_string(), sh); }
        for ext in [".md", ".markdown"] { self.by_ext.insert(ext.to_string(), md); }
        for ext in [".toml", ".yml", ".yaml"] { self.by_ext.insert(ext.to_string(), toml); }

        for name in ["js", "jsx", "javascript", "node", "mjs", "cjs"] { self.by_name.insert(name.to_string(), js); }
        for name in ["ts", "tsx", "typescript"] { self.by_name.insert(name.to_string(), ts); }
        for name in ["rs", "rust"] { self.by_name.insert(name.to_string(), rs); }
        for name in ["cs", "csharp", "c#"] { self.by_name.insert(name.to_string(), cs); }
        self.by_name.insert("json".to_string(), json);
        for name in ["html", "htm", "xml"] { self.by_name.insert(name.to_string(), html); }
        for name in ["sh", "bash", "shell", "zsh"] { self.by_name.insert(name.to_string(), sh); }
        for name in ["md", "markdown"] { self.by_name.insert(name.to_string(), md); }
        for name in ["toml", "yaml", "yml"] { self.by_name.insert(name.to_string(), toml); }
    }

    fn add(&mut self, h: Box<dyn Highlighter>) -> usize {
        let idx = self.highlighters.len();
        self.highlighters.push(h);
        idx
    }

    pub fn for_file(&self, path: &str) -> Option<&dyn Highlighter> {
        let ext = Path::new(path).extension()?.to_str()?;
        let dot_ext = format!(".{}", ext);
        self.by_ext.get(&dot_ext).map(|&idx| self.highlighters[idx].as_ref())
    }

    pub fn for_name(&self, name: &str) -> Option<&dyn Highlighter> {
        let lower = name.to_lowercase();
        self.by_name.get(&lower).map(|&idx| self.highlighters[idx].as_ref())
    }
}

pub struct FileTokenCache {
    lines: Vec<CachedLine>,
}

struct CachedLine {
    tokens: Vec<Token>,
    state_before: i32,
    state_after: i32,
}

impl FileTokenCache {
    
    pub fn tokenize_file(highlighter: &dyn Highlighter, content: &str) -> Self {
        let lines: Vec<&str> = content.lines().collect();
        let mut cached = Vec::with_capacity(lines.len());
        let mut state = 0i32;

        for line in &lines {
            let state_before = state;
            let tokens = highlighter.tokenize_line(line, &mut state);
            cached.push(CachedLine {
                tokens,
                state_before,
                state_after: state,
            });
        }

        FileTokenCache { lines: cached }
    }

    pub fn get_tokens(&self, line: usize) -> &[Token] {
        self.lines.get(line).map(|l| l.tokens.as_slice()).unwrap_or(&[])
    }

    pub fn line_count(&self) -> usize {
        self.lines.len()
    }

    
    pub fn update_from_line(
        &mut self,
        from_line: usize,
        new_lines: &[&str],
        highlighter: &dyn Highlighter,
    ) {
        if from_line >= self.lines.len() { return; }

        let mut state = if from_line > 0 {
            self.lines[from_line - 1].state_after
        } else {
            0
        };

        let old_len = self.lines.len();

        for (i, line) in new_lines.iter().enumerate() {
            let idx = from_line + i;
            let state_before = state;
            let tokens = highlighter.tokenize_line(line, &mut state);

            if idx < old_len {
                self.lines[idx] = CachedLine { tokens, state_before, state_after: state };
            } else {
                self.lines.push(CachedLine { tokens, state_before, state_after: state });
            }
        }

        let continue_from = from_line + new_lines.len();
        if continue_from < self.lines.len() {
            for idx in continue_from..self.lines.len() {
                if self.lines[idx].state_before == state {
                    break;
                }
                let state_before = state;

                
                
                self.lines[idx].state_before = state_before;
                self.lines[idx].state_after = state;
                state = self.lines[idx].state_after;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::highlight::token::TokenKind;

    #[test]
    fn registry_for_file() {
        let reg = LanguageRegistry::new();
        assert!(reg.for_file("main.rs").is_some());
        assert!(reg.for_file("app.js").is_some());
        assert!(reg.for_file("index.html").is_some());
        assert!(reg.for_file("config.toml").is_some());
        assert!(reg.for_file("data.json").is_some());
        assert!(reg.for_file("script.sh").is_some());
        assert!(reg.for_file("README.md").is_some());
        assert!(reg.for_file("Program.cs").is_some());
        assert!(reg.for_file("unknown.xyz").is_none());
    }

    #[test]
    fn registry_for_name() {
        let reg = LanguageRegistry::new();
        assert!(reg.for_name("rust").is_some());
        assert!(reg.for_name("javascript").is_some());
        assert!(reg.for_name("typescript").is_some());
        assert!(reg.for_name("html").is_some());
        assert!(reg.for_name("json").is_some());
        assert!(reg.for_name("shell").is_some());
        assert!(reg.for_name("markdown").is_some());
        assert!(reg.for_name("csharp").is_some());
        assert!(reg.for_name("toml").is_some());
        assert!(reg.for_name("nonexistent").is_none());
    }

    #[test]
    fn registry_name_case_insensitive() {
        let reg = LanguageRegistry::new();
        assert!(reg.for_name("Rust").is_some());
        assert!(reg.for_name("JAVASCRIPT").is_some());
        assert!(reg.for_name("Json").is_some());
    }

    #[test]
    fn file_token_cache_basic() {
        let reg = LanguageRegistry::new();
        let h = reg.for_name("rust").unwrap();
        let content = "fn main() {\n    let x = 42;\n}\n";
        let cache = FileTokenCache::tokenize_file(h, content);
        assert_eq!(cache.line_count(), 3);
        let line0 = cache.get_tokens(0);
        assert!(!line0.is_empty());
        assert!(line0.iter().any(|t| t.kind == TokenKind::Keyword));
    }

    #[test]
    fn file_token_cache_instant_lookup() {
        let reg = LanguageRegistry::new();
        let h = reg.for_name("javascript").unwrap();
        let content = "const x = 1;\nlet y = \"hello\";\n// comment\n";
        let cache = FileTokenCache::tokenize_file(h, content);
        assert_eq!(cache.line_count(), 3);
        let line2 = cache.get_tokens(2);
        assert!(line2.iter().any(|t| t.kind == TokenKind::Comment));
    }

    #[test]
    fn file_token_cache_out_of_bounds() {
        let reg = LanguageRegistry::new();
        let h = reg.for_name("rust").unwrap();
        let cache = FileTokenCache::tokenize_file(h, "let x = 1;");
        assert!(cache.get_tokens(999).is_empty());
    }

    #[test]
    fn file_token_cache_block_comment_state() {
        let reg = LanguageRegistry::new();
        let h = reg.for_name("rust").unwrap();
        let content = "/* start\nstill comment\n*/ let x = 1;";
        let cache = FileTokenCache::tokenize_file(h, content);
        assert_eq!(cache.line_count(), 3);
        let line1 = cache.get_tokens(1);
        assert_eq!(line1[0].kind, TokenKind::Comment);
    }

    #[test]
    fn file_token_cache_update_from_line() {
        let reg = LanguageRegistry::new();
        let h = reg.for_name("javascript").unwrap();
        let content = "let x = 1;\nlet y = 2;\nlet z = 3;\n";
        let mut cache = FileTokenCache::tokenize_file(h, content);

        cache.update_from_line(1, &["// comment line"], h);
        let line1 = cache.get_tokens(1);
        assert!(line1.iter().any(|t| t.kind == TokenKind::Comment));
    }
}
