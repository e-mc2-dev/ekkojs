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

pub enum SassSyntax {
    Scss,
    Sass,
}

pub struct CssResult {
    pub code: String,
}

pub struct CssModuleResult {
    pub code: String,
    pub classes: HashMap<String, String>,
}

const MAX_NESTING_DEPTH: usize = 256;

fn guard_nesting_depth(input: &str) -> Result<(), String> {
    let bytes = input.as_bytes();
    let mut depth: usize = 0;
    let mut i = 0;
    let mut in_str: Option<u8> = None;
    let mut in_comment = false;
    while i < bytes.len() {
        let c = bytes[i];
        if in_comment {
            if c == b'*' && i + 1 < bytes.len() && bytes[i + 1] == b'/' { in_comment = false; i += 2; continue; }
            i += 1; continue;
        }
        if let Some(q) = in_str {
            if c == b'\\' { i += 2; continue; }
            if c == q { in_str = None; }
            i += 1; continue;
        }
        match c {
            b'"' | b'\'' => in_str = Some(c),
            b'/' if i + 1 < bytes.len() && bytes[i + 1] == b'*' => { in_comment = true; i += 2; continue; }

            
            
            b'{' | b'(' | b'[' => {
                depth += 1;
                if depth > MAX_NESTING_DEPTH {
                    return Err(format!("css: nesting depth exceeds {} (possible denial-of-service input)", MAX_NESTING_DEPTH));
                }
            }
            b'}' | b')' | b']' => { depth = depth.saturating_sub(1); }
            _ => {}
        }
        i += 1;
    }

    
    if in_comment {
        return Err("css: unclosed block comment (`/*` without `*/`)".to_string());
    }
    Ok(())
}

use std::cell::Cell;
thread_local! { static SILENCE_CSS_PANIC: Cell<bool> = const { Cell::new(false) }; }
static CSS_HOOK: std::sync::Once = std::sync::Once::new();
fn catch_parser<T>(f: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
    CSS_HOOK.call_once(|| {
        let prev = std::panic::take_hook();
        std::panic::set_hook(Box::new(move |info| {
            if !SILENCE_CSS_PANIC.with(|c| c.get()) {
                prev(info);
            }
        }));
    });
    SILENCE_CSS_PANIC.with(|c| c.set(true));
    let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(f));
    SILENCE_CSS_PANIC.with(|c| c.set(false));
    match r {
        Ok(inner) => inner,
        Err(e) => {
            let msg = e
                .downcast_ref::<&str>()
                .map(|s| s.to_string())
                .or_else(|| e.downcast_ref::<String>().cloned())
                .unwrap_or_else(|| "internal CSS parser panic".to_string());
            Err(format!("css: parser error (contained panic): {}", msg))
        }
    }
}

fn css_preprocess(input: &str) -> std::borrow::Cow<'_, str> {
    if !input.bytes().any(|b| b == b'\r' || b == 0 || b == 0x0c) {
        return std::borrow::Cow::Borrowed(input);
    }
    let mut out = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();
    while let Some(c) = chars.next() {
        match c {
            '\r' => { if chars.peek() == Some(&'\n') { chars.next(); } out.push('\n'); } 
            '\u{0c}' => out.push('\n'),                                                  
            '\u{0}' => out.push('\u{FFFD}'),                                             
            other => out.push(other),
        }
    }
    std::borrow::Cow::Owned(out)
}

const SASS_COMPILE_BUDGET_SECS: u64 = 5;

pub fn compile_sass(input: &str, syntax: SassSyntax) -> Result<String, String> {
    let pp = css_preprocess(input);
    guard_nesting_depth(&pp)?;
    match syntax {
        SassSyntax::Scss => {
            
            let opts = grass::Options::default()
                .style(grass::OutputStyle::Compressed)
                .input_syntax(grass::InputSyntax::Scss);
            catch_parser(|| grass::from_string(pp.into_owned(), &opts).map_err(|e| e.to_string()))
        }
        SassSyntax::Sass => {
            let src = pp.into_owned();
            let (tx, rx) = std::sync::mpsc::channel();
            std::thread::Builder::new()
                .name("css-sass-compile".to_string())
                .spawn(move || {
                    
                    let opts = grass::Options::default()
                        .style(grass::OutputStyle::Compressed)
                        .input_syntax(grass::InputSyntax::Sass);
                    let r = catch_parser(|| grass::from_string(src, &opts).map_err(|e| e.to_string()));
                    let _ = tx.send(r);
                })
                .map_err(|e| format!("css: failed to spawn compile thread: {}", e))?;
            match rx.recv_timeout(std::time::Duration::from_secs(SASS_COMPILE_BUDGET_SECS)) {
                Ok(r) => r,
                Err(_) => Err(format!(
                    "css: indented-Sass compile exceeded the {}s budget (pathological input)",
                    SASS_COMPILE_BUDGET_SECS
                )),
            }
        }
    }
}

pub fn transform_css(input: &str, do_minify: bool, targets: Option<&str>) -> Result<CssResult, String> {
    guard_nesting_depth(input)?;
    catch_parser(|| {
        use lightningcss::stylesheet::{ParserOptions, PrinterOptions, MinifyOptions};

        let mut stylesheet = lightningcss::stylesheet::StyleSheet::parse(input, ParserOptions::default())
            .map_err(|e| format!("CSS parse error: {}", e))?;

        if do_minify {
            let mut minify_opts = MinifyOptions::default();
            if let Some(t) = targets {
                if let Ok(parsed) = parse_targets(t) {
                    minify_opts.targets = parsed;
                }
            }
            stylesheet.minify(minify_opts).map_err(|e| format!("CSS minify error: {}", e))?;
        }

        let result = stylesheet.to_css(PrinterOptions { minify: do_minify, ..Default::default() })
            .map_err(|e| format!("CSS print error: {}", e))?;

        Ok(CssResult { code: result.code })
    })
}

pub fn extract_css_modules(input: &str, filename: &str) -> Result<CssModuleResult, String> {
    guard_nesting_depth(input)?;
    catch_parser(|| {
        use lightningcss::stylesheet::{ParserOptions, PrinterOptions, MinifyOptions};
        use lightningcss::css_modules::Config as CssModulesConfig;

        let opts = ParserOptions {
            css_modules: Some(CssModulesConfig {
                pattern: lightningcss::css_modules::Pattern::default(),
                dashed_idents: false,
                ..Default::default()
            }),
            filename: filename.to_string(),
            ..Default::default()
        };

        let mut stylesheet = lightningcss::stylesheet::StyleSheet::parse(input, opts)
            .map_err(|e| format!("CSS parse error: {}", e))?;

        stylesheet.minify(MinifyOptions::default())
            .map_err(|e| format!("CSS minify error: {}", e))?;

        let result = stylesheet.to_css(PrinterOptions { minify: true, ..Default::default() })
            .map_err(|e| format!("CSS print error: {}", e))?;

        let mut classes = HashMap::new();
        if let Some(ref exports) = result.exports {
            for (name, export) in exports {
                classes.insert(name.to_string(), export.name.to_string());
            }
        }

        Ok(CssModuleResult { code: result.code, classes })
    })
}

pub fn minify_css(input: &str) -> Result<String, String> {
    let result = transform_css(input, true, None)?;
    Ok(result.code)
}

fn parse_targets(targets_str: &str) -> Result<lightningcss::targets::Targets, String> {
    let _ = targets_str;
    Ok(lightningcss::targets::Targets::default())
}

#[cfg(test)]
mod tests {
    use super::*;

    
    
    #[test]
    fn fuzz_grass_internal_panic_is_contained() {
        let mut rng = crate::fuzz_support::Rng::new(0x9e334cb97f4d5a1a);
        let input = crate::fuzz_support::gen_input(&mut rng, 4096);
        
        let r = std::panic::catch_unwind(|| compile_sass(&input, SassSyntax::Scss));
        assert!(r.is_ok(), "compile_sass panicked instead of returning Err on the W1.1 grass input");
        assert!(r.unwrap().is_err(), "the malformed input should be a contained Err");
    }

    #[test]
    fn fuzz_css_no_panic() {

        
        crate::fuzz_support::run_fuzz_cost("css", 20, |s| {
            let _ = compile_sass(s, SassSyntax::Scss);
            let _ = compile_sass(s, SassSyntax::Sass);
            let _ = transform_css(s, false, None);
            let _ = transform_css(s, true, None);
            let _ = extract_css_modules(s, "fuzz.css");
        });
    }

    #[test]
    fn deep_nesting_rejected_not_crash() {
        let deep = format!("{}color:red{}", ".n{".repeat(1000), "}".repeat(1000));
        assert!(compile_sass(&deep, SassSyntax::Scss).is_err(), "deep nesting must error, not overflow the stack");
        assert!(transform_css(&deep, true, None).is_err());
        
        let ok = format!("{}color:red{}", ".a{".repeat(50), "}".repeat(50));
        assert!(compile_sass(&ok, SassSyntax::Scss).is_ok());
    }

    #[test]
    fn deep_paren_nesting_rejected_not_crash() {

        
        let deep_paren = format!("a{{x:{}{}}}", "(".repeat(2000), ")".repeat(2000));
        assert!(compile_sass(&deep_paren, SassSyntax::Scss).is_err(), "deep paren nesting must error, not overflow the stack");
        assert!(transform_css(&deep_paren, true, None).is_err());
        let deep_bracket = format!("{}a{}{{color:red}}", "[".repeat(2000), "]".repeat(2000));
        assert!(transform_css(&deep_bracket, true, None).is_err(), "deep bracket nesting must error, not overflow the stack");
        
        let crash = format!(".x{{y:{}}}", "(".repeat(300));
        assert!(compile_sass(&crash, SassSyntax::Scss).is_err());
        
        assert!(compile_sass("a{width:calc((1 + 2) * 3)}", SassSyntax::Scss).is_ok());
    }

    #[test]
    fn sass_variables() {
        let result = compile_sass("$color: red;\n.btn { color: $color; }", SassSyntax::Scss).unwrap();
        assert!(result.contains("color:red") || result.contains("color: red"));
        assert!(result.contains(".btn"));
    }

    #[test]
    fn sass_nesting() {
        let result = compile_sass(".parent {\n  .child { font-size: 2rem; }\n}", SassSyntax::Scss).unwrap();
        assert!(result.contains(".parent .child"));
        assert!(result.contains("font-size"));
    }

    #[test]
    fn sass_mixins() {
        let result = compile_sass("@mixin flex { display: flex; }\n.container { @include flex; }", SassSyntax::Scss).unwrap();
        assert!(result.contains("display:flex") || result.contains("display: flex"));
    }

    #[test]
    fn sass_import_error_handled() {
        let result = compile_sass("@use 'nonexistent';", SassSyntax::Scss);
        assert!(result.is_err());
    }

    #[test]
    fn transform_minifies() {
        let result = transform_css(".btn { color:  red; }\n.btn { font-weight:  bold; }", true, None).unwrap();
        assert!(result.code.len() < 60);
        assert!(result.code.contains(".btn"));
    }

    #[test]
    fn transform_no_minify() {
        let result = transform_css(".btn { color: red; }", false, None).unwrap();
        assert!(result.code.contains(".btn"));
        assert!(result.code.contains("color"));
    }

    #[test]
    fn css_modules_scope_classes() {
        let result = extract_css_modules(".container { display: flex; }\n.title { font-size: 2rem; }", "card.module.css").unwrap();
        assert!(!result.classes.is_empty());
        assert!(result.classes.contains_key("container"));
        assert!(result.classes.contains_key("title"));
        let scoped_name = &result.classes["container"];
        assert_ne!(scoped_name, "container");
    }

    #[test]
    fn css_modules_returns_code() {
        let result = extract_css_modules(".btn { color: red; }", "button.module.css").unwrap();
        assert!(!result.code.is_empty());
        assert!(result.code.contains("color"));
    }

    #[test]
    fn minify_reduces_size() {
        let input = ".btn {\n  color:  red;\n  font-weight:  bold;\n}\n\n.card {\n  padding:  20px;\n}";
        let result = minify_css(input).unwrap();
        assert!(result.len() < input.len());
    }

    #[test]
    fn sass_then_transform() {
        let scss = "$primary: #3b82f6;\n.btn { background: $primary; &:hover { opacity: 0.8; } }";
        let css = compile_sass(scss, SassSyntax::Scss).unwrap();
        let result = transform_css(&css, true, None).unwrap();
        assert!(result.code.contains("#3b82f6") || result.code.contains("background"));
    }
}
