// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

pub mod languages;
pub mod registry;
pub mod token;

use registry::{FileTokenCache, LanguageRegistry};

static LANG_REGISTRY: std::sync::OnceLock<LanguageRegistry> = std::sync::OnceLock::new();

pub fn lang_registry() -> &'static LanguageRegistry {
    LANG_REGISTRY.get_or_init(LanguageRegistry::new)
}

pub fn tokenize_json(language: &str, code: &str) -> String {
    let reg = lang_registry();
    let highlighter = match reg.for_name(language) {
        Some(h) => h,
        None => return "[]".to_string(),
    };
    let cache = FileTokenCache::tokenize_file(highlighter, code);
    let mut result = Vec::new();
    for line_idx in 0..cache.line_count() {
        let tokens = cache.get_tokens(line_idx);
        let line: Vec<serde_json::Value> = tokens
            .iter()
            .map(|t| serde_json::json!({ "start": t.start, "length": t.length, "kind": format!("{:?}", t.kind) }))
            .collect();
        result.push(serde_json::Value::Array(line));
    }
    serde_json::to_string(&result).unwrap_or_else(|_| "[]".to_string())
}
