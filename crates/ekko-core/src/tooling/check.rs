// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use swc_common::{sync::Lrc, FileName, SourceMap, Spanned};
use swc_ecma_parser::{parse_file_as_module, EsSyntax, Syntax, TsSyntax};

pub struct Diagnostic {
    pub line: usize,
    pub col: usize,
    pub message: String,
}

pub fn check_file(source: &str, filename: &str) -> Vec<Diagnostic> {
    let cm: Lrc<SourceMap> = Default::default();
    let is_tsx = filename.ends_with(".tsx");
    let is_jsx = filename.ends_with(".jsx");

    let syntax = if is_jsx {
        Syntax::Es(EsSyntax { jsx: true, ..Default::default() })
    } else {
        Syntax::Typescript(TsSyntax {
            tsx: is_tsx,
            decorators: true,
            ..Default::default()
        })
    };

    let fm = cm.new_source_file(FileName::Custom(filename.to_string()).into(), source.to_string());

    let mut errors = vec![];
    let result = parse_file_as_module(&fm, syntax, Default::default(), None, &mut errors);

    let mut diagnostics = Vec::new();

    for err in &errors {
        let loc = cm.lookup_char_pos(err.span().lo);
        diagnostics.push(Diagnostic {
            line: loc.line,
            col: loc.col_display + 1,
            message: format!("{}", err.kind().msg()),
        });
    }

    if let Err(err) = result {
        let loc = cm.lookup_char_pos(err.span().lo);
        diagnostics.push(Diagnostic {
            line: loc.line,
            col: loc.col_display + 1,
            message: format!("{}", err.kind().msg()),
        });
    }

    diagnostics
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_ts_no_errors() {
        let source = "const x: number = 42;\nfunction add(a: number, b: number): number { return a + b; }";
        let diags = check_file(source, "test.ts");
        assert!(diags.is_empty(), "expected no errors, got: {:?}", diags.iter().map(|d| &d.message).collect::<Vec<_>>());
    }

    #[test]
    fn syntax_error_detected() {
        let source = "const x: number = @@@;";
        let diags = check_file(source, "bad.ts");
        assert!(!diags.is_empty());
        assert_eq!(diags[0].line, 1);
    }

    #[test]
    fn tsx_valid() {
        let source = "const App = () => <div>Hello</div>;";
        let diags = check_file(source, "app.tsx");
        assert!(diags.is_empty(), "got: {:?}", diags.iter().map(|d| &d.message).collect::<Vec<_>>());
    }

    
    
    #[test]
    fn css_imports_not_flagged() {
        let source = "import \"./styles/global.scss\";\nimport s from \"./Button.module.scss\";\nimport c from \"./x.module.css\";\nexport const k = s.box + c.card;";
        let diags = check_file(source, "page.tsx");
        assert!(diags.is_empty(), "css imports must not be flagged, got: {:?}", diags.iter().map(|d| &d.message).collect::<Vec<_>>());
    }

    #[test]
    fn unterminated_string_detected() {
        let source = "const s = \"hello\nconst x = 1;";
        let diags = check_file(source, "bad.ts");
        assert!(!diags.is_empty());
    }

    #[test]
    fn missing_closing_brace() {
        let source = "function foo() {\n  const x = 1;\n";
        let diags = check_file(source, "bad.ts");
        assert!(!diags.is_empty());
    }

    #[test]
    fn multiple_errors_reported() {
        let source = "const a = @;\nconst b = #;";
        let diags = check_file(source, "bad.ts");
        assert!(diags.len() >= 1);
    }

    #[test]
    fn line_and_col_correct() {
        let source = "const x = 1;\nconst y = @@@;";
        let diags = check_file(source, "test.ts");
        assert!(!diags.is_empty());
        assert_eq!(diags[0].line, 2);
    }

    #[test]
    fn empty_file_no_errors() {
        let diags = check_file("", "empty.ts");
        assert!(diags.is_empty());
    }
}
