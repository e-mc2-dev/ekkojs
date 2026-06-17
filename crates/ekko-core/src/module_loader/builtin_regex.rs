// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



use std::sync::Arc;
use crate::ffi::generated::regex_api;

pub(super) fn regex_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    set_export_fn!(scope, module, "Regex", regex_create);
    Some(v8::undefined(scope).into())
}

fn get_regex_api(scope: &mut v8::HandleScope) -> Option<Arc<regex_api::Api>> {
    scope.get_slot::<Arc<regex_api::Api>>().cloned()
}

pub fn regex_create(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let pattern = args.get(0).to_rust_string_lossy(scope);
    let flags = if args.length() > 1 { args.get(1).to_rust_string_lossy(scope) } else { String::new() };
    let api = match get_regex_api(scope) { Some(a) => a, None => { fs_throw!(scope, "regex: .NET library not loaded"); return; } };
    match api.regex_create(&pattern, &flags) {
        Ok(handle) => {
            let obj = v8::Object::new(scope);
            let h = v8::Integer::new(scope, handle);
            let key = v8::String::new(scope, "_handle").unwrap();
            obj.set(scope, key.into(), h.into());
            let f = v8::Function::new(scope, regex_test).unwrap();
            let k = v8::String::new(scope, "test").unwrap();
            obj.set(scope, k.into(), f.into());
            let f = v8::Function::new(scope, regex_match).unwrap();
            let k = v8::String::new(scope, "match").unwrap();
            obj.set(scope, k.into(), f.into());
            let f = v8::Function::new(scope, regex_match_all).unwrap();
            let k = v8::String::new(scope, "matchAll").unwrap();
            obj.set(scope, k.into(), f.into());
            let f = v8::Function::new(scope, regex_replace).unwrap();
            let k = v8::String::new(scope, "replace").unwrap();
            obj.set(scope, k.into(), f.into());
            let f = v8::Function::new(scope, regex_split).unwrap();
            let k = v8::String::new(scope, "split").unwrap();
            obj.set(scope, k.into(), f.into());
            let f = v8::Function::new(scope, regex_dispose).unwrap();
            let k = v8::String::new(scope, "dispose").unwrap();
            obj.set(scope, k.into(), f.into());
            rv.set(obj.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}

fn regex_test(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    let input = args.get(0).to_rust_string_lossy(scope);
    let api = match get_regex_api(scope) { Some(a) => a, None => { fs_throw!(scope, "regex: .NET library not loaded"); return; } };
    match api.regex_test(handle, &input) {
        
        Ok(result) => rv.set(v8::Boolean::new(scope, result != 0).into()),
        Err(e) => fs_throw!(scope, e),
    }
}

fn regex_match(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    let input = args.get(0).to_rust_string_lossy(scope);
    let api = match get_regex_api(scope) { Some(a) => a, None => { fs_throw!(scope, "regex: .NET library not loaded"); return; } };
    match api.regex_match(handle, &input) {
        Ok(json) => {
            if json.is_empty() { rv.set(v8::null(scope).into()); return; }
            let v8_str = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope));
            match v8::json::parse(scope, v8_str.into()) {
                Some(val) => rv.set(val),
                None => fs_throw!(scope, "regex.match: invalid result"),
            }
        }
        Err(e) => fs_throw!(scope, e),
    }
}

fn regex_match_all(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    let input = args.get(0).to_rust_string_lossy(scope);
    let api = match get_regex_api(scope) { Some(a) => a, None => { fs_throw!(scope, "regex: .NET library not loaded"); return; } };
    match api.regex_matchAll(handle, &input) {
        Ok(json) => {
            let v8_str = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope));
            match v8::json::parse(scope, v8_str.into()) {
                Some(val) => rv.set(val),
                None => rv.set(v8::Array::new(scope, 0).into()),
            }
        }
        Err(e) => fs_throw!(scope, e),
    }
}

fn regex_replace(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    let input = args.get(0).to_rust_string_lossy(scope);
    let replacement = args.get(1).to_rust_string_lossy(scope);
    let api = match get_regex_api(scope) { Some(a) => a, None => { fs_throw!(scope, "regex: .NET library not loaded"); return; } };
    match api.regex_replace(handle, &input, &replacement) {
        Ok(s) => set_str_or_throw!(scope, rv, s, "ekko:text/regex replace"),
        Err(e) => fs_throw!(scope, e),
    }
}

fn regex_split(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    let input = args.get(0).to_rust_string_lossy(scope);
    let api = match get_regex_api(scope) { Some(a) => a, None => { fs_throw!(scope, "regex: .NET library not loaded"); return; } };
    match api.regex_split(handle, &input) {
        Ok(json) => {
            let v8_str = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope));
            match v8::json::parse(scope, v8_str.into()) {
                Some(val) => rv.set(val),
                None => rv.set(v8::Array::new(scope, 0).into()),
            }
        }
        Err(e) => fs_throw!(scope, e),
    }
}

fn regex_dispose(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    if let Some(api) = get_regex_api(scope) { let _ = api.regex_dispose(handle); }
}
