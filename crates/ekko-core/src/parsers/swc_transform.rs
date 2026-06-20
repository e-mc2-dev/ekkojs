// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use swc_common::{
    comments::SingleThreadedComments,
    errors::Handler,
    sync::Lrc,
    FileName, SourceMap, DUMMY_SP,
};
use swc_common::Spanned;
use swc_ecma_ast::*;
use swc_ecma_codegen::{text_writer::JsWriter, Emitter};
use swc_ecma_parser::{parse_file_as_module, EsSyntax, Syntax};
use swc_ecma_visit::{Visit, VisitWith, VisitMut, VisitMutWith};

struct TopLevelAwaitDetector { depth: usize, found: bool }
impl Visit for TopLevelAwaitDetector {
    fn visit_await_expr(&mut self, n: &AwaitExpr) {
        if self.depth == 0 { self.found = true; }
        n.visit_children_with(self);
    }
    fn visit_function(&mut self, n: &Function) { self.depth += 1; n.visit_children_with(self); self.depth -= 1; }
    fn visit_arrow_expr(&mut self, n: &ArrowExpr) { self.depth += 1; n.visit_children_with(self); self.depth -= 1; }
}

pub fn rewrite_top_level_await(code: &str) -> Option<String> {
    let cm: swc_common::sync::Lrc<SourceMap> = Default::default();
    let fm = cm.new_source_file(FileName::Custom("repl.js".into()).into(), code.to_string());
    let mut errors = vec![];
    let module = parse_file_as_module(&fm, Syntax::Es(EsSyntax::default()), Default::default(), None, &mut errors).ok()?;
    if !errors.is_empty() { return None; }

    let mut det = TopLevelAwaitDetector { depth: 0, found: false };
    module.visit_with(&mut det);
    if !det.found { return None; }

    let base = fm.start_pos.0;
    let slice = |sp: swc_common::Span| -> &str {
        let lo = sp.lo.0.saturating_sub(base) as usize;
        let hi = sp.hi.0.saturating_sub(base) as usize;
        code.get(lo..hi).unwrap_or("")
    };

    let n = module.body.len();
    let mut out = String::from("(async () => { let __ekko_ret;\n");
    for (i, item) in module.body.iter().enumerate() {
        let is_last = i + 1 == n;
        match item {
            ModuleItem::Stmt(stmt) => match stmt {

                Stmt::Decl(Decl::Var(var))
                    if var.decls.iter().all(|d| matches!(&d.name, Pat::Ident(_)) && d.init.is_some()) =>
                {
                    for d in &var.decls {
                        if let (Pat::Ident(bi), Some(init)) = (&d.name, &d.init) {
                            out.push_str(&format!("globalThis.{} = {};\n", bi.id.sym, slice(init.span())));
                        }
                    }
                }
                Stmt::Decl(Decl::Fn(f)) => {
                    out.push_str(&format!("globalThis.{} = {};\n", f.ident.sym, slice(stmt.span())));
                }
                Stmt::Decl(Decl::Class(c)) => {
                    out.push_str(&format!("globalThis.{} = {};\n", c.ident.sym, slice(stmt.span())));
                }
                
                Stmt::Expr(es) if is_last => {
                    out.push_str(&format!("__ekko_ret = ({});\n", slice(es.expr.span())));
                }
                
                other => {
                    out.push_str(slice(other.span()));
                    out.push('\n');
                }
            },
            
            ModuleItem::ModuleDecl(_) => {
                out.push_str(slice(item.span()));
                out.push('\n');
            }
        }
    }
    out.push_str("return __ekko_ret; })()");
    Some(out)
}

pub fn transpile_ts(source: &str, filename: &str) -> anyhow::Result<String> {
    let cm: Lrc<SourceMap> = Default::default();
    let handler = Handler::with_emitter_writer(Box::new(std::io::stderr()), Some(cm.clone()));

    let options = swc_ts_fast_strip::Options {
        module: None,
        filename: Some(filename.to_string()),
        ..Default::default()
    };
    let result = swc_ts_fast_strip::operate(&cm, &handler, source.to_string(), options)
        .map_err(|e| anyhow::anyhow!("{}", e))?;
    Ok(result.code)
}

fn is_js_ident(s: &str) -> bool {
    let mut chars = s.chars();
    match chars.next() {
        Some(c) if c.is_ascii_alphabetic() || c == '_' || c == '$' => {}
        _ => return false,
    }
    chars.all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '$')
}

struct JsxTransform { used: bool }

impl JsxTransform {
    
    fn jsx_call(&self, tag: Box<Expr>, props: Box<Expr>, children: Vec<ExprOrSpread>) -> Expr {
        let callee_name = if children.len() > 1 { "_jsxs" } else { "_jsx" };
        let mut args = vec![ExprOrSpread { spread: None, expr: tag }];

        if children.is_empty() {
            args.push(ExprOrSpread { spread: None, expr: props });
        } else if children.len() == 1 {
            let props_with_children = self.add_children_to_props(props, children[0].expr.clone());
            args.push(ExprOrSpread { spread: None, expr: props_with_children });
        } else {
            let arr = Expr::Array(ArrayLit {
                span: DUMMY_SP,
                elems: children.into_iter().map(|c| Some(c)).collect(),
            });
            let props_with_children = self.add_children_to_props(props, Box::new(arr));
            args.push(ExprOrSpread { spread: None, expr: props_with_children });
        }

        Expr::Call(CallExpr {
            span: DUMMY_SP,
            callee: Callee::Expr(Box::new(Expr::Ident(Ident::new(callee_name.into(), DUMMY_SP, Default::default())))),
            args,
            ..Default::default()
        })
    }

    fn add_children_to_props(&self, props: Box<Expr>, children: Box<Expr>) -> Box<Expr> {
        match *props {
            Expr::Object(mut obj) => {
                obj.props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                    key: PropName::Ident(IdentName::new("children".into(), DUMMY_SP)),
                    value: children,
                }))));
                Box::new(Expr::Object(obj))
            }
            _ => props,
        }
    }

    fn tag_to_expr(&self, name: &JSXElementName) -> Box<Expr> {
        match name {
            JSXElementName::Ident(id) => {
                let name_str = id.sym.as_ref();
                if name_str.starts_with(char::is_lowercase) {
                    Box::new(Expr::Lit(Lit::Str(Str { span: DUMMY_SP, value: name_str.into(), raw: None })))
                } else {
                    Box::new(Expr::Ident(id.clone().into()))
                }
            }
            JSXElementName::JSXMemberExpr(member) => {
                self.member_to_expr(member)
            }
            JSXElementName::JSXNamespacedName(_) => {
                Box::new(Expr::Lit(Lit::Str(Str { span: DUMMY_SP, value: "div".into(), raw: None })))
            }
        }
    }

    fn member_to_expr(&self, member: &JSXMemberExpr) -> Box<Expr> {
        let obj = match &member.obj {
            JSXObject::Ident(id) => Box::new(Expr::Ident(id.clone().into())),
            JSXObject::JSXMemberExpr(inner) => self.member_to_expr(inner),
        };
        Box::new(Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj,
            prop: MemberProp::Ident(IdentName::new(member.prop.sym.clone(), DUMMY_SP)),
        }))
    }

    fn attrs_to_props(&self, attrs: &[JSXAttrOrSpread]) -> Box<Expr> {
        let mut props = vec![];
        for attr in attrs {
            match attr {
                JSXAttrOrSpread::JSXAttr(a) => {
                    let key = match &a.name {
                        JSXAttrName::Ident(id) => {
                            if is_js_ident(id.sym.as_ref()) {
                                PropName::Ident(IdentName::new(id.sym.clone(), DUMMY_SP))
                            } else {

                                PropName::Str(Str { span: DUMMY_SP, value: id.sym.clone().into(), raw: None })
                            }
                        }
                        JSXAttrName::JSXNamespacedName(ns) => {
                            PropName::Str(Str { span: DUMMY_SP, value: format!("{}:{}", ns.ns.sym, ns.name.sym).into(), raw: None })
                        }
                    };
                    let value = match &a.value {
                        Some(JSXAttrValue::Str(s)) => Box::new(Expr::Lit(Lit::Str(s.clone()))),
                        Some(JSXAttrValue::JSXExprContainer(JSXExprContainer { expr: JSXExpr::Expr(e), .. })) => e.clone(),
                        Some(JSXAttrValue::JSXElement(el)) => {
                            let mut el_clone = *el.clone();
                            self.transform_element(&mut el_clone);
                            Box::new(Expr::JSXElement(Box::new(el_clone)))
                        }
                        Some(JSXAttrValue::JSXFragment(frag)) => Box::new(Expr::JSXFragment(frag.clone())),
                        _ => Box::new(Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true }))),
                    };
                    props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp { key, value }))));
                }
                JSXAttrOrSpread::SpreadElement(spread) => {
                    props.push(PropOrSpread::Spread(spread.clone()));
                }
            }
        }
        Box::new(Expr::Object(ObjectLit { span: DUMMY_SP, props }))
    }

    

    
    
    fn clean_jsx_text(&self, raw: &str) -> Option<String> {
        let lines: Vec<&str> = raw.split('\n').collect();
        let is_blank = |l: &str| !l.chars().any(|c| c != ' ' && c != '\t' && c != '\r');
        let mut last_nonblank = 0usize;
        for (i, l) in lines.iter().enumerate() {
            if !is_blank(l) { last_nonblank = i; }
        }
        let n = lines.len();
        let mut out = String::new();
        for (i, line) in lines.iter().enumerate() {
            let mut s = line.replace('\t', " ").replace('\r', "");
            if i != 0 { s = s.trim_start_matches(' ').to_string(); }
            if i != n - 1 { s = s.trim_end_matches(' ').to_string(); }
            if !s.is_empty() {
                if i != last_nonblank { s.push(' '); }
                out.push_str(&s);
            }
        }
        if out.is_empty() { None } else { Some(out) }
    }

    fn children_to_exprs(&self, children: &[JSXElementChild]) -> Vec<ExprOrSpread> {
        let mut result = vec![];
        for child in children {
            match child {
                JSXElementChild::JSXText(text) => {
                    if let Some(cleaned) = self.clean_jsx_text(&text.value.to_string()) {
                        result.push(ExprOrSpread {
                            spread: None,
                            expr: Box::new(Expr::Lit(Lit::Str(Str { span: DUMMY_SP, value: cleaned.into(), raw: None }))),
                        });
                    }
                }
                JSXElementChild::JSXExprContainer(JSXExprContainer { expr: JSXExpr::Expr(e), .. }) => {
                    result.push(ExprOrSpread { spread: None, expr: e.clone() });
                }
                JSXElementChild::JSXElement(el) => {
                    let tag = self.tag_to_expr(&el.opening.name);
                    let props = self.attrs_to_props(&el.opening.attrs);
                    let children = self.children_to_exprs(&el.children);
                    result.push(ExprOrSpread {
                        spread: None,
                        expr: Box::new(self.jsx_call(tag, props, children)),
                    });
                }
                JSXElementChild::JSXFragment(frag) => {
                    let tag = Box::new(Expr::Ident(Ident::new("_Fragment".into(), DUMMY_SP, Default::default())));
                    let props = Box::new(Expr::Object(ObjectLit { span: DUMMY_SP, props: vec![] }));
                    let children = self.children_to_exprs(&frag.children);
                    result.push(ExprOrSpread {
                        spread: None,
                        expr: Box::new(self.jsx_call(tag, props, children)),
                    });
                }
                _ => {}
            }
        }
        result
    }

    fn transform_element(&self, _el: &mut JSXElement) {
        
    }
}

impl VisitMut for JsxTransform {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        expr.visit_mut_children_with(self);

        match expr {
            Expr::JSXElement(el) => {
                self.used = true;
                let tag = self.tag_to_expr(&el.opening.name);
                let props = self.attrs_to_props(&el.opening.attrs);
                let children = self.children_to_exprs(&el.children);
                *expr = self.jsx_call(tag, props, children);
            }
            Expr::JSXFragment(frag) => {
                self.used = true;
                let tag = Box::new(Expr::Ident(Ident::new("_Fragment".into(), DUMMY_SP, Default::default())));
                let props = Box::new(Expr::Object(ObjectLit { span: DUMMY_SP, props: vec![] }));
                let children = self.children_to_exprs(&frag.children);
                *expr = self.jsx_call(tag, props, children);
            }
            _ => {}
        }
    }
}

pub fn transpile_jsx(source: &str, filename: &str) -> anyhow::Result<String> {
    let is_tsx = filename.ends_with(".tsx");

    let js_source = if is_tsx {
        let cm: Lrc<SourceMap> = Default::default();
        let handler = Handler::with_emitter_writer(Box::new(std::io::stderr()), Some(cm.clone()));
        let mut options = swc_ts_fast_strip::Options {
            module: None,
            filename: Some(filename.to_string()),
            ..Default::default()
        };
        options.parser.tsx = true;
        let result = swc_ts_fast_strip::operate(&cm, &handler, source.to_string(), options)
            .map_err(|e| anyhow::anyhow!("{}", e))?;
        result.code
    } else {
        source.to_string()
    };

    let cm: Lrc<SourceMap> = Default::default();
    let comments = SingleThreadedComments::default();
    let syntax = Syntax::Es(EsSyntax { jsx: true, ..Default::default() });
    let fm = cm.new_source_file(FileName::Custom(filename.to_string()).into(), js_source);

    let mut errors = vec![];
    let mut module = parse_file_as_module(&fm, syntax, Default::default(), Some(&comments), &mut errors)
        .map_err(|e| anyhow::anyhow!("Parse error in '{}': {:?}", filename, e))?;

    let mut transform = JsxTransform { used: false };
    module.visit_mut_with(&mut transform);

    let mut buf = vec![];
    {
        let writer = JsWriter::new(cm.clone(), "\n", &mut buf, None);
        let mut emitter = Emitter {
            cfg: swc_ecma_codegen::Config::default().with_minify(false),
            cm: cm.clone(),
            comments: Some(&comments),
            wr: writer,
        };
        emitter.emit_module(&module).map_err(|e| anyhow::anyhow!("Codegen error: {:?}", e))?;
    }

    let code = String::from_utf8(buf).map_err(|e| anyhow::anyhow!("UTF-8 error: {}", e))?;

    

    
    if transform.used {
        Ok(format!(
            "import {{ jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment }} from \"ekko:jsx-runtime\";\n{}",
            code
        ))
    } else {
        Ok(code)
    }
}

pub fn transpile(source: &str, filename: &str) -> anyhow::Result<String> {
    if filename.ends_with(".tsx") || filename.ends_with(".jsx") {
        transpile_jsx(source, filename)
    } else {
        transpile_ts(source, filename)
    }
}

pub fn needs_transpile(filename: &str) -> bool {
    filename.ends_with(".ts") || filename.ends_with(".tsx") || filename.ends_with(".jsx")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_type_annotations() {
        let ts = r#"const x: string = "hello";"#;
        let js = transpile(ts, "test.ts").unwrap();
        assert!(js.contains(r#""hello""#));
        assert!(!js.contains(": string"));
    }

    #[test]
    fn removes_interfaces() {
        let ts = "interface Foo { bar: string }\nconst x = 1;";
        let js = transpile(ts, "test.ts").unwrap();
        assert!(js.contains("const x = 1"));
        assert!(!js.contains("interface"));
    }

    #[test]
    fn preserves_js_logic() {
        let ts = "function add(a: number, b: number): number { return a + b; }";
        let js = transpile(ts, "test.ts").unwrap();
        assert!(js.contains("function add"));
        assert!(js.contains("return a + b"));
    }

    #[test]
    fn syntax_error_caught() {
        let ts = "const x: string = @@@";
        assert!(transpile(ts, "bad.ts").is_err());
    }

    #[test]
    fn needs_transpile_extensions() {
        assert!(!needs_transpile("app.js"));
        assert!(needs_transpile("app.ts"));
        assert!(needs_transpile("component.tsx"));
        assert!(needs_transpile("component.jsx"));
    }

    #[test]
    fn tsx_jsx_is_transformed() {
        let tsx = r#"const App = () => <h1>Hello</h1>;"#;
        let js = transpile(tsx, "app.tsx").unwrap();
        assert!(!js.contains("<h1>"), "JSX should be transformed, got: {}", js);
        assert!(js.contains("_jsx"), "Should contain _jsx call, got: {}", js);
    }

    #[test]
    fn jsx_file_is_transformed() {
        let jsx = r#"const El = () => <div className="test">Content</div>;"#;
        let js = transpile(jsx, "comp.jsx").unwrap();
        assert!(!js.contains("<div"), "JSX should be transformed, got: {}", js);
    }

    #[test]
    fn tsx_with_types_and_jsx() {
        let tsx = "interface Props { name: string }\nconst Greet = (props: Props) => <span>{props.name}</span>;";
        let js = transpile(tsx, "greet.tsx").unwrap();
        assert!(!js.contains("interface"), "Interface should be stripped");
        assert!(!js.contains("<span>"), "JSX should be transformed");
    }

    #[test]
    fn jsx_hyphenated_attr() {
        let tsx = r#"const x = <div data-nav="y" aria-hidden="true" className="c">hi</div>;"#;
        let js = transpile(tsx, "t.tsx").unwrap();
        assert!(js.contains("\"data-nav\""), "data-nav must be a quoted key, got: {}", js);
        assert!(js.contains("\"aria-hidden\""), "aria-hidden must be a quoted key, got: {}", js);
        assert!(js.contains("className"), "valid ident must remain unquoted");
        assert!(!js.contains("data-nav:"), "must never emit an unquoted hyphen key");
    }

    #[test]
    fn is_js_ident_cases() {
        assert!(is_js_ident("className"));
        assert!(is_js_ident("_x"));
        assert!(is_js_ident("$ref"));
        assert!(is_js_ident("data0"));
        assert!(!is_js_ident("data-nav"));
        assert!(!is_js_ident("aria-hidden"));
        assert!(!is_js_ident(""));
        assert!(!is_js_ident("9lives"));
    }

    #[test]
    fn ts_uses_fast_path() {
        let ts = "const x: number = 42;";
        let js = transpile_ts(ts, "test.ts").unwrap();
        assert!(js.contains("42"));
        assert!(!js.contains(": number"));
    }
}
