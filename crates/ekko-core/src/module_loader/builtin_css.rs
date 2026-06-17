// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



pub(super) fn css_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    set_export_fn!(scope, module, "compileSass", css_compile_sass);
    set_export_fn!(scope, module, "transform", css_transform);
    set_export_fn!(scope, module, "cssModules", css_css_modules);
    set_export_fn!(scope, module, "minify", css_minify);
    Some(v8::undefined(scope).into())
}

fn css_compile_sass(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let input = args.get(0).to_rust_string_lossy(scope);
    let syntax = if args.length() > 1 {
        let s = args.get(1).to_rust_string_lossy(scope);
        if s == "sass" { crate::parsers::css::SassSyntax::Sass } else { crate::parsers::css::SassSyntax::Scss }
    } else {
        crate::parsers::css::SassSyntax::Scss
    };
    match crate::parsers::css::compile_sass(&input, syntax) {
        Ok(css) => set_str_or_throw!(scope, rv, css, "ekko:ssr/css compile"),
        Err(e) => {
            let msg = v8::String::new(scope, &e).unwrap_or_else(|| v8::String::empty(scope));
            scope.throw_exception(msg.into());
        }
    }
}

fn css_transform(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let input = args.get(0).to_rust_string_lossy(scope);
    let mut do_minify = true;
    let mut targets: Option<String> = None;
    if args.length() > 1 && args.get(1).is_object() {
        let opts = v8::Local::<v8::Object>::try_from(args.get(1)).unwrap();
        let mk = v8::String::new(scope, "minify").unwrap();
        if let Some(mv) = opts.get(scope, mk.into()) {
            if mv.is_boolean() { do_minify = mv.boolean_value(scope); }
        }
        let tk = v8::String::new(scope, "targets").unwrap();
        if let Some(tv) = opts.get(scope, tk.into()) {
            if tv.is_string() { targets = Some(tv.to_rust_string_lossy(scope)); }
        }
    }
    match crate::parsers::css::transform_css(&input, do_minify, targets.as_deref()) {
        Ok(result) => {
            let obj = v8::Object::new(scope);
            let ck = v8::String::new(scope, "code").unwrap();
            let cv = v8::String::new(scope, &result.code).unwrap_or_else(|| v8::String::empty(scope));
            obj.set(scope, ck.into(), cv.into());
            rv.set(obj.into());
        }
        Err(e) => {
            let msg = v8::String::new(scope, &e).unwrap_or_else(|| v8::String::empty(scope));
            scope.throw_exception(msg.into());
        }
    }
}

fn css_css_modules(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let input = args.get(0).to_rust_string_lossy(scope);
    let filename = if args.length() > 1 { args.get(1).to_rust_string_lossy(scope) } else { "module.css".to_string() };
    match crate::parsers::css::extract_css_modules(&input, &filename) {
        Ok(result) => {
            let obj = v8::Object::new(scope);
            let ck = v8::String::new(scope, "code").unwrap();
            let cv = v8::String::new(scope, &result.code).unwrap_or_else(|| v8::String::empty(scope));
            obj.set(scope, ck.into(), cv.into());
            let classes_obj = v8::Object::new(scope);
            for (name, scoped) in &result.classes {
                let nk = v8::String::new(scope, name).unwrap();
                let nv = v8::String::new(scope, scoped).unwrap();
                classes_obj.set(scope, nk.into(), nv.into());
            }
            let clk = v8::String::new(scope, "classes").unwrap();
            obj.set(scope, clk.into(), classes_obj.into());
            rv.set(obj.into());
        }
        Err(e) => {
            let msg = v8::String::new(scope, &e).unwrap_or_else(|| v8::String::empty(scope));
            scope.throw_exception(msg.into());
        }
    }
}

fn css_minify(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let input = args.get(0).to_rust_string_lossy(scope);
    match crate::parsers::css::minify_css(&input) {
        Ok(css) => set_str_or_throw!(scope, rv, css, "ekko:ssr/css compile"),
        Err(e) => {
            let msg = v8::String::new(scope, &e).unwrap_or_else(|| v8::String::empty(scope));
            scope.throw_exception(msg.into());
        }
    }
}
