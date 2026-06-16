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
use std::sync::{Arc, Mutex, OnceLock};
use crate::engine::v8_runtime::read_permit;

static EKL_CACHE: OnceLock<Mutex<HashMap<String, (u64, Arc<ekko_vfs::EklPackage>)>>> = OnceLock::new();
fn ekl_cache() -> &'static Mutex<HashMap<String, (u64, Arc<ekko_vfs::EklPackage>)>> {
    EKL_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn norm_member(m: &str) -> String {
    m.strip_prefix("ekl://").unwrap_or(m).trim_start_matches('/').to_string()
}

fn load(scope: &mut v8::HandleScope, path: &str) -> Option<Arc<ekko_vfs::EklPackage>> {
    let p = std::path::Path::new(path);
    if !read_permit(p) {
        let m = v8::String::new(scope, &format!("PermissionError: fs access denied for '{}'. Run with --allow=fs", path)).unwrap();
        scope.throw_exception(m.into());
        return None;
    }
    let mtime = std::fs::metadata(p).ok()
        .and_then(|md| md.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    if let Ok(cache) = ekl_cache().lock() {
        if let Some((mt, pkg)) = cache.get(path) {
            if *mt == mtime { return Some(pkg.clone()); }
        }
    }
    match ekko_vfs::EklPackage::from_file(p) {
        Ok(pkg) => {
            let arc = Arc::new(pkg);
            if let Ok(mut cache) = ekl_cache().lock() {
                if cache.len() > 64 { cache.clear(); } 
                cache.insert(path.to_string(), (mtime, arc.clone()));
            }
            Some(arc)
        }
        Err(e) => {
            let m = v8::String::new(scope, &format!("cannot open .ekl '{}': {}", path, e)).unwrap();
            scope.throw_exception(m.into());
            None
        }
    }
}

fn ekl_list(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let path = args.get(0).to_rust_string_lossy(scope);
    let pkg = match load(scope, &path) { Some(p) => p, None => return };
    let entries = pkg.entries();
    let arr = v8::Array::new(scope, entries.len() as i32);
    for (i, e) in entries.iter().enumerate() {
        let s = v8::String::new(scope, &e.path).unwrap();
        arr.set_index(scope, i as u32, s.into());
    }
    rv.set(arr.into());
}

fn ekl_entries(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let path = args.get(0).to_rust_string_lossy(scope);
    let pkg = match load(scope, &path) { Some(p) => p, None => return };
    let entries = pkg.entries();
    let arr = v8::Array::new(scope, entries.len() as i32);
    for (i, e) in entries.iter().enumerate() {
        let obj = v8::Object::new(scope);
        let pk = v8::String::new(scope, "path").unwrap();
        let pv = v8::String::new(scope, &e.path).unwrap();
        obj.set(scope, pk.into(), pv.into());
        let sk = v8::String::new(scope, "size").unwrap();
        let sv = v8::Number::new(scope, e.size as f64);
        obj.set(scope, sk.into(), sv.into());
        arr.set_index(scope, i as u32, obj.into());
    }
    rv.set(arr.into());
}

fn ekl_exists(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let path = args.get(0).to_rust_string_lossy(scope);
    let member = norm_member(&args.get(1).to_rust_string_lossy(scope));
    let pkg = match load(scope, &path) { Some(p) => p, None => return };
    let found = pkg.entries().iter().any(|e| e.path == member);
    rv.set(v8::Boolean::new(scope, found).into());
}

fn ekl_read_text(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let path = args.get(0).to_rust_string_lossy(scope);
    let member = norm_member(&args.get(1).to_rust_string_lossy(scope));
    let pkg = match load(scope, &path) { Some(p) => p, None => return };
    match pkg.read_str(&member) {
        Some(s) => { let v = v8::String::new(scope, &s).unwrap_or_else(|| v8::String::empty(scope)); rv.set(v.into()); }
        None => rv.set(v8::null(scope).into()),
    }
}

fn ekl_read(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let path = args.get(0).to_rust_string_lossy(scope);
    let member = norm_member(&args.get(1).to_rust_string_lossy(scope));
    let pkg = match load(scope, &path) { Some(p) => p, None => return };
    match pkg.read(&member) {
        Some(bytes) => {
            let store = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared();
            let ab = v8::ArrayBuffer::with_backing_store(scope, &store);
            let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap();
            rv.set(ua.into());
        }
        None => rv.set(v8::null(scope).into()),
    }
}

pub(super) fn ekl_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    set_export_fn!(scope, module, "list", ekl_list);
    set_export_fn!(scope, module, "entries", ekl_entries);
    set_export_fn!(scope, module, "exists", ekl_exists);
    set_export_fn!(scope, module, "readText", ekl_read_text);
    set_export_fn!(scope, module, "read", ekl_read);
    Some(v8::undefined(scope).into())
}
