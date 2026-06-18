// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



use super::export_obj;
use super::extract_bytes;
use std::sync::Arc;
use crate::ffi::generated::json_api;

pub(super) fn json_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let obj = v8::Object::new(scope);
    obj_fn!(scope, obj, "parse", json_parse);
    obj_fn!(scope, obj, "parseBytes", json_parse_bytes);
    obj_fn!(scope, obj, "stringify", json_stringify);
    obj_fn!(scope, obj, "stringifyBytes", json_stringify_bytes);
    obj_fn!(scope, obj, "createReader", json_create_reader);
    obj_fn!(scope, obj, "createWriter", json_create_writer);
    export_obj(scope, module, "json", obj);
    Some(v8::undefined(scope).into())
}

fn get_json_api(scope: &mut v8::HandleScope) -> Option<Arc<json_api::Api>> {
    scope.get_slot::<Arc<json_api::Api>>().cloned()
}

pub(crate) const MAX_JSON_DEPTH: i32 = 1000;

pub(crate) fn json_str_too_deep(s: &str) -> bool {
    let (mut depth, mut in_str, mut esc) = (0i32, false, false);
    for &b in s.as_bytes() {
        if in_str {
            if esc { esc = false; }
            else if b == b'\\' { esc = true; }
            else if b == b'"' { in_str = false; }
        } else {
            match b {
                b'"' => in_str = true,
                b'[' | b'{' => { depth += 1; if depth > MAX_JSON_DEPTH { return true; } }
                b']' | b'}' => depth -= 1,
                _ => {}
            }
        }
    }
    false
}

pub(crate) fn json_value_too_deep(scope: &mut v8::HandleScope, root: v8::Local<v8::Value>) -> bool {
    let mut stack: Vec<(v8::Local<v8::Value>, i32)> = vec![(root, 0)];
    while let Some((v, d)) = stack.pop() {
        if d > MAX_JSON_DEPTH { return true; }
        if v.is_array() {
            if let Ok(arr) = v8::Local::<v8::Array>::try_from(v) {
                for i in 0..arr.length() {
                    if let Some(e) = arr.get_index(scope, i) { stack.push((e, d + 1)); }
                }
            }
        } else if v.is_object() && !v.is_function() {
            if let Ok(obj) = v8::Local::<v8::Object>::try_from(v) {
                if let Some(names) = obj.get_own_property_names(scope, Default::default()) {
                    for i in 0..names.length() {
                        if let Some(key) = names.get_index(scope, i) {
                            if let Some(val) = obj.get(scope, key) { stack.push((val, d + 1)); }
                        }
                    }
                }
            }
        }
    }
    false
}

pub fn json_parse(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let s = args.get(0);
    let v8_str = if let Ok(st) = v8::Local::<v8::String>::try_from(s) { st } else {
        let rs = s.to_rust_string_lossy(scope);
        v8::String::new(scope, &rs).unwrap_or_else(|| v8::String::empty(scope))
    };
    if json_str_too_deep(&v8_str.to_rust_string_lossy(scope)) {
        fs_throw!(scope, "json.parse: nesting exceeds 1000 levels (denial-of-service guard)"); return;
    }
    match v8::json::parse(scope, v8_str.into()) {
        Some(val) => rv.set(val),
        None => fs_throw!(scope, "json.parse: invalid JSON"),
    }
}

pub fn json_parse_bytes(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let bytes = extract_bytes(scope, args.get(0));
    
    let s = match std::str::from_utf8(&bytes) {
        Ok(s) => s,
        Err(_) => { fs_throw!(scope, "json.parseBytes: invalid UTF-8"); return; }
    };
    if json_str_too_deep(s) {
        fs_throw!(scope, "json.parseBytes: nesting exceeds 1000 levels (denial-of-service guard)"); return;
    }
    let v8_str = v8::String::new(scope, s).unwrap();
    match v8::json::parse(scope, v8_str.into()) {
        Some(val) => rv.set(val),
        None => fs_throw!(scope, "json.parseBytes: invalid JSON"),
    }
}

pub fn json_stringify(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let val = args.get(0);
    if json_value_too_deep(scope, val) {
        fs_throw!(scope, "json.stringify: nesting exceeds 1000 levels (denial-of-service guard)"); return;
    }
    match v8::json::stringify(scope, val) {
        Some(s) => rv.set(s.into()),
        None => fs_throw!(scope, "json.stringify: cannot serialize value"),
    }
}

pub fn json_stringify_bytes(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let val = args.get(0);
    if json_value_too_deep(scope, val) {
        fs_throw!(scope, "json.stringifyBytes: nesting exceeds 1000 levels (denial-of-service guard)"); return;
    }
    match v8::json::stringify(scope, val) {
        Some(s) => {
            let rs = s.to_rust_string_lossy(scope);
            let bytes = rs.into_bytes();
            let st = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared();
            let ab = v8::ArrayBuffer::with_backing_store(scope, &st);
            let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap();
            rv.set(ua.into());
        }
        None => fs_throw!(scope, "json.stringifyBytes: cannot serialize value"),
    }
}

pub fn json_create_reader(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let data = extract_bytes(scope, args.get(0));
    let api = match get_json_api(scope) { Some(a) => a, None => { fs_throw!(scope, "json: .NET library not loaded"); return; } };
    match api.json_createReader(&data) {
        Ok(handle) => {
            let obj = v8::Object::new(scope);
            let h = v8::Integer::new(scope, handle);
            let key = v8::String::new(scope, "_handle").unwrap();
            obj.set(scope, key.into(), h.into());
            let read_fn = v8::Function::new(scope, json_reader_read).unwrap();
            let key = v8::String::new(scope, "read").unwrap();
            obj.set(scope, key.into(), read_fn.into());
            let close_fn = v8::Function::new(scope, json_reader_close).unwrap();
            let key = v8::String::new(scope, "close").unwrap();
            obj.set(scope, key.into(), close_fn.into());
            rv.set(obj.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}

fn json_reader_read(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    let api = match get_json_api(scope) { Some(a) => a, None => { fs_throw!(scope, "json: .NET library not loaded"); return; } };
    match api.json_readerRead(handle) {
        Ok(result) => {
            if result.is_empty() {
                rv.set(v8::null(scope).into());
            } else {
                
                let parts: Vec<&str> = result.splitn(2, '\t').collect();
                let obj = v8::Object::new(scope);
                let k = v8::String::new(scope, "tokenType").unwrap();
                let v = v8::String::new(scope, parts[0]).unwrap();
                obj.set(scope, k.into(), v.into());
                let k = v8::String::new(scope, "value").unwrap();
                let v = v8::String::new(scope, if parts.len() > 1 { parts[1] } else { "" }).unwrap();
                obj.set(scope, k.into(), v.into());
                rv.set(obj.into());
            }
        }
        Err(e) => fs_throw!(scope, e),
    }
}

fn json_reader_close(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    if let Some(api) = get_json_api(scope) { let _ = api.json_readerClose(handle); }
}

pub fn json_create_writer(scope: &mut v8::HandleScope, _args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let api = match get_json_api(scope) { Some(a) => a, None => { fs_throw!(scope, "json: .NET library not loaded"); return; } };
    match api.json_createWriter() {
        Ok(handle) => {
            let obj = v8::Object::new(scope);
            let h = v8::Integer::new(scope, handle);
            let key = v8::String::new(scope, "_handle").unwrap();
            obj.set(scope, key.into(), h.into());
            let write_fn = v8::Function::new(scope, json_writer_write).unwrap();
            let key = v8::String::new(scope, "write").unwrap();
            obj.set(scope, key.into(), write_fn.into());
            let finish_fn = v8::Function::new(scope, json_writer_finish).unwrap();
            let key = v8::String::new(scope, "finish").unwrap();
            obj.set(scope, key.into(), finish_fn.into());
            rv.set(obj.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}

fn json_writer_write(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    let command = args.get(0).to_rust_string_lossy(scope);
    let api = match get_json_api(scope) { Some(a) => a, None => { fs_throw!(scope, "json: .NET library not loaded"); return; } };
    if let Err(e) = api.json_writerWrite(handle, &command) { fs_throw!(scope, e); }
}

fn json_writer_finish(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    let api = match get_json_api(scope) { Some(a) => a, None => { fs_throw!(scope, "json: .NET library not loaded"); return; } };
    match api.json_writerFinish(handle) {
        Ok(b) => { let st = v8::ArrayBuffer::new_backing_store_from_vec(b).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &st); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); }
        Err(e) => fs_throw!(scope, e),
    }
}
