// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::cell::{Cell, RefCell};
use std::rc::Rc;
use std::sync::{Arc, Mutex, Once, OnceLock};
use std::sync::atomic::{AtomicBool, AtomicUsize, AtomicU64, Ordering};
use std::time::Duration;
use anyhow::Context;
use tokio::time::Instant;

pub static PANIC_COUNT: AtomicU64 = AtomicU64::new(0);
pub static PROCESS_START: std::sync::LazyLock<std::time::Instant> =
    std::sync::LazyLock::new(std::time::Instant::now);

use crate::engine::channel::ChannelRegistry;
use crate::ffi::generated::{compress_api, date_time_api, encoding_api, fs_api, crypto_api, json_api, net_api, process_api, regex_api, web_api, web_server_api};
use crate::ops::callback_bridge::{self, BridgeReceiver};
use crate::engine::isolate_pool::{ChildTracker, IsolatePool};
use crate::ops::async_state::AsyncState;
use crate::ops::performance::PerformanceState;
use crate::ops::timers::{TimerEntry, TimerState};

static V8_INIT: Once = Once::new();

thread_local! {
    static CONTEXT_PERMS: std::cell::RefCell<crate::ffi::ffi_runtime::PermissionSet> =
        std::cell::RefCell::new(crate::ffi::ffi_runtime::PermissionSet::new());
}

pub fn set_context_permissions(perms: crate::ffi::ffi_runtime::PermissionSet) {
    CONTEXT_PERMS.with(|p| *p.borrow_mut() = perms);
}

pub fn get_context_permissions() -> crate::ffi::ffi_runtime::PermissionSet {
    CONTEXT_PERMS.with(|p| p.borrow().clone())
}

pub fn check_permission(category: &str) -> bool {
    CONTEXT_PERMS.with(|p| p.borrow().check(category))
}

static PROTECTED_PATHS: OnceLock<Vec<String>> = OnceLock::new();

fn init_protected_paths() -> Vec<String> {
    let mut paths = Vec::new();
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            if let Ok(canon) = std::fs::canonicalize(dir) {
                paths.push(canon.to_string_lossy().to_string());
            }
        }
    }
    let store = crate::packages::store::store_root();
    if let Ok(canon) = std::fs::canonicalize(&store) {
        paths.push(canon.to_string_lossy().to_string());
    } else {
        paths.push(store.to_string_lossy().to_string());
    }
    paths
}

fn normalize_for_check(path: &str) -> String {
    use std::path::{Component, Path, PathBuf};
    let p = Path::new(path);
    let abs: PathBuf = if p.is_absolute() {
        p.to_path_buf()
    } else {
        std::env::current_dir().unwrap_or_default().join(p)
    };
    
    let mut lex = PathBuf::new();
    for comp in abs.components() {
        match comp {
            Component::ParentDir => { lex.pop(); }
            Component::CurDir => {}
            other => lex.push(other.as_os_str()),
        }
    }

    let mut existing = lex.clone();
    let mut tail: Vec<std::ffi::OsString> = Vec::new();
    while !existing.exists() {
        match existing.file_name() {
            Some(name) => {
                tail.push(name.to_os_string());
                if !existing.pop() { break; }
            }
            None => break,
        }
    }
    let resolved = match std::fs::canonicalize(&existing) {
        Ok(canon) => {
            let mut r = canon;
            for name in tail.iter().rev() { r.push(name); }
            r
        }
        Err(_) => lex,
    };
    resolved.to_string_lossy().to_string()
}

fn is_protected_path(path: &str) -> bool {
    let protected = PROTECTED_PATHS.get_or_init(init_protected_paths);
    let normalized = normalize_for_check(path);
    for dir in protected {
        if normalized == *dir
            || (normalized.starts_with(dir.as_str())
                && normalized.as_bytes().get(dir.len()).map_or(false, |&b| b == b'/' || b == b'\\'))
        {
            return true;
        }
    }
    false
}

pub fn check_permission_path(category: &str, path: &str) -> bool {
    if category == "fs" {
        if is_protected_path(path) {
            return false;
        }
        let normalized = normalize_for_check(path);
        return CONTEXT_PERMS.with(|p| p.borrow().check_path_canonical(category, &normalized));
    }

    if let Ok(canonical) = std::fs::canonicalize(path) {
        let canon_str = canonical.to_string_lossy();
        return CONTEXT_PERMS.with(|p| p.borrow().check_path_canonical(category, &canon_str));
    }
    CONTEXT_PERMS.with(|p| p.borrow().check_path(category, path))
}

pub fn check_ffi_permission(path: &str) -> bool {
    CONTEXT_PERMS.with(|p| {
        let perms = p.borrow();
        if !perms.check("ffi") { return false; }
        if !perms.has_path_patterns("ffi") { return false; }
        let lib_name = std::path::Path::new(path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("");
        perms.check_ffi_allowlist(lib_name) || check_permission_path("ffi", path)
    })
}

pub struct AppRoot {
    pub vfs_package: Option<String>,
    pub read_root: std::path::PathBuf,
    pub write_root: std::path::PathBuf,

    pub own_reads_exempt: bool,

    
    
    pub virtual_root: Option<String>,
}

pub fn strip_virtual_prefix(path: &str) -> String {
    if let Some(r) = app_root() {
        if let Some(vr) = &r.virtual_root {
            if let Some(rest) = path.strip_prefix(vr.as_str()) {
                return rest.trim_start_matches('/').to_string();
            }
            if let Some(scheme_end) = vr.find(":///") {
                let scheme = &vr[..scheme_end + 4]; 
                if let Some(rest) = path.strip_prefix(scheme) {
                    return rest.trim_start_matches('/').to_string();
                }
            }
        }
    }
    path.to_string()
}

pub fn display_origin(real_abs: &str) -> String {
    if let Some(r) = app_root() {
        if r.virtual_root.as_deref().map_or(false, |v| v.starts_with("store:///")) {
            let store = crate::packages::store::store_root();
            let store_abs = std::fs::canonicalize(&store).unwrap_or(store);
            let real = std::path::Path::new(real_abs);
            let real_canon = std::fs::canonicalize(real).unwrap_or_else(|_| real.to_path_buf());
            if let Ok(rel) = real_canon.strip_prefix(&store_abs) {
                return format!("store:///{}", rel.to_string_lossy().replace('\\', "/"));
            }

            
            return "store:///<external>".to_string();
        }
    }
    real_abs.to_string()
}

static APP_ROOT: OnceLock<AppRoot> = OnceLock::new();
pub fn set_app_root(r: AppRoot) { let _ = APP_ROOT.set(r); }
pub fn app_root() -> Option<&'static AppRoot> { APP_ROOT.get() }

pub enum ReadTarget { Vfs(Vec<u8>), Disk(std::path::PathBuf) }

fn norm_vfs(path: &str) -> Option<String> {
    let p = path.replace('\\', "/");
    let mut out: Vec<&str> = Vec::new();
    for seg in p.split('/') {
        match seg {
            "" | "." => {}
            ".." => { if out.pop().is_none() { return None; } }
            s => out.push(s),
        }
    }
    Some(out.join("/"))
}

pub fn resolve_read(path: &str) -> ReadTarget {

    let stripped = strip_virtual_prefix(path);
    let path: &str = &stripped;
    let p = std::path::Path::new(path);
    if p.is_absolute() { return ReadTarget::Disk(p.to_path_buf()); }
    if let Some(root) = app_root() {
        if let Some(pkg) = &root.vfs_package {
            if let Some(v) = norm_vfs(path) {
                if let Some(bytes) = crate::module_loader::vfs_registry().read_file(pkg, &v) {
                    return ReadTarget::Vfs(bytes);   
                }
            }
        }

        
        let p1 = root.read_root.join(p);
        if root.read_root != root.write_root && !p1.exists() {
            return ReadTarget::Disk(root.write_root.join(p));
        }
        return ReadTarget::Disk(p1);
    }
    ReadTarget::Disk(p.to_path_buf())
}

pub fn resolve_write(path: &str) -> String {

    let stripped = strip_virtual_prefix(path);
    let path: &str = &stripped;
    let p = std::path::Path::new(path);
    if p.is_absolute() { return path.to_string(); }
    match app_root() {
        Some(r) => r.write_root.join(p).to_string_lossy().into_owned(),
        None => path.to_string(),
    }
}

pub fn resolve_read_dir(dir: &str) -> Option<Vec<String>> {
    let dir = strip_virtual_prefix(dir);
    let dir: &str = &dir;
    let root = app_root()?;
    let pkg = root.vfs_package.as_ref()?;
    let norm = norm_vfs(dir).unwrap_or_default();
    let pfx = if norm.is_empty() { String::new() } else { format!("{}/", norm.trim_end_matches('/')) };
    let all = crate::module_loader::vfs_registry().list_paths(pkg, &pfx);
    Some(all.into_iter().map(|p| p[pfx.len()..].to_string()).collect())
}

pub enum VfsMeta { File(u64), Dir, Missing }
pub fn vfs_meta(path: &str) -> Option<VfsMeta> {
    let root = app_root()?;
    let pkg = root.vfs_package.as_ref()?;
    let v = norm_vfs(path)?;
    let reg = crate::module_loader::vfs_registry();
    if let Some(sz) = reg.file_size(pkg, &v) { return Some(VfsMeta::File(sz)); }
    if reg.has_path(pkg, &v) { return Some(VfsMeta::Dir); }
    Some(VfsMeta::Missing)
}

pub fn vfs_children(dir: &str) -> Option<Vec<(String, bool)>> {
    let listing = resolve_read_dir(dir)?; 
    let mut seen: std::collections::BTreeMap<String, bool> = std::collections::BTreeMap::new();
    for p in listing {
        if p.is_empty() { continue; }
        let mut it = p.splitn(2, '/');
        let name = it.next().unwrap_or("").to_string();
        let is_dir = it.next().is_some();
        seen.entry(name).and_modify(|d| *d = *d || is_dir).or_insert(is_dir);
    }
    Some(seen.into_iter().collect())
}

pub fn read_permit(path: &std::path::Path) -> bool {
    if let Some(r) = app_root() {
        if r.own_reads_exempt {
            let resolved = normalize_for_check(&path.to_string_lossy());
            if std::path::Path::new(&resolved).starts_with(&r.read_root) { return true; }
        }
    }
    check_permission_path("fs", &path.to_string_lossy())
}

pub fn module_read_permit(path: &std::path::Path) -> bool {
    if let Some(r) = app_root() {
        if path.starts_with(&r.read_root) { return true; }
        let store = crate::packages::store::store_root();
        let store_abs = std::fs::canonicalize(&store).unwrap_or(store);
        if path.starts_with(&store_abs) { return true; }
    }
    check_permission_path("fs", &path.to_string_lossy())
}

pub fn set_permissions(perms: crate::ffi::ffi_runtime::PermissionSet) {
    set_context_permissions(perms);
}

pub fn get_permissions() -> crate::ffi::ffi_runtime::PermissionSet {
    get_context_permissions()
}

const EXPECTED_NATIVE_HASH: &str = env!("EKKO_NATIVE_SHA256");

fn find_native_lib() -> Option<std::path::PathBuf> {
    let lib_name = if cfg!(target_os = "windows") { "EkkoNative.dll" }
        else if cfg!(target_os = "macos") { "EkkoNative.dylib" }
        else { "EkkoNative.so" };
    let path = std::env::current_exe().ok()?.parent()?.join(lib_name);
    if !path.exists() { return None; }
    if !EXPECTED_NATIVE_HASH.is_empty() {
        if let Err(e) = verify_native_integrity(&path) {
            eprintln!("\x1b[31m[security] {}\x1b[0m", e);
            return None;
        }
    }
    Some(path)
}

fn verify_native_integrity(path: &std::path::Path) -> Result<(), String> {
    use sha2::{Sha256, Digest};
    let bytes = std::fs::read(path).map_err(|e| format!("cannot read {}: {}", path.display(), e))?;
    let hash = Sha256::digest(&bytes);
    let hex: String = hash.iter().map(|b| format!("{:02x}", b)).collect();
    if hex != EXPECTED_NATIVE_HASH {
        return Err(format!(
            "EkkoNative integrity check FAILED\n  expected: {}\n  actual:   {}\n  path:     {}",
            EXPECTED_NATIVE_HASH, hex, path.display()
        ));
    }
    Ok(())
}

fn leak_api<T: 'static>(api: Arc<T>) -> Arc<T> {
    std::mem::forget(api.clone());
    api
}

pub fn load_native_fs_api() -> Option<Arc<fs_api::Api>> {
    let path = find_native_lib()?;
    let lib = unsafe { libloading::Library::new(&path) }.ok()?;
    Some(leak_api(Arc::new(fs_api::Api::load(lib).ok()?)))
}

pub fn load_native_crypto_api() -> Option<Arc<crypto_api::Api>> {
    let path = find_native_lib()?;
    let lib = unsafe { libloading::Library::new(&path) }.ok()?;
    Some(leak_api(Arc::new(crypto_api::Api::load(lib).ok()?)))
}

pub fn load_native_web_api() -> Option<Arc<web_api::Api>> {
    let path = find_native_lib()?;
    let lib = unsafe { libloading::Library::new(&path) }.ok()?;
    Some(leak_api(Arc::new(web_api::Api::load(lib).ok()?)))
}

pub fn load_native_encoding_api() -> Option<Arc<encoding_api::Api>> {
    let path = find_native_lib()?;
    let lib = unsafe { libloading::Library::new(&path) }.ok()?;
    Some(leak_api(Arc::new(encoding_api::Api::load(lib).ok()?)))
}

pub fn load_native_net_api() -> Option<Arc<net_api::Api>> {
    let path = find_native_lib()?;
    let lib = unsafe { libloading::Library::new(&path) }.ok()?;
    Some(leak_api(Arc::new(net_api::Api::load(lib).ok()?)))
}

pub fn load_native_web_server_api() -> Option<Arc<web_server_api::Api>> {
    let path = find_native_lib()?;
    let lib = unsafe { libloading::Library::new(&path) }.ok()?;
    Some(leak_api(Arc::new(web_server_api::Api::load(lib).ok()?)))
}

pub fn load_native_compress_api() -> Option<Arc<compress_api::Api>> {
    let path = find_native_lib()?;
    let lib = unsafe { libloading::Library::new(&path) }.ok()?;
    Some(leak_api(Arc::new(compress_api::Api::load(lib).ok()?)))
}

pub fn load_native_json_api() -> Option<Arc<json_api::Api>> {
    let path = find_native_lib()?;
    let lib = unsafe { libloading::Library::new(&path) }.ok()?;
    Some(leak_api(Arc::new(json_api::Api::load(lib).ok()?)))
}

pub fn load_native_regex_api() -> Option<Arc<regex_api::Api>> {
    let path = find_native_lib()?;
    let lib = unsafe { libloading::Library::new(&path) }.ok()?;
    Some(leak_api(Arc::new(regex_api::Api::load(lib).ok()?)))
}

pub fn load_native_datetime_api() -> Option<Arc<date_time_api::Api>> {
    let path = find_native_lib()?;
    let lib = unsafe { libloading::Library::new(&path) }.ok()?;
    Some(leak_api(Arc::new(date_time_api::Api::load(lib).ok()?)))
}

pub fn load_native_process_api() -> Option<Arc<process_api::Api>> {
    let path = find_native_lib()?;
    let lib = unsafe { libloading::Library::new(&path) }.ok()?;
    Some(leak_api(Arc::new(process_api::Api::load(lib).ok()?)))
}

pub fn ensure_bridge(_scope: &mut v8::HandleScope, _process_api: &process_api::Api) {
    
}

#[derive(Default)]
pub struct ProcessCallbacks {
    pub stdout: Option<v8::Global<v8::Function>>,
    pub stderr: Option<v8::Global<v8::Function>>,
    pub exit: Option<v8::Global<v8::Function>>,

    pub exited: Option<i32>,
}

pub type ProcessCbRegistry = std::rc::Rc<RefCell<std::collections::HashMap<i32, ProcessCallbacks>>>;

pub type NetServerRegistry = std::rc::Rc<RefCell<std::collections::HashMap<i32, v8::Global<v8::Function>>>>;

#[derive(Default)]
pub struct WsClientCallbacks {
    pub message: Option<v8::Global<v8::Function>>,
    pub close: Option<v8::Global<v8::Function>>,
    pub error: Option<v8::Global<v8::Function>>,
}

pub type WsClientRegistry = std::rc::Rc<RefCell<std::collections::HashMap<i32, WsClientCallbacks>>>;

pub(crate) fn dispatch_bridge_message(scope: &mut v8::HandleScope, req: &crate::ops::callback_bridge::ServerRequest) {

    

    let scope = &mut v8::HandleScope::new(scope);
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(&req.json) {
        match v.get("type").and_then(|t| t.as_str()) {
            Some(kind @ ("process_stdout" | "process_stderr")) => {
                let handle = v.get("handle").and_then(|h| h.as_i64()).unwrap_or(0) as i32;
                let bytes = v.get("data").and_then(|d| d.as_str())
                    .and_then(|s| base64::Engine::decode(&base64::engine::general_purpose::STANDARD, s).ok())
                    .unwrap_or_default();
                let cb = scope.get_slot::<ProcessCbRegistry>().cloned().and_then(|reg| {
                    reg.borrow().get(&handle).and_then(|c| {
                        if kind == "process_stdout" { c.stdout.clone() } else { c.stderr.clone() }
                    })
                });
                if let Some(cb) = cb {
                    let f = v8::Local::new(scope, &cb);
                    let text = String::from_utf8_lossy(&bytes);
                    let arg = v8::String::new(scope, &text).unwrap_or_else(|| v8::String::empty(scope)).into();
                    let undef = v8::undefined(scope).into();
                    f.call(scope, undef, &[arg]);
                    scope.perform_microtask_checkpoint();
                }
                return;
            }
            Some("process_exit") => {
                let handle = v.get("handle").and_then(|h| h.as_i64()).unwrap_or(0) as i32;
                let code = v.get("code").and_then(|c| c.as_i64()).unwrap_or(0) as i32;
                let cb = scope.get_slot::<ProcessCbRegistry>().cloned().and_then(|reg| {
                    let mut map = reg.borrow_mut();

                    
                    let entry = map.entry(handle).or_default();
                    entry.exited = Some(code);
                    let c = entry.exit.clone();
                    if c.is_some() { map.remove(&handle); }
                    c
                });
                if let Some(cb) = cb {
                    let f = v8::Local::new(scope, &cb);
                    let arg = v8::Integer::new(scope, code).into();
                    let undef = v8::undefined(scope).into();
                    f.call(scope, undef, &[arg]);
                    scope.perform_microtask_checkpoint();
                }
                
                if let Some(ctr) = scope.get_slot::<Arc<AtomicUsize>>().cloned() {
                    if ctr.load(Ordering::Relaxed) > 0 { ctr.fetch_sub(1, Ordering::Relaxed); }
                }
                return;
            }
            Some("tcp_connect") => {

                
                let server = v.get("server").and_then(|h| h.as_i64()).unwrap_or(-1) as i32;
                let cb = scope.get_slot::<NetServerRegistry>().cloned()
                    .and_then(|reg| reg.borrow().get(&server).cloned());
                if let Some(cb) = cb {
                    let handle = v.get("handle").and_then(|h| h.as_i64()).unwrap_or(0) as i32;
                    let ip = v.get("ip").and_then(|s| s.as_str()).unwrap_or("").to_string();
                    let port = v.get("port").and_then(|p| p.as_i64()).unwrap_or(0) as i32;
                    let obj = v8::Object::new(scope);
                    let hk = v8::String::new(scope, "handle").unwrap();
                    let hv = v8::Integer::new(scope, handle);
                    obj.set(scope, hk.into(), hv.into());
                    let ak = v8::String::new(scope, "address").unwrap();
                    let av = v8::String::new(scope, &ip).unwrap_or_else(|| v8::String::empty(scope));
                    obj.set(scope, ak.into(), av.into());
                    let pk = v8::String::new(scope, "port").unwrap();
                    let pv = v8::Integer::new(scope, port);
                    obj.set(scope, pk.into(), pv.into());
                    let f = v8::Local::new(scope, &cb);
                    let undef = v8::undefined(scope).into();
                    f.call(scope, undef, &[obj.into()]);
                    scope.perform_microtask_checkpoint();
                    return;
                }
                
            }
            Some(kind @ ("ws_message" | "ws_close" | "ws_error")) => {

                let handle = v.get("wsHandle").and_then(|h| h.as_i64()).unwrap_or(-1) as i32;
                if let Some(reg) = scope.get_slot::<WsClientRegistry>().cloned() {
                    
                    let cb_opt = {
                        let map = reg.borrow();
                        map.get(&handle).map(|c| match kind {
                            "ws_message" => c.message.clone(),
                            "ws_close" => c.close.clone(),
                            _ => c.error.clone(),
                        })
                    };
                    if let Some(cb) = cb_opt {            
                        if kind != "ws_message" { reg.borrow_mut().remove(&handle); }
                        if let Some(cb) = cb {
                            let f = v8::Local::new(scope, &cb);
                            let undef = v8::undefined(scope).into();
                            let arg: v8::Local<v8::Value> = match kind {
                                "ws_message" => v8::String::new(scope, v.get("data").and_then(|d| d.as_str()).unwrap_or(""))
                                    .unwrap_or_else(|| v8::String::empty(scope)).into(),
                                "ws_close" => v8::Integer::new(scope, v.get("code").and_then(|c| c.as_i64()).unwrap_or(1000) as i32).into(),
                                _ => v8::String::new(scope, v.get("error").and_then(|e| e.as_str()).unwrap_or("WebSocket error"))
                                    .unwrap_or_else(|| v8::String::empty(scope)).into(),
                            };
                            f.call(scope, undef, &[arg]);
                            scope.perform_microtask_checkpoint();
                        }
                        return; 
                    }
                }
                
            }
            _ => {}
        }
    }
    
    if let Some(handler_ref) = scope.get_slot::<ServerHandler>() {
        let handler_global = handler_ref.0.clone();
        let func = v8::Local::new(scope, &handler_global);
        let json_str = v8::String::new(scope, &req.json).unwrap_or_else(|| v8::String::empty(scope));
        let handle_val = v8::Integer::new(scope, req.response_handle as i32);
        let undef = v8::undefined(scope).into();
        func.call(scope, undef, &[json_str.into(), handle_val.into()]);
        scope.perform_microtask_checkpoint();
    }
}

pub fn init_v8() {
    V8_INIT.call_once(|| {
        v8::V8::set_flags_from_string("--max-semi-space-size=64 --stack-size=4096");
        let platform = v8::new_default_platform(0, false).make_shared();
        v8::V8::initialize_platform(platform);
        v8::V8::initialize();
    });
}

macro_rules! bind_fn {
    ($scope:expr, $obj:expr, $name:expr, $cb:expr) => {{
        let key = v8::String::new($scope, $name).unwrap();
        let func = v8::Function::new($scope, $cb).unwrap();
        $obj.set($scope, key.into(), func.into());
    }};
}

fn web_start_server(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    if !check_permission("net") {
        let m = v8::String::new(scope, "PermissionError: net access denied in this context. Run with --allow=net").unwrap();
        scope.throw_exception(m.into());
        return;
    }
    let host = args.get(0).to_rust_string_lossy(scope);
    let port = args.get(1).int32_value(scope).unwrap_or(8080);
    let cert_path = if args.length() > 2 && !args.get(2).is_undefined() { args.get(2).to_rust_string_lossy(scope) } else { String::new() };
    let key_path = if args.length() > 3 && !args.get(3).is_undefined() { args.get(3).to_rust_string_lossy(scope) } else { String::new() };
    let pfx_path = if args.length() > 4 && !args.get(4).is_undefined() { args.get(4).to_rust_string_lossy(scope) } else { String::new() };
    let pfx_password = if args.length() > 5 && !args.get(5).is_undefined() { args.get(5).to_rust_string_lossy(scope) } else { String::new() };
    let http2 = if args.length() > 6 && args.get(6).boolean_value(scope) { 1i32 } else { 0i32 };
    let compression = if args.length() > 7 && args.get(7).boolean_value(scope) { 1i32 } else { 0i32 };
    let max_body_size_mb = if args.length() > 8 { args.get(8).int32_value(scope).unwrap_or(0) } else { 0 };
    let max_ws_message_size_kb = if args.length() > 9 { args.get(9).int32_value(scope).unwrap_or(0) } else { 0 };

    let api = match scope.get_slot::<Arc<web_server_api::Api>>().cloned() {
        Some(a) => a,
        None => {
            let m = v8::String::new(scope, "web server: .NET library not loaded").unwrap();
            scope.throw_exception(m.into());
            return;
        }
    };

    let context = scope.get_slot::<i64>().copied().unwrap_or(0);

    let _ = api.webserver_registerCallback(
        callback_bridge::on_server_request as *const () as isize,
        context,
    );

    if let Some(f) = scope.get_slot::<Arc<AtomicBool>>() { f.store(true, Ordering::Relaxed); }
    match api.webserver_start(&host, port, &cert_path, &key_path, &pfx_path, &pfx_password, http2, compression, max_body_size_mb, max_ws_message_size_kb) {
        Ok(url) => rv.set(v8::String::new(scope, &url).unwrap_or_else(|| v8::String::empty(scope)).into()),
        Err(e) => {
            let m = v8::String::new(scope, &e).unwrap_or_else(|| v8::String::empty(scope));
            scope.throw_exception(m.into());
        }
    }
}

fn web_stop_server(
    scope: &mut v8::HandleScope,
    _args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    if let Some(api) = scope.get_slot::<Arc<web_server_api::Api>>().cloned() {
        let _ = api.webserver_stop();
    }
    if let Some(f) = scope.get_slot::<Arc<AtomicBool>>() { f.store(false, Ordering::Relaxed); }
}

fn read_file_bytes(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let path = args.get(0).to_rust_string_lossy(scope);
    match std::fs::read(&path) {
        Ok(data) => {
            let store = v8::ArrayBuffer::new_backing_store_from_vec(data).make_shared();
            let ab = v8::ArrayBuffer::with_backing_store(scope, &store);
            let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap();
            rv.set(ua.into());
        }
        Err(_) => rv.set(v8::undefined(scope).into()),
    }
    let _ = std::fs::remove_file(&path);
}

fn fs_perm_or_throw(scope: &mut v8::HandleScope, path: &str) -> bool {
    if check_permission_path("fs", path) { return true; }
    let m = v8::String::new(scope, &format!(
        "PermissionError: fs access denied for '{}'. Run with --allow=fs", path)).unwrap();
    scope.throw_exception(m.into());
    false
}

fn read_static_file(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let path = args.get(0).to_rust_string_lossy(scope);

    let data = match resolve_read(&path) {
        ReadTarget::Vfs(bytes) => bytes,
        ReadTarget::Disk(p) => {
            if !read_permit(&p) {
                let m = v8::String::new(scope, &format!("PermissionError: fs access denied for '{}'. Run with --allow=fs", path)).unwrap();
                scope.throw_exception(m.into());
                return;
            }
            match std::fs::read(&p) {
                Ok(d) => d,
                Err(e) => { let msg = v8::String::new(scope, &format!("ENOENT: {}", e)).unwrap(); scope.throw_exception(msg.into()); return; }
            }
        }
    };
    let store = v8::ArrayBuffer::new_backing_store_from_vec(data).make_shared();
    let ab = v8::ArrayBuffer::with_backing_store(scope, &store);
    let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap();
    rv.set(ua.into());
}

fn ssr_read_text(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let path = args.get(0).to_rust_string_lossy(scope);
    let text = match resolve_read(&path) {
        ReadTarget::Vfs(bytes) => String::from_utf8_lossy(&bytes).into_owned(),
        ReadTarget::Disk(p) => {
            if !read_permit(&p) {
                let m = v8::String::new(scope, &format!("PermissionError: fs access denied for '{}'. Run with --allow=fs", path)).unwrap();
                scope.throw_exception(m.into());
                return;
            }
            match std::fs::read_to_string(&p) {
                Ok(t) => t,
                Err(e) => { let msg = v8::String::new(scope, &format!("ENOENT: {}", e)).unwrap(); scope.throw_exception(msg.into()); return; }
            }
        }
    };
    let s = v8::String::new(scope, &text).unwrap_or_else(|| v8::String::empty(scope));
    rv.set(s.into());
}

fn scan_dir(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let path = args.get(0).to_rust_string_lossy(scope);

    if let Some(listing) = resolve_read_dir(&path) {
        let mut files: Vec<String> = listing.into_iter()
            .filter(|f| !f.split('/').any(|seg| seg.starts_with('.')))
            .collect();
        files.sort();
        let arr = v8::Array::new(scope, files.len() as i32);
        for (i, f) in files.iter().enumerate() {
            let s = v8::String::new(scope, f).unwrap();
            arr.set_index(scope, i as u32, s.into());
        }
        rv.set(arr.into());
        return;
    }

    
    let base_buf = match resolve_read(&path) {
        ReadTarget::Vfs(_) => std::path::PathBuf::from(&path), 
        ReadTarget::Disk(p) => p,
    };
    if !read_permit(&base_buf) {
        let m = v8::String::new(scope, &format!("PermissionError: fs access denied for '{}'. Run with --allow=fs", path)).unwrap();
        scope.throw_exception(m.into());
        return;
    }
    let base = base_buf.as_path();
    if !base.is_dir() {
        let arr = v8::Array::new(scope, 0);
        rv.set(arr.into());
        return;
    }
    let mut files = Vec::new();
    fn walk(dir: &std::path::Path, base: &std::path::Path, files: &mut Vec<String>) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with('.') { continue; }
                let p = entry.path();
                if p.is_dir() {
                    walk(&p, base, files);
                } else if p.is_file() {
                    if let Ok(rel) = p.strip_prefix(base) {
                        files.push(rel.to_string_lossy().replace('\\', "/"));
                    }
                }
            }
        }
    }
    walk(base, base, &mut files);
    files.sort();
    let arr = v8::Array::new(scope, files.len() as i32);
    for (i, f) in files.iter().enumerate() {
        let s = v8::String::new(scope, f).unwrap();
        arr.set_index(scope, i as u32, s.into());
    }
    rv.set(arr.into());
}

fn css_module_op(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let path = args.get(0).to_rust_string_lossy(scope);

    
    let css_content = match resolve_read(&path) {
        ReadTarget::Vfs(bytes) => String::from_utf8_lossy(&bytes).into_owned(),
        ReadTarget::Disk(p) => {

            
            let gated = app_root().map_or(false, |r| r.own_reads_exempt);
            if gated && !read_permit(&p) { let obj = v8::Object::new(scope); rv.set(obj.into()); return; }
            match std::fs::read_to_string(&p) {
                Ok(s) => s,
                Err(_) => { let obj = v8::Object::new(scope); rv.set(obj.into()); return; }
            }
        }
    };
    let css = if path.ends_with(".scss") || path.ends_with(".sass") {
        let syntax = if path.ends_with(".sass") { crate::parsers::css::SassSyntax::Sass } else { crate::parsers::css::SassSyntax::Scss };
        match crate::parsers::css::compile_sass(&css_content, syntax) {
            Ok(compiled) => compiled,
            Err(_) => css_content,
        }
    } else {
        css_content
    };
    let classes_obj = v8::Object::new(scope);
    match crate::parsers::css::extract_css_modules(&css, &path) {
        Ok(result) => {
            for (name, scoped) in &result.classes {
                let k = v8::String::new(scope, name).unwrap();
                let v = v8::String::new(scope, scoped).unwrap();
                classes_obj.set(scope, k.into(), v.into());
            }
        }
        Err(_) => {}
    }
    rv.set(classes_obj.into());
}

fn web_send_response(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    let status = args.get(1).int32_value(scope).unwrap_or(200);
    let headers = args.get(2).to_rust_string_lossy(scope);
    let body = if let Ok(ab) = v8::Local::<v8::ArrayBufferView>::try_from(args.get(3)) {
        let mut buf = vec![0u8; ab.byte_length()];
        ab.copy_contents(&mut buf);
        buf
    } else {
        args.get(3).to_rust_string_lossy(scope).into_bytes()
    };

    if let Some(api) = scope.get_slot::<Arc<web_server_api::Api>>().cloned() {
        let _ = api.webserver_sendResponse(handle, status, &headers, &body);
    }
}

pub fn net_tcp_listen(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let host = args.get(0).to_rust_string_lossy(scope);

    if !check_permission_path("net", &host) {
        let m = v8::String::new(scope, "PermissionError: net access denied in this context. Run with --allow=net").unwrap();
        scope.throw_exception(m.into());
        return;
    }
    let port = args.get(1).int32_value(scope).unwrap_or(0);

    
    let on_conn = if args.get(2).is_function() {
        v8::Local::<v8::Function>::try_from(args.get(2)).ok().map(|f| v8::Global::new(scope, f))
    } else { None };

    let api = match scope.get_slot::<Arc<net_api::Api>>().cloned() {
        Some(a) => a,
        None => { let m = v8::String::new(scope, "net: .NET library not loaded").unwrap(); scope.throw_exception(m.into()); return; }
    };

    let context = scope.get_slot::<i64>().copied().unwrap_or(0);
    if let Some(f) = scope.get_slot::<Arc<AtomicBool>>() { f.store(true, Ordering::Relaxed); }
    match api.net_tcpListen(&host, port, callback_bridge::on_server_request as *const () as isize, context) {
        Ok(handle_str) => {
            
            let handle: i32 = handle_str.trim().parse().unwrap_or(0);
            if let Some(cb) = on_conn {
                if let Some(reg) = scope.get_slot::<NetServerRegistry>().cloned() {
                    reg.borrow_mut().insert(handle, cb);
                }
            }
            rv.set(v8::Integer::new(scope, handle).into());
        }
        Err(e) => { let m = v8::String::new(scope, &e).unwrap_or_else(|| v8::String::empty(scope)); scope.throw_exception(m.into()); }
    }
}

pub fn net_tcp_server_close(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    if let Some(api) = scope.get_slot::<Arc<net_api::Api>>().cloned() {
        let _ = api.net_tcpServerClose(handle);
    }
    
    if let Some(reg) = scope.get_slot::<NetServerRegistry>().cloned() {
        reg.borrow_mut().remove(&handle);
    }
    if let Some(f) = scope.get_slot::<Arc<AtomicBool>>() { f.store(false, Ordering::Relaxed); }
}

fn web_ws_client_send(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    let data = args.get(1).to_rust_string_lossy(scope);
    if let Some(api) = scope.get_slot::<Arc<web_api::Api>>().cloned() {
        let _ = api.web_wsSend(handle, &data);
    }
}

fn web_ws_client_close(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    let code = args.get(1).int32_value(scope).unwrap_or(1000);
    let reason = args.get(2).to_rust_string_lossy(scope);
    if let Some(api) = scope.get_slot::<Arc<web_api::Api>>().cloned() {
        let _ = api.web_wsClose(handle, code, &reason);
    }
}

fn web_ws_send_server(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    let data = args.get(1).to_rust_string_lossy(scope);
    if let Some(api) = scope.get_slot::<Arc<web_server_api::Api>>().cloned() {
        let _ = api.webserver_wsSend(handle, &data);
    }
}

fn web_ws_close_server(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    let code = args.get(1).int32_value(scope).unwrap_or(1000);
    if let Some(api) = scope.get_slot::<Arc<web_server_api::Api>>().cloned() {
        let _ = api.webserver_wsClose(handle, code);
    }
}

fn web_ws_client_recv(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    let mut cbs = WsClientCallbacks::default();
    if let Ok(f) = v8::Local::<v8::Function>::try_from(args.get(1)) { cbs.message = Some(v8::Global::new(scope, f)); }
    if let Ok(f) = v8::Local::<v8::Function>::try_from(args.get(2)) { cbs.close = Some(v8::Global::new(scope, f)); }
    if let Ok(f) = v8::Local::<v8::Function>::try_from(args.get(3)) { cbs.error = Some(v8::Global::new(scope, f)); }
    if let Some(reg) = scope.get_slot::<WsClientRegistry>().cloned() {
        reg.borrow_mut().insert(handle, cbs);
    }
    
    let ctx = scope.get_slot::<i64>().copied().unwrap_or(0);
    if let Some(api) = scope.get_slot::<Arc<web_api::Api>>().cloned() {
        let _ = api.web_wsStartRecvLoop(handle, callback_bridge::on_server_request as *const () as isize, ctx);
    }
}

fn crypto_get_random_values(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    if !check_permission("crypto") {
        let m = v8::String::new(scope, "PermissionError: crypto access denied in this context. Run with --allow=crypto").unwrap();
        scope.throw_exception(m.into());
        return;
    }
    if let Ok(ab) = v8::Local::<v8::ArrayBufferView>::try_from(args.get(0)) {
        let len = ab.byte_length();
        if let Some(api) = scope.get_slot::<Arc<crypto_api::Api>>().cloned() {
            if let Ok(bytes) = api.crypto_randomBytes(len as i32) {
                let store = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared();
                let buf = v8::ArrayBuffer::with_backing_store(scope, &store);
                let _src = v8::Uint8Array::new(scope, buf, 0, len).unwrap();
                let copy_code = v8::String::new(scope, "").unwrap();
                let _ = v8::Script::compile(scope, copy_code, None);
                let backing = ab.buffer(scope).unwrap();
                let data = unsafe { std::slice::from_raw_parts_mut(
                    backing.data().unwrap().as_ptr() as *mut u8,
                    len
                )};
                if let Ok(random) = api.crypto_randomBytes(len as i32) {
                    data[..len].copy_from_slice(&random);
                }
            }
        }
        rv.set(args.get(0));
    }
}

fn ekko_exit(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let code = if args.length() > 0 && args.get(0).is_number() {
        args.get(0).int32_value(scope).unwrap_or(0)
    } else {
        0
    };
    if let Some(slot) = scope.get_slot::<Rc<Cell<Option<i32>>>>() {
        slot.set(Some(code));
        scope.terminate_execution();
    } else {
        std::process::exit(code);
    }
}

fn ekko_cwd(
    scope: &mut v8::HandleScope,
    _args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {

    let cwd = match app_root().and_then(|r| r.virtual_root.clone()) {
        Some(vr) => vr,
        None => std::env::current_dir().unwrap_or_default().to_string_lossy().to_string(),
    };
    let v = v8::String::new(scope, &cwd).unwrap_or_else(|| v8::String::empty(scope));
    rv.set(v.into());
}

fn ekko_metrics(scope: &mut v8::HandleScope, _args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let mut hs = v8::HeapStatistics::default();
    scope.get_heap_statistics(&mut hs);
    let used = hs.used_heap_size() as f64;
    let total = hs.total_heap_size() as f64;
    let limit = hs.heap_size_limit() as f64;
    let uptime = PROCESS_START.elapsed().as_millis() as f64;
    let panics = PANIC_COUNT.load(Ordering::Relaxed) as f64;

    let heap = v8::Object::new(scope);
    let k = v8::String::new(scope, "usedBytes").unwrap();  let v = v8::Number::new(scope, used);  heap.set(scope, k.into(), v.into());
    let k = v8::String::new(scope, "totalBytes").unwrap(); let v = v8::Number::new(scope, total); heap.set(scope, k.into(), v.into());
    let k = v8::String::new(scope, "limitBytes").unwrap(); let v = v8::Number::new(scope, limit); heap.set(scope, k.into(), v.into());

    let obj = v8::Object::new(scope);
    let k = v8::String::new(scope, "uptimeMs").unwrap(); let v = v8::Number::new(scope, uptime); obj.set(scope, k.into(), v.into());
    let k = v8::String::new(scope, "panics").unwrap();   let v = v8::Number::new(scope, panics); obj.set(scope, k.into(), v.into());
    let k = v8::String::new(scope, "heap").unwrap();     obj.set(scope, k.into(), heap.into());
    rv.set(obj.into());
}

pub struct ServerHandler(pub v8::Global<v8::Function>);
pub struct WebExports(pub v8::Global<v8::Value>);
pub struct SsrOps(pub v8::Global<v8::Object>);

fn register_server_handler(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    if let Ok(func) = v8::Local::<v8::Function>::try_from(args.get(0)) {
        let global_func = v8::Global::new(scope, func);
        scope.set_slot(ServerHandler(global_func));
    }
}

pub fn setup_globals(scope: &mut v8::HandleScope) {
    let global = scope.get_current_context().global(scope);

    let console_obj = v8::Object::new(scope);
    bind_fn!(scope, console_obj, "log", crate::ops::console::console_log);
    bind_fn!(scope, console_obj, "error", crate::ops::console::console_error);
    bind_fn!(scope, console_obj, "warn", crate::ops::console::console_error);
    bind_fn!(scope, console_obj, "debug", crate::ops::console::console_log);
    bind_fn!(scope, console_obj, "table", crate::ops::console::console_table);
    let key = v8::String::new(scope, "console").unwrap();
    global.set(scope, key.into(), console_obj.into());

    let perf_obj = v8::Object::new(scope);
    bind_fn!(scope, perf_obj, "now", crate::ops::performance::performance_now);
    bind_fn!(scope, perf_obj, "mark", crate::ops::performance::performance_mark);
    bind_fn!(scope, perf_obj, "measure", crate::ops::performance::performance_measure);
    bind_fn!(scope, perf_obj, "getEntriesByName", crate::ops::performance::performance_get_entries_by_name);
    bind_fn!(scope, perf_obj, "getEntriesByType", crate::ops::performance::performance_get_entries_by_type);
    let key = v8::String::new(scope, "performance").unwrap();
    global.set(scope, key.into(), perf_obj.into());

    bind_fn!(scope, global, "setTimeout", crate::ops::timers::set_timeout);
    bind_fn!(scope, global, "clearTimeout", crate::ops::timers::clear_timeout);
    bind_fn!(scope, global, "setInterval", crate::ops::timers::set_interval);
    bind_fn!(scope, global, "clearInterval", crate::ops::timers::clear_timeout);
    
    bind_fn!(scope, global, "__ekko_mock_module", crate::ops::test_mock::mock_module);
    bind_fn!(scope, global, "__ekko_unmock_module", crate::ops::test_mock::unmock_module);

    let ekko_obj = v8::Object::new(scope);

    let k = v8::String::new(scope, "version").unwrap();
    let v = v8::String::new(scope, crate::VERSION).unwrap();
    ekko_obj.set(scope, k.into(), v.into());

    let platform = match std::env::consts::OS {
        "macos" => "darwin",
        "windows" => "win32",
        other => other,
    };
    let k = v8::String::new(scope, "platform").unwrap();
    let v = v8::String::new(scope, platform).unwrap();
    ekko_obj.set(scope, k.into(), v.into());

    let arch = match std::env::consts::ARCH {
        "x86_64" => "x64",
        "aarch64" => "arm64",
        other => other,
    };
    let k = v8::String::new(scope, "arch").unwrap();
    let v = v8::String::new(scope, arch).unwrap();
    ekko_obj.set(scope, k.into(), v.into());

    let k = v8::String::new(scope, "pid").unwrap();
    let v = v8::Integer::new(scope, std::process::id() as i32);
    ekko_obj.set(scope, k.into(), v.into());

    let cli_args: Vec<String> = std::env::args().collect();
    let args_arr = v8::Array::new(scope, cli_args.len() as i32);
    for (i, arg) in cli_args.iter().enumerate() {
        let v = v8::String::new(scope, arg).unwrap();
        args_arr.set_index(scope, i as u32, v.into());
    }
    let k = v8::String::new(scope, "args").unwrap();
    ekko_obj.set(scope, k.into(), args_arr.into());

    let env_obj = v8::Object::new(scope);
    bind_fn!(scope, env_obj, "get", crate::ops::env_ops::env_get);
    bind_fn!(scope, env_obj, "set", crate::ops::env_ops::env_set);
    bind_fn!(scope, env_obj, "has", crate::ops::env_ops::env_has);
    bind_fn!(scope, env_obj, "delete", crate::ops::env_ops::env_delete);
    bind_fn!(scope, env_obj, "entries", crate::ops::env_ops::env_entries);
    let k = v8::String::new(scope, "env").unwrap();
    ekko_obj.set(scope, k.into(), env_obj.into());

    bind_fn!(scope, ekko_obj, "exit", ekko_exit);
    bind_fn!(scope, ekko_obj, "cwd", ekko_cwd);
    bind_fn!(scope, ekko_obj, "metrics", ekko_metrics);

    bind_fn!(scope, ekko_obj, "sleep", crate::ops::async_ops::ekko_sleep);
    bind_fn!(scope, ekko_obj, "spawn", crate::ops::spawn::ekko_spawn);
    bind_fn!(scope, ekko_obj, "parallel", crate::ops::spawn::ekko_parallel);
    bind_fn!(scope, ekko_obj, "select", crate::ops::channel_ops::ekko_select);

    let ch_constructor = v8::Function::new(scope, crate::ops::channel_ops::ekko_channel_new).unwrap();
    let from_id_key = v8::String::new(scope, "fromId").unwrap();
    let from_id_fn = v8::Function::new(scope, crate::ops::channel_ops::ekko_channel_from_id).unwrap();
    ch_constructor.set(scope, from_id_key.into(), from_id_fn.into());
    let ch_key = v8::String::new(scope, "Channel").unwrap();
    ekko_obj.set(scope, ch_key.into(), ch_constructor.into());

    let ek = v8::String::new(scope, "Ekko").unwrap();
    global.set(scope, ek.into(), ekko_obj.into());

    let crypto_obj = v8::Object::new(scope);
    bind_fn!(scope, crypto_obj, "randomUUID", crate::module_loader::crypto_random_uuid);
    bind_fn!(scope, crypto_obj, "getRandomValues", crypto_get_random_values);
    let key = v8::String::new(scope, "crypto").unwrap();
    global.set(scope, key.into(), crypto_obj.into());

    {
        let src = v8::String::new(scope, include_str!("../runtime/spawn_error.js")).unwrap();
        if let Some(s) = v8::Script::compile(scope, src, None) {
            if let Some(val) = s.run(scope) {
                crate::module_loader::SPAWN_ERROR_CTOR.with(|cell| {
                    *cell.borrow_mut() = Some(v8::Global::new(scope, val));
                });
            }
        }
    }

    for src_str in [
        include_str!("../runtime/jsx_runtime.js"),
        include_str!("../runtime/streams.js"),
    ] {
        let src = v8::String::new(scope, src_str).unwrap();
        if let Some(s) = v8::Script::compile(scope, src, None) {
            s.run(scope);
        }
    }

    {
        let src = v8::String::new(scope, include_str!("../runtime/channel_iter.js")).unwrap();
        if let Some(s) = v8::Script::compile(scope, src, None) {
            if let Some(val) = s.run(scope) {
                crate::module_loader::CHANNEL_ITER_FN.with(|cell| {
                    *cell.borrow_mut() = Some(v8::Global::new(scope, val));
                });
            }
        }
    }

    let fetch_ops = v8::Object::new(scope);
    bind_fn!(scope, fetch_ops, "raw", crate::module_loader::web_fetch);
    bind_fn!(scope, fetch_ops, "bodyText", crate::module_loader::web_fetch_body_text);
    bind_fn!(scope, fetch_ops, "bodyBytes", crate::module_loader::web_fetch_body_bytes);
    bind_fn!(scope, fetch_ops, "dispose", crate::module_loader::web_fetch_dispose);
    let fetch_src = v8::String::new(scope, include_str!("../runtime/fetch.js")).unwrap();
    if let Some(s) = v8::Script::compile(scope, fetch_src, None) {
        if let Some(fetch_fn) = s.run(scope) {
            if let Ok(func) = v8::Local::<v8::Function>::try_from(fetch_fn) {
                let undef = v8::undefined(scope).into();
                func.call(scope, undef, &[fetch_ops.into()]);
            }
        }
    }

    let web_ops = v8::Object::new(scope);
    bind_fn!(scope, web_ops, "registerHandler", register_server_handler);
    bind_fn!(scope, web_ops, "startServer", web_start_server);
    bind_fn!(scope, web_ops, "stopServer", web_stop_server);
    bind_fn!(scope, web_ops, "sendResponse", web_send_response);
    bind_fn!(scope, web_ops, "readStaticFile", read_static_file);
    bind_fn!(scope, web_ops, "wsSendServer", web_ws_send_server);
    bind_fn!(scope, web_ops, "wsCloseServer", web_ws_close_server);
    bind_fn!(scope, web_ops, "wsConnectClient", crate::module_loader::web_ws_connect_client);
    bind_fn!(scope, web_ops, "wsClientSend", web_ws_client_send);
    bind_fn!(scope, web_ops, "wsClientClose", web_ws_client_close);
    bind_fn!(scope, web_ops, "wsClientRecv", web_ws_client_recv);
    let web_src = v8::String::new(scope, include_str!("../modules/web.js")).unwrap();
    if let Some(s) = v8::Script::compile(scope, web_src, None) {
        if let Some(web_fn) = s.run(scope) {
            if let Ok(func) = v8::Local::<v8::Function>::try_from(web_fn) {
                let undef = v8::undefined(scope).into();
                if let Some(result) = func.call(scope, undef, &[web_ops.into()]) {
                    let web_exports = v8::Global::new(scope, result);
                    scope.set_slot(WebExports(web_exports));
                }
            }
        }
    }

    
    let ssr_ops = v8::Object::new(scope);
    bind_fn!(scope, ssr_ops, "readStaticFile", read_static_file);
    bind_fn!(scope, ssr_ops, "scanDir", scan_dir);
    bind_fn!(scope, ssr_ops, "cssModule", css_module_op);
    bind_fn!(scope, ssr_ops, "readText", ssr_read_text);
    if let Some(web_ref) = scope.get_slot::<WebExports>() {
        let exports_global = web_ref.0.clone();
        let exports_local = v8::Local::new(scope, exports_global);
        if let Ok(exports_obj) = v8::Local::<v8::Object>::try_from(exports_local) {
            let cs_key = v8::String::new(scope, "createServer").unwrap();
            if let Some(cs_fn) = exports_obj.get(scope, cs_key.into()) {
                ssr_ops.set(scope, cs_key.into(), cs_fn);
            }
        }
    }
    let ssr_ops_global = v8::Global::new(scope, ssr_ops);
    scope.set_slot(SsrOps(ssr_ops_global));
}

pub fn execute_script(code: &str) -> anyhow::Result<String> {
    init_v8();

    let isolate = &mut v8::Isolate::new(v8::CreateParams::default());
    isolate.set_slot(TimerState::new());
    isolate.set_slot(AsyncState::new());
    isolate.set_slot(Arc::new(Mutex::new(IsolatePool::new(0, 8))));
    isolate.set_slot(ChannelRegistry::new());
    isolate.set_slot(PerformanceState::new());
    isolate.set_slot(ChildTracker::new());
    if let Some(api) = load_native_fs_api() {
        isolate.set_slot(api);
    }
    if let Some(api) = load_native_crypto_api() {
        isolate.set_slot(api);
    }
    if let Some(api) = load_native_web_api() {
        isolate.set_slot(api);
    }
    if let Some(api) = load_native_encoding_api() {
        isolate.set_slot(api);
    }
    if let Some(api) = load_native_net_api() {
        isolate.set_slot(api);
    }
    if let Some(api) = load_native_web_server_api() {
        isolate.set_slot(api);
    }
    if let Some(api) = load_native_compress_api() {
        isolate.set_slot(api);
    }
    if let Some(api) = load_native_json_api() {
        isolate.set_slot(api);
    }
    if let Some(api) = load_native_regex_api() {
        isolate.set_slot(api);
    }
    if let Some(api) = load_native_datetime_api() {
        isolate.set_slot(api);
    }

    if let Some(api) = load_native_process_api() {
        isolate.set_slot(api);
    }
    {
        let (sender, receiver) = callback_bridge::create_bridge();
        let ctx = callback_bridge::register_sender(sender);
        isolate.set_slot(Rc::new(RefCell::new(Option::<BridgeReceiver>::Some(receiver))));
        isolate.set_slot(ctx);
        isolate.set_slot(Arc::new(AtomicBool::new(false)));
        isolate.set_slot::<ProcessCbRegistry>(std::rc::Rc::new(RefCell::new(std::collections::HashMap::new())));
        isolate.set_slot::<NetServerRegistry>(std::rc::Rc::new(RefCell::new(std::collections::HashMap::new())));
        isolate.set_slot::<WsClientRegistry>(std::rc::Rc::new(RefCell::new(std::collections::HashMap::new())));
        isolate.set_slot(Arc::new(AtomicUsize::new(0)));
        if let Some(api) = isolate.get_slot::<Arc<process_api::Api>>().cloned() {
            let _ = api.process_registerCallback(callback_bridge::on_server_request as *const () as isize, ctx);
        }
    }

    let handle_scope = &mut v8::HandleScope::new(isolate);
    let context = v8::Context::new(handle_scope, Default::default());
    let scope = &mut v8::ContextScope::new(handle_scope, context);

    setup_globals(scope);

    let code_str = v8::String::new(scope, code).context("failed to create V8 string")?;
    let tc = &mut v8::TryCatch::new(scope);

    let script = match v8::Script::compile(tc, code_str, None) {
        Some(s) => s,
        None => {
            let exc = tc.exception().unwrap();
            let msg = exc.to_string(tc).unwrap().to_rust_string_lossy(tc);
            anyhow::bail!("{}", msg);
        }
    };

    match script.run(tc) {
        Some(r) => Ok(r
            .to_string(tc)
            .map(|s| s.to_rust_string_lossy(tc))
            .unwrap_or_else(|| "undefined".to_string())),
        None => {
            let exc = tc.exception().unwrap();
            let msg = exc.to_string(tc).unwrap().to_rust_string_lossy(tc);
            anyhow::bail!("{}", msg);
        }
    }
}

struct WorkerNativeApis {
    fs: Option<Arc<fs_api::Api>>,
    crypto: Option<Arc<crypto_api::Api>>,
    web: Option<Arc<web_api::Api>>,
    encoding: Option<Arc<encoding_api::Api>>,
    net: Option<Arc<net_api::Api>>,
    web_server: Option<Arc<web_server_api::Api>>,
    compress: Option<Arc<compress_api::Api>>,
    json: Option<Arc<json_api::Api>>,
    regex: Option<Arc<regex_api::Api>>,
    datetime: Option<Arc<date_time_api::Api>>,
    process: Option<Arc<process_api::Api>>,
}

impl WorkerNativeApis {
    fn load() -> Self {
        Self {
            fs: load_native_fs_api(),
            crypto: load_native_crypto_api(),
            web: load_native_web_api(),
            encoding: load_native_encoding_api(),
            net: load_native_net_api(),
            web_server: load_native_web_server_api(),
            compress: load_native_compress_api(),
            json: load_native_json_api(),
            regex: load_native_regex_api(),
            datetime: load_native_datetime_api(),
            process: load_native_process_api(),
        }
    }
}

static WORKER_NATIVE_APIS: std::sync::OnceLock<WorkerNativeApis> = std::sync::OnceLock::new();

pub(crate) fn prewarm_worker_native_apis() {
    WORKER_NATIVE_APIS.get_or_init(WorkerNativeApis::load);
}

extern "C" fn init_import_meta(
    context: v8::Local<v8::Context>,
    module: v8::Local<v8::Module>,
    meta: v8::Local<v8::Object>,
) {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let url = crate::module_loader::module_display_url(module.get_identity_hash()).unwrap_or_default();
    let key = v8::String::new(scope, "url").unwrap();
    let val = v8::String::new(scope, &url).unwrap_or_else(|| v8::String::empty(scope));
    meta.set(scope, key.into(), val.into());
}

pub(crate) fn install_worker_native_apis(isolate: &mut v8::Isolate) -> i64 {
    isolate.set_host_import_module_dynamically_callback(crate::module_loader::dynamic_import_callback);
    isolate.set_host_initialize_import_meta_object_callback(init_import_meta);
    let a = WORKER_NATIVE_APIS.get_or_init(WorkerNativeApis::load);
    if let Some(x) = a.fs.clone()         { isolate.set_slot(x); }
    if let Some(x) = a.crypto.clone()     { isolate.set_slot(x); }
    if let Some(x) = a.web.clone()        { isolate.set_slot(x); }
    if let Some(x) = a.encoding.clone()   { isolate.set_slot(x); }
    if let Some(x) = a.net.clone()        { isolate.set_slot(x); }
    if let Some(x) = a.web_server.clone() { isolate.set_slot(x); }
    if let Some(x) = a.compress.clone()   { isolate.set_slot(x); }
    if let Some(x) = a.json.clone()       { isolate.set_slot(x); }
    if let Some(x) = a.regex.clone()      { isolate.set_slot(x); }
    if let Some(x) = a.datetime.clone()   { isolate.set_slot(x); }
    if let Some(x) = a.process.clone()    { isolate.set_slot(x); }
    let (sender, receiver) = callback_bridge::create_bridge();
    let ctx = callback_bridge::register_sender(sender);
    isolate.set_slot(Rc::new(RefCell::new(Option::<BridgeReceiver>::Some(receiver))));
    isolate.set_slot(ctx);
    isolate.set_slot(Arc::new(AtomicBool::new(false)));
    isolate.set_slot::<ProcessCbRegistry>(std::rc::Rc::new(RefCell::new(std::collections::HashMap::new())));
    isolate.set_slot::<NetServerRegistry>(std::rc::Rc::new(RefCell::new(std::collections::HashMap::new())));
    isolate.set_slot::<WsClientRegistry>(std::rc::Rc::new(RefCell::new(std::collections::HashMap::new())));
    isolate.set_slot(Arc::new(AtomicUsize::new(0)));
    if let Some(api) = isolate.get_slot::<Arc<process_api::Api>>().cloned() {
        let _ = api.process_registerCallback(callback_bridge::on_server_request as *const () as isize, ctx);
    }
    ctx
}

fn setup_isolate_slots(isolate: &mut v8::Isolate) {
    
    isolate.set_host_import_module_dynamically_callback(crate::module_loader::dynamic_import_callback);
    
    isolate.set_host_initialize_import_meta_object_callback(init_import_meta);
    isolate.set_slot(TimerState::new());
    isolate.set_slot(AsyncState::new());
    isolate.set_slot(Arc::new(Mutex::new(IsolatePool::new(2, 32))));
    isolate.set_slot(ChannelRegistry::new());
    isolate.set_slot(PerformanceState::new());
    isolate.set_slot(ChildTracker::new());
    if let Some(api) = load_native_fs_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_crypto_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_web_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_encoding_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_net_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_web_server_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_compress_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_json_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_regex_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_datetime_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_process_api() { isolate.set_slot(api); }
    {
        let (sender, receiver) = callback_bridge::create_bridge();
        let ctx = callback_bridge::register_sender(sender);
        isolate.set_slot(Rc::new(RefCell::new(Option::<BridgeReceiver>::Some(receiver))));
        isolate.set_slot(ctx);
        isolate.set_slot(Arc::new(AtomicBool::new(false)));
        isolate.set_slot::<ProcessCbRegistry>(std::rc::Rc::new(RefCell::new(std::collections::HashMap::new())));
        isolate.set_slot::<NetServerRegistry>(std::rc::Rc::new(RefCell::new(std::collections::HashMap::new())));
        isolate.set_slot::<WsClientRegistry>(std::rc::Rc::new(RefCell::new(std::collections::HashMap::new())));
        isolate.set_slot(Arc::new(AtomicUsize::new(0)));
        if let Some(api) = isolate.get_slot::<Arc<process_api::Api>>().cloned() {
            let _ = api.process_registerCallback(callback_bridge::on_server_request as *const () as isize, ctx);
        }
    }
}

async fn run_event_loop(
    scope: &mut v8::HandleScope<'_>,
    module: Option<v8::Local<'_, v8::Module>>,
    exit_on_sigint: bool,
) {
    let tc = &mut v8::TryCatch::new(scope);

    

    
    
    let mut ctrlc = if exit_on_sigint {
        Some(Box::pin(tokio::signal::ctrl_c()))
    } else {
        None
    };
    loop {
        tc.perform_microtask_checkpoint();

        let timer_state = tc.get_slot::<Rc<RefCell<TimerState>>>().unwrap().clone();
        {
            let now = Instant::now();
            let mut to_fire = Vec::new();
            let mut to_reschedule = Vec::new();
            {
                let mut st = timer_state.borrow_mut();
                let expired: Vec<u32> = st.timers.iter()
                    .filter(|(_, e)| e.fire_at <= now)
                    .map(|(&id, _)| id).collect();
                for id in expired {
                    let entry = st.timers.remove(&id).unwrap();
                    to_fire.push(entry.callback.clone());
                    if let Some(ms) = entry.interval_ms {
                        to_reschedule.push((id, entry.callback, ms));
                    }
                }
                for (id, cb, ms) in to_reschedule {
                    st.timers.insert(id, TimerEntry {
                        callback: cb,
                        fire_at: Instant::now() + Duration::from_millis(ms),
                        interval_ms: Some(ms),
                    });
                }
            }
            for global_cb in to_fire {
                let tc = &mut v8::HandleScope::new(tc); 
                let cb = v8::Local::new(tc, &global_cb);
                let undefined = v8::undefined(tc).into();
                cb.call(tc, undefined, &[]);
            }
        }

        let async_state = tc.get_slot::<Rc<RefCell<AsyncState>>>().unwrap().clone();
        {
            let mut completions = Vec::new();
            {
                let mut st = async_state.borrow_mut();
                while let Ok(c) = st.rx.try_recv() {
                    completions.push(c);
                }
            }
            for c in completions {
                let mut st = async_state.borrow_mut();
                if let Some(meta) = st.pending_promises.remove(&c.id) {
                    drop(st);

                    

                    let tc = &mut v8::HandleScope::new(tc);
                    let resolver = v8::Local::new(tc, &meta.resolver);
                    match c.result {
                        Ok(json_str) => {
                            let v8_str = v8::String::new(tc, &json_str).unwrap();
                            let parsed = v8::json::parse(tc, v8_str)
                                .unwrap_or_else(|| v8::undefined(tc).into());
                            resolver.resolve(tc, parsed);
                        }
                        Err(msg) => {
                            if let Some(ref parent_stack) = meta.parent_stack {
                                if let Some(ctor) = crate::module_loader::get_spawn_error_ctor(tc) {
                                    let js = format!(
                                        "(function(__SE) {{ \
                                           var info = {{}}; \
                                           try {{ info = JSON.parse({err_json}); }} catch(_) {{ info = {{message: {err_json}, stack: ''}}; }} \
                                           var cause = new Error(info.message || {err_json}); \
                                           cause.stack = info.stack || ''; \
                                           return new __SE(info.message || {err_json}, cause, 0, info.stack || '', {parent}); \
                                         }})",
                                        err_json = format!("\"{}\"", msg.replace('\\', "\\\\").replace('"', "\\\"").replace('\n', "\\n")),
                                        parent = format!("\"{}\"", parent_stack.replace('\\', "\\\\").replace('"', "\\\"").replace('\n', "\\n")),
                                    );
                                    let js_str = v8::String::new(tc, &js).unwrap();
                                    if let Some(script) = v8::Script::compile(tc, js_str, None) {
                                        if let Some(fn_val) = script.run(tc) {
                                            if let Ok(func) = v8::Local::<v8::Function>::try_from(fn_val) {
                                                let undef = v8::undefined(tc).into();
                                                if let Some(err_obj) = func.call(tc, undef, &[ctor]) {
                                                    resolver.reject(tc, err_obj);
                                                } else { let v = v8::String::new(tc, &msg).unwrap(); resolver.reject(tc, v.into()); }
                                            } else { let v = v8::String::new(tc, &msg).unwrap(); resolver.reject(tc, v.into()); }
                                        } else { let v = v8::String::new(tc, &msg).unwrap(); resolver.reject(tc, v.into()); }
                                    } else { let v = v8::String::new(tc, &msg).unwrap(); resolver.reject(tc, v.into()); }
                                } else {
                                    let v = v8::String::new(tc, &msg).unwrap();
                                    resolver.reject(tc, v.into());
                                }
                            } else {
                                let v = v8::String::new(tc, &msg).unwrap();
                                resolver.reject(tc, v.into());
                            }
                        }
                    }
                    tc.perform_microtask_checkpoint();
                }
            }
        }

        let bridge_slot = tc.get_slot::<Rc<RefCell<Option<BridgeReceiver>>>>().unwrap().clone();
        {
            let mut br = bridge_slot.borrow_mut();
            if let Some(ref mut bridge) = *br {
                while let Ok(req) = bridge.rx.try_recv() {
                    dispatch_bridge_message(tc, &req);
                }
            }
        }

        let has_timers = !timer_state.borrow().timers.is_empty();
        let has_async = async_state.borrow().has_pending();
        let has_server = tc.get_slot::<Arc<AtomicBool>>().map(|f| f.load(Ordering::Relaxed)).unwrap_or(false);
        let active_children = tc.get_slot::<Arc<AtomicUsize>>().map(|c| c.load(Ordering::Relaxed)).unwrap_or(0);
        let module_pending = module.map(|m|
            m.get_status() != v8::ModuleStatus::Evaluated && m.get_status() != v8::ModuleStatus::Errored
        ).unwrap_or(false);

        if !has_timers && !has_async && !has_server && active_children == 0 && !module_pending { break; }

        let next_timer = timer_state.borrow().timers.values()
            .map(|t| t.fire_at)
            .min();
        let notify = async_state.borrow().notify.clone();
        let bridge_notify = bridge_slot.borrow().as_ref().map(|b| b.notify.clone());

        let wait = async {
            match (next_timer, bridge_notify) {
                (Some(deadline), Some(bn)) => {
                    tokio::select! {
                        _ = tokio::time::sleep_until(deadline) => {}
                        _ = notify.notified() => {}
                        _ = bn.notified() => {}
                    }
                }
                (Some(deadline), None) => {
                    tokio::select! {
                        _ = tokio::time::sleep_until(deadline) => {}
                        _ = notify.notified() => {}
                    }
                }
                (None, Some(bn)) => {
                    if module_pending {
                        tokio::time::sleep(Duration::from_millis(1)).await;
                    } else {
                        tokio::select! {
                            _ = notify.notified() => {}
                            _ = bn.notified() => {}
                        }
                    }
                }
                (None, None) => {
                    if module_pending {
                        tokio::time::sleep(Duration::from_millis(1)).await;
                    } else {
                        notify.notified().await;
                    }
                }
            }
        };

        match ctrlc.as_mut() {
            Some(sig) => {
                tokio::select! {
                    _ = wait => {}
                    _ = sig => {
                        
                        use std::io::Write;
                        let _ = std::io::stdout().flush();
                        let _ = std::io::stderr().flush();
                        std::process::exit(130);
                    }
                }
            }
            None => wait.await,
        }
    }
}

pub async fn execute_script_async(code: &str) -> anyhow::Result<String> {
    init_v8();

    let isolate = &mut v8::Isolate::new(v8::CreateParams::default());
    setup_isolate_slots(isolate);

    let handle_scope = &mut v8::HandleScope::new(isolate);
    let context = v8::Context::new(handle_scope, Default::default());
    let scope = &mut v8::ContextScope::new(handle_scope, context);

    setup_globals(scope);

    let code_str = v8::String::new(scope, code).context("failed to create V8 string")?;

    
    let script_result = {
        let tc = &mut v8::TryCatch::new(scope);
        let script = match v8::Script::compile(tc, code_str, None) {
            Some(s) => s,
            None => {
                let exc = tc.exception().unwrap();
                let msg = exc.to_string(tc).unwrap().to_rust_string_lossy(tc);
                anyhow::bail!("{}", msg);
            }
        };
        match script.run(tc) {
            Some(r) => r
                .to_string(tc)
                .map(|s| s.to_rust_string_lossy(tc))
                .unwrap_or_else(|| "undefined".to_string()),
            None => {
                let exc = tc.exception().unwrap();
                let msg = exc.to_string(tc).unwrap().to_rust_string_lossy(tc);
                anyhow::bail!("{}", msg);
            }
        }
    };

    run_event_loop(scope, None, true).await;

    Ok(script_result)
}

const REPL_INSPECT_JS: &str = r#"(function(v){
  try {
    var t = typeof v;
    if (t === 'string') return JSON.stringify(v);
    if (t === 'function') return '[Function: ' + (v.name || 'anonymous') + ']';
    if (t === 'symbol') return v.toString();
    if (t === 'bigint') return v.toString() + 'n';
    if (t === 'undefined') return 'undefined';
    if (v === null) return 'null';
    if (t === 'object') {
      if (v instanceof Error) return (v.stack || (v.name + ': ' + v.message));
      try { var s = JSON.stringify(v, null, 2); return s === undefined ? String(v) : s; } catch(e) { return String(v); }
    }
    return String(v);
  } catch (e) { try { return String(v); } catch(_) { return '[unprintable]'; } }
})"#;

pub struct ReplSession {
    isolate: v8::OwnedIsolate,
    context: v8::Global<v8::Context>,
}

impl ReplSession {
    pub fn new() -> Self {
        init_v8();
        let mut isolate = v8::Isolate::new(v8::CreateParams::default());
        setup_isolate_slots(&mut isolate);
        let context = {
            let handle_scope = &mut v8::HandleScope::new(&mut isolate);
            let context = v8::Context::new(handle_scope, Default::default());
            let scope = &mut v8::ContextScope::new(handle_scope, context);
            setup_globals(scope);
            v8::Global::new(scope, context)
        };
        ReplSession { isolate, context }
    }

    
    
    pub fn is_incomplete(&mut self, code: &str) -> bool {
        let context = self.context.clone();
        let scope = &mut v8::HandleScope::with_context(&mut self.isolate, &context);
        let tc = &mut v8::TryCatch::new(scope);
        let src = match v8::String::new(tc, code) { Some(s) => s, None => return false };
        if v8::Script::compile(tc, src, None).is_some() { return false; }
        let msg = tc.exception()
            .and_then(|e| e.to_string(tc))
            .map(|s| s.to_rust_string_lossy(tc))
            .unwrap_or_default();
        tc.reset();
        msg.contains("Unexpected end of input")
    }

    
    
    pub async fn eval(&mut self, code: &str) -> anyhow::Result<String> {

        

        
        let candidates: Vec<String> =
            if let Some(rewritten) = crate::parsers::swc_transform::rewrite_top_level_await(code) {
                vec![rewritten]
            } else {
                let trimmed = code.trim_start();
                let expr = format!("({}\n)", code);
                let stmt = code.to_string();
                let async_expr = format!("(async()=>{{ return ({}\n) }})()", code);
                let async_stmt = format!("(async()=>{{ {}\n }})()", code);
                if trimmed.starts_with('{') {
                    vec![expr, stmt, async_expr, async_stmt]
                } else {
                    vec![stmt, expr, async_expr, async_stmt]
                }
            };

        let context = self.context.clone();
        let scope = &mut v8::HandleScope::with_context(&mut self.isolate, &context);

        
        let result_global: v8::Global<v8::Value> = {
            let tc = &mut v8::TryCatch::new(scope);
            let mut compiled: Option<v8::Local<v8::Script>> = None;
            let mut last_err = String::from("syntax error");
            for cand in &candidates {
                tc.reset();
                let src = match v8::String::new(tc, cand) {
                    Some(s) => s,
                    None => { last_err = "source too large".into(); continue; }
                };
                if let Some(s) = v8::Script::compile(tc, src, None) {
                    compiled = Some(s);
                    break;
                }
                last_err = tc.exception()
                    .and_then(|e| e.to_string(tc))
                    .map(|s| s.to_rust_string_lossy(tc))
                    .unwrap_or_else(|| "compile error".into());
            }
            tc.reset();
            let script = match compiled {
                Some(s) => s,
                None => anyhow::bail!("{}", last_err),
            };
            match script.run(tc) {
                Some(v) => v8::Global::new(tc, v),
                None => {
                    let exc = tc.exception().unwrap_or_else(|| v8::undefined(tc).into());
                    let msg = value_to_error_string(tc, exc);
                    anyhow::bail!("{}", msg);
                }
            }
        };

        
        run_event_loop(scope, None, false).await;

        let value = v8::Local::new(scope, &result_global);
        if value.is_promise() {
            let promise = v8::Local::<v8::Promise>::try_from(value).unwrap();
            match promise.state() {
                v8::PromiseState::Fulfilled => {
                    let r = promise.result(scope);
                    Ok(inspect_value(scope, r))
                }
                v8::PromiseState::Rejected => {
                    let r = promise.result(scope);
                    let msg = value_to_error_string(scope, r);
                    anyhow::bail!("{}", msg)
                }
                v8::PromiseState::Pending => Ok("Promise { <pending> }".to_string()),
            }
        } else {
            Ok(inspect_value(scope, value))
        }
    }
}

impl Default for ReplSession {
    fn default() -> Self { Self::new() }
}

fn value_to_error_string(scope: &mut v8::HandleScope, value: v8::Local<v8::Value>) -> String {
    if value.is_native_error() {
        if let Ok(obj) = v8::Local::<v8::Object>::try_from(value) {
            if let Some(key) = v8::String::new(scope, "stack") {
                if let Some(stack) = obj.get(scope, key.into()) {
                    if stack.is_string() {
                        return stack.to_rust_string_lossy(scope);
                    }
                }
            }
        }
    }
    value.to_string(scope).map(|s| s.to_rust_string_lossy(scope)).unwrap_or_else(|| "error".into())
}

fn inspect_value(scope: &mut v8::HandleScope, value: v8::Local<v8::Value>) -> String {
    if let Some(src) = v8::String::new(scope, REPL_INSPECT_JS) {
        if let Some(script) = v8::Script::compile(scope, src, None) {
            if let Some(fnval) = script.run(scope) {
                if let Ok(func) = v8::Local::<v8::Function>::try_from(fnval) {
                    let undef = v8::undefined(scope).into();
                    if let Some(r) = func.call(scope, undef, &[value]) {
                        if let Some(rs) = r.to_string(scope) {
                            return rs.to_rust_string_lossy(scope);
                        }
                    }
                }
            }
        }
    }
    value.to_string(scope).map(|s| s.to_rust_string_lossy(scope)).unwrap_or_default()
}

pub async fn execute_module_async(code: &str, filename: &str) -> anyhow::Result<()> {
    init_v8();

    let isolate = &mut v8::Isolate::new(v8::CreateParams::default());
    setup_isolate_slots(isolate);

    let handle_scope = &mut v8::HandleScope::new(isolate);
    let context = v8::Context::new(handle_scope, Default::default());
    let scope = &mut v8::ContextScope::new(handle_scope, context);

    setup_globals(scope);

    let source_str = v8::String::new(scope, code).context("failed to create V8 string")?;

    let display = display_origin(filename);
    let name_str = v8::String::new(scope, &display).unwrap();
    let origin = v8::ScriptOrigin::new(
        scope, name_str.into(), 0, 0, false, 0, None, false, false, true, None,
    );
    let mut v8_source = v8::script_compiler::Source::new(source_str, Some(&origin));

    let module = {
        let tc = &mut v8::TryCatch::new(scope);
        let module = match v8::script_compiler::compile_module(tc, &mut v8_source) {
            Some(m) => m,
            None => {
                let exc = tc.exception().unwrap();
                let msg = exc.to_string(tc).unwrap().to_rust_string_lossy(tc);
                anyhow::bail!("{}", msg);
            }
        };

        {
            let abs_entry = if filename.starts_with("ekl:///") {
                std::path::PathBuf::from(filename)
            } else {
                let entry_path = std::path::Path::new(filename);
                if entry_path.is_absolute() {
                    entry_path.to_path_buf()
                } else {
                    std::env::current_dir().unwrap_or_default().join(entry_path)
                }
            };
            crate::module_loader::register_entry_module(module.get_identity_hash(), &abs_entry);
        }

        let ok = module.instantiate_module(tc, crate::module_loader::resolve_callback);
        if ok.is_none() || ok == Some(false) {
            let exc = tc.exception().unwrap_or_else(|| v8::undefined(tc).into());
            let msg = exc.to_string(tc)
                .map(|s| s.to_rust_string_lossy(tc))
                .unwrap_or_else(|| "module instantiation failed".to_string());
            anyhow::bail!("{}", msg);
        }
        module
    };

    let _result = module.evaluate(scope);

    
    run_event_loop(scope, Some(module), true).await;

    if module.get_status() == v8::ModuleStatus::Errored {
        let exc = module.get_exception();
        let msg = exc.to_string(scope)
            .map(|s| s.to_rust_string_lossy(scope))
            .unwrap_or_else(|| "module error".to_string());
        anyhow::bail!("{}", msg);
    }

    Ok(())
}

pub async fn execute_module_with_coverage(code: &str, filename: &str) -> anyhow::Result<Vec<crate::tooling::coverage::ScriptCoverage>> {
    use crate::tooling::inspector_coverage;

    init_v8();
    let isolate = &mut v8::Isolate::new(v8::CreateParams::default());

    let responses = std::rc::Rc::new(std::cell::RefCell::new(Vec::<String>::new()));
    let mut client = inspector_coverage::CoverageClient::new();
    let mut inspector = v8::inspector::V8Inspector::create(isolate, &mut client);
    let mut channel = inspector_coverage::CoverageChannel::new(responses.clone());
    let mut session = inspector.connect(
        1,
        &mut channel,
        v8::inspector::StringView::empty(),
        v8::inspector::V8InspectorClientTrustLevel::FullyTrusted,
    );

    let msg1: Vec<u16> = r#"{"id":1,"method":"Profiler.enable"}"#.encode_utf16().collect();
    session.dispatch_protocol_message(v8::inspector::StringView::from(msg1.as_slice()));
    let msg2: Vec<u16> = r#"{"id":2,"method":"Profiler.startPreciseCoverage","params":{"callCount":true,"detailed":true}}"#.encode_utf16().collect();
    session.dispatch_protocol_message(v8::inspector::StringView::from(msg2.as_slice()));

    let exit_code: Rc<Cell<Option<i32>>> = Rc::new(Cell::new(None));
    isolate.set_slot(exit_code.clone());

    isolate.set_slot(TimerState::new());
    isolate.set_slot(AsyncState::new());
    isolate.set_slot(Arc::new(Mutex::new(IsolatePool::new(2, 32))));
    isolate.set_slot(ChannelRegistry::new());
    isolate.set_slot(PerformanceState::new());
    isolate.set_slot(ChildTracker::new());
    if let Some(api) = load_native_fs_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_crypto_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_web_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_encoding_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_net_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_web_server_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_compress_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_json_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_regex_api() { isolate.set_slot(api); }
    if let Some(api) = load_native_datetime_api() { isolate.set_slot(api); }

    if let Some(api) = load_native_process_api() { isolate.set_slot(api); }
    {
        let (sender, receiver) = callback_bridge::create_bridge();
        let ctx = callback_bridge::register_sender(sender);
        isolate.set_slot(Rc::new(RefCell::new(Option::<BridgeReceiver>::Some(receiver))));
        isolate.set_slot(ctx);
        isolate.set_slot(Arc::new(AtomicBool::new(false)));
        isolate.set_slot::<ProcessCbRegistry>(std::rc::Rc::new(RefCell::new(std::collections::HashMap::new())));
        isolate.set_slot::<NetServerRegistry>(std::rc::Rc::new(RefCell::new(std::collections::HashMap::new())));
        isolate.set_slot::<WsClientRegistry>(std::rc::Rc::new(RefCell::new(std::collections::HashMap::new())));
        isolate.set_slot(Arc::new(AtomicUsize::new(0)));
        if let Some(api) = isolate.get_slot::<Arc<process_api::Api>>().cloned() {
            let _ = api.process_registerCallback(callback_bridge::on_server_request as *const () as isize, ctx);
        }
    }

    let exec_result = {
        let handle_scope = &mut v8::HandleScope::new(isolate);
        let context = v8::Context::new(handle_scope, Default::default());

        let ctx_name = v8::inspector::StringView::from(&b"ekko"[..]);
        let ctx_origin = v8::inspector::StringView::empty();
        inspector.context_created(context, 1, ctx_name, ctx_origin);

        let scope = &mut v8::ContextScope::new(handle_scope, context);
        setup_globals(scope);

        let source_str = v8::String::new(scope, code).context("failed to create V8 string")?;
        let name_str = v8::String::new(scope, filename).unwrap();
        let origin = v8::ScriptOrigin::new(scope, name_str.into(), 0, 0, false, 0, None, false, false, true, None);
        let mut v8_source = v8::script_compiler::Source::new(source_str, Some(&origin));

        let module = {
            let tc = &mut v8::TryCatch::new(scope);
            let module = match v8::script_compiler::compile_module(tc, &mut v8_source) {
                Some(m) => m,
                None => {
                    let exc = tc.exception().unwrap();
                    let msg = exc.to_string(tc).unwrap().to_rust_string_lossy(tc);
                    anyhow::bail!("{}", msg);
                }
            };

            {
                let entry_path = std::path::Path::new(filename);
                let abs_entry = if entry_path.is_absolute() {
                    entry_path.to_path_buf()
                } else {
                    std::env::current_dir().unwrap_or_default().join(entry_path)
                };
                crate::module_loader::register_entry_module(module.get_identity_hash(), &abs_entry);
            }

            let ok = module.instantiate_module(tc, crate::module_loader::resolve_callback);
            if ok.is_none() || ok == Some(false) {
                let exc = tc.exception().unwrap_or_else(|| v8::undefined(tc).into());
                let msg = exc.to_string(tc).map(|s| s.to_rust_string_lossy(tc)).unwrap_or_else(|| "module instantiation failed".to_string());
                anyhow::bail!("{}", msg);
            }
            module
        };

        let _result = module.evaluate(scope);
        let tc = &mut v8::TryCatch::new(scope);

        loop {
            tc.perform_microtask_checkpoint();

            let timer_state = tc.get_slot::<Rc<RefCell<TimerState>>>().unwrap().clone();
            {
                let now = Instant::now();
                let mut to_fire = Vec::new();
                let mut to_reschedule = Vec::new();
                {
                    let mut st = timer_state.borrow_mut();
                    let expired: Vec<u32> = st.timers.iter().filter(|(_, e)| e.fire_at <= now).map(|(&id, _)| id).collect();
                    for id in expired {
                        let entry = st.timers.remove(&id).unwrap();
                        to_fire.push(entry.callback.clone());
                        if let Some(ms) = entry.interval_ms {
                            to_reschedule.push((id, entry.callback, ms));
                        }
                    }
                    for (id, cb, ms) in to_reschedule {
                        st.timers.insert(id, TimerEntry { callback: cb, fire_at: Instant::now() + Duration::from_millis(ms), interval_ms: Some(ms) });
                    }
                }
                for global_cb in to_fire {
                    let tc = &mut v8::HandleScope::new(tc); 
                    let cb = v8::Local::new(tc, &global_cb);
                    let undef = v8::undefined(tc).into();
                    cb.call(tc, undef, &[]);
                }
            }

            let async_state = tc.get_slot::<Rc<RefCell<AsyncState>>>().unwrap().clone();
            {
                let mut completions = Vec::new();
                { let mut st = async_state.borrow_mut(); while let Ok(c) = st.rx.try_recv() { completions.push(c); } }
                for c in completions {
                    let mut st = async_state.borrow_mut();
                    if let Some(meta) = st.pending_promises.remove(&c.id) {
                        drop(st);
                        let tc = &mut v8::HandleScope::new(tc); 
                        let resolver = v8::Local::new(tc, &meta.resolver);
                        match c.result {
                            Ok(ref msg) => {
                                let v8_str = v8::String::new(tc, msg).unwrap();
                                if let Some(parsed) = v8::json::parse(tc, v8_str.into()) { resolver.resolve(tc, parsed); }
                                else { let v = v8::String::new(tc, msg).unwrap(); resolver.resolve(tc, v.into()); }
                            }
                            Err(ref msg) => { let v = v8::String::new(tc, msg).unwrap(); resolver.reject(tc, v.into()); }
                        }
                        tc.perform_microtask_checkpoint();
                    }
                }
            }

            let bridge_slot = tc.get_slot::<Rc<RefCell<Option<BridgeReceiver>>>>().unwrap().clone();
            {
                let mut br = bridge_slot.borrow_mut();
                if let Some(ref mut bridge) = *br {
                    while let Ok(req) = bridge.rx.try_recv() {
                        dispatch_bridge_message(tc, &req);
                    }
                }
            }

            if exit_code.get().is_some() {
                break;
            }

            let has_timers = !timer_state.borrow().timers.is_empty();
            let has_async = async_state.borrow().has_pending();
            let module_evaluated = module.get_status() == v8::ModuleStatus::Evaluated || module.get_status() == v8::ModuleStatus::Errored;
            let active_children = tc.get_slot::<Arc<AtomicUsize>>().map(|c| c.load(Ordering::Relaxed)).unwrap_or(0);
            if !has_timers && !has_async && module_evaluated && active_children == 0 {
                break;
            }

            let next_timer = timer_state.borrow().timers.values().map(|t| t.fire_at).min();
            let notify = async_state.borrow().notify.clone();
            let bridge_notify = bridge_slot.borrow().as_ref().map(|b| b.notify.clone());
            let not_evaluated = !module_evaluated;
            match (next_timer, bridge_notify) {
                (Some(deadline), Some(bn)) => { tokio::select! { _ = tokio::time::sleep_until(deadline) => {} _ = notify.notified() => {} _ = bn.notified() => {} } }
                (Some(deadline), None) => { tokio::select! { _ = tokio::time::sleep_until(deadline) => {} _ = notify.notified() => {} } }
                (None, Some(bn)) => { if not_evaluated { tokio::time::sleep(Duration::from_millis(1)).await; } else { tokio::select! { _ = notify.notified() => {} _ = bn.notified() => {} } } }
                (None, None) => { if not_evaluated { tokio::time::sleep(Duration::from_millis(1)).await; } else { notify.notified().await; } }
            }
        }

        if exit_code.get().is_none() && module.get_status() == v8::ModuleStatus::Errored {
            let exc = module.get_exception();
            let msg = exc.to_string(tc).map(|s| s.to_rust_string_lossy(tc)).unwrap_or_else(|| "module error".to_string());
            anyhow::bail!("{}", msg);
        }
        
        tc.cancel_terminate_execution();
        Ok::<(), anyhow::Error>(())
    };

    responses.borrow_mut().clear();
    let msg3: Vec<u16> = r#"{"id":3,"method":"Profiler.takePreciseCoverage"}"#.encode_utf16().collect();
    session.dispatch_protocol_message(v8::inspector::StringView::from(msg3.as_slice()));

    let coverage = {
        let resps = responses.borrow();
        if let Some(json) = resps.last() {
            
            let _ = std::fs::write("/tmp/ekko-cov-raw.json", json);
            inspector_coverage::parse_coverage_response(json)
        } else {
            Vec::new()
        }
    };

    exec_result?;
    Ok(coverage)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn eval_arithmetic() {
        assert_eq!(execute_script("1 + 2").unwrap(), "3");
    }

    #[test]
    fn normalize_collapses_dotdot_for_nonexistent_targets() {

        let cwd = std::env::current_dir().unwrap();
        let scope = cwd.join("data");
        let escaped = normalize_for_check("data/../escaped.txt");
        assert!(
            !escaped.starts_with(&scope.to_string_lossy().to_string()),
            "`data/../escaped.txt` must NOT resolve under `data/` (got {escaped})"
        );
        
        let inside = normalize_for_check("data/new.txt");
        let scope_prefix = scope.to_string_lossy().to_string();
        assert!(
            inside.starts_with(&scope_prefix),
            "`data/new.txt` must resolve under `data/` (got {inside})"
        );
        
        assert_eq!(normalize_for_check("data/./new.txt"), inside);
        assert!(std::path::Path::new(&inside).is_absolute());
    }

    #[test]
    fn eval_string_ops() {
        assert_eq!(execute_script("'hello'.toUpperCase()").unwrap(), "HELLO");
    }

    #[test]
    fn eval_json() {
        assert_eq!(execute_script("JSON.stringify({a: 1})").unwrap(), r#"{"a":1}"#);
    }

    #[test]
    fn eval_syntax_error() {
        let err = execute_script("let x = @@@").unwrap_err();
        assert!(format!("{}", err).contains("SyntaxError") || format!("{}", err).contains("Invalid"));
    }

    #[test]
    fn eval_runtime_error() {
        let err = execute_script("undefinedVar.toString()").unwrap_err();
        assert!(format!("{}", err).contains("ReferenceError") || format!("{}", err).contains("not defined"));
    }

    #[test]
    fn console_log_bound() {
        assert_eq!(execute_script("console.log('test'); 'ok'").unwrap(), "ok");
    }

    #[test]
    fn ekko_namespace_exists() {
        assert_eq!(execute_script("typeof Ekko").unwrap(), "object");
    }

    #[test]
    fn ekko_spawn_exists() {
        assert_eq!(execute_script("typeof Ekko.spawn").unwrap(), "function");
    }

    #[test]
    fn ekko_parallel_exists() {
        assert_eq!(execute_script("typeof Ekko.parallel").unwrap(), "function");
    }

    #[test]
    fn v8_init_is_idempotent() {
        assert_eq!(execute_script("1").unwrap(), "1");
        assert_eq!(execute_script("2").unwrap(), "2");
    }

    #[tokio::test]
    async fn timer_fires() {
        let r = execute_script_async("setTimeout(() => {}, 10); 'ok'").await.unwrap();
        assert_eq!(r, "ok");
    }

    #[tokio::test]
    async fn clear_timeout_works() {
        let r = execute_script_async(
            "const id = setTimeout(() => { throw new Error('should not fire'); }, 50); clearTimeout(id); 'ok'",
        ).await.unwrap();
        assert_eq!(r, "ok");
    }

    #[tokio::test]
    async fn ekko_sleep_resolves() {
        execute_script_async("(async () => { await Ekko.sleep(10); })()").await.unwrap();
    }

    #[tokio::test]
    async fn ekko_sleep_concurrent() {
        execute_script_async(
            "(async () => { await Promise.all([Ekko.sleep(10), Ekko.sleep(10), Ekko.sleep(10)]); })()"
        ).await.unwrap();
    }

    #[tokio::test]
    async fn ekko_spawn_basic() {
        execute_script_async(
            "(async () => { const r = await Ekko.spawn((a, b) => a * b, [6, 7]); console.log('spawn result:', r); })()"
        ).await.unwrap();
    }

    #[tokio::test]
    async fn ekko_parallel_basic() {
        execute_script_async(
            "(async () => { const r = await Ekko.parallel([() => 1, () => 2, () => 3]); console.log('parallel result:', JSON.stringify(r)); })()"
        ).await.unwrap();
    }

    

    #[tokio::test]
    async fn spawn_worker_dynamic_import_is_wired() {
        execute_script_async(
            "(async () => { \
               const tag = await Ekko.spawn(async () => { \
                 try { await import('ekko:__does_not_exist__'); return 'resolved'; } \
                 catch (e) { return String(e).indexOf('Not supported') >= 0 ? 'notsupported' : 'rejected'; } \
               }); \
               if (tag !== 'rejected') throw new Error('worker dynamic import not wired: ' + tag); \
             })()"
        ).await.unwrap();
    }

    #[test]
    fn channel_constructor_exists() {
        assert_eq!(execute_script("typeof Ekko.Channel").unwrap(), "function");
    }

    #[test]
    fn channel_try_send_recv() {
        let r = execute_script(
            "const ch = Ekko.Channel({ capacity: 4 }); ch.trySend(42); ch.tryRecv()"
        ).unwrap();
        assert_eq!(r, "42");
    }

    #[test]
    fn channel_try_send_object() {
        let r = execute_script(
            "const ch = Ekko.Channel({ capacity: 4 }); ch.trySend({a: 1}); JSON.stringify(ch.tryRecv())"
        ).unwrap();
        assert_eq!(r, r#"{"a":1}"#);
    }

    #[test]
    fn channel_try_recv_empty() {
        let r = execute_script(
            "const ch = Ekko.Channel({ capacity: 4 }); ch.tryRecv()"
        ).unwrap();
        assert_eq!(r, "undefined");
    }

    #[test]
    fn channel_try_send_full() {
        let r = execute_script(
            "const ch = Ekko.Channel({ capacity: 1 }); const r1 = ch.trySend(1); const r2 = ch.trySend(2); '' + r1 + ',' + r2"
        ).unwrap();
        assert_eq!(r, "true,false");
    }

    #[test]
    fn channel_close() {
        let r = execute_script(
            "const ch = Ekko.Channel({ capacity: 4 }); ch.trySend('msg'); ch.close(); ch.trySend('fail')"
        ).unwrap();
        assert_eq!(r, "false");
    }

    #[test]
    fn channel_has_id() {
        let r = execute_script(
            "const ch = Ekko.Channel({ capacity: 4 }); typeof ch.id"
        ).unwrap();
        assert_eq!(r, "number");
    }

    #[test]
    fn channel_from_id() {
        let r = execute_script(
            "const ch = Ekko.Channel({ capacity: 4 }); ch.trySend(99); const ch2 = Ekko.Channel.fromId(ch.id); ch2.tryRecv()"
        ).unwrap();
        assert_eq!(r, "99");
    }

    

    #[test]
    fn ekko_version() {
        let r = execute_script("Ekko.version").unwrap();
        assert!(!r.is_empty());
        assert!(r.contains('.'));
    }

    #[test]
    fn ekko_platform() {
        let r = execute_script("Ekko.platform").unwrap();
        assert!(["win32", "darwin", "linux"].contains(&r.as_str()));
    }

    #[test]
    fn ekko_arch() {
        let r = execute_script("Ekko.arch").unwrap();
        assert!(["x64", "arm64"].contains(&r.as_str()) || !r.is_empty());
    }

    #[test]
    fn ekko_pid() {
        let r = execute_script("typeof Ekko.pid").unwrap();
        assert_eq!(r, "number");
        let pid = execute_script("Ekko.pid").unwrap();
        let pid_num: i32 = pid.parse().unwrap();
        assert!(pid_num > 0);
    }

    #[test]
    fn ekko_args() {
        let r = execute_script("Array.isArray(Ekko.args)").unwrap();
        assert_eq!(r, "true");
    }

    #[test]
    fn ekko_env_get_set() {
        set_permissions(crate::ffi::ffi_runtime::PermissionSet::allow_all());
        let r = execute_script(
            "Ekko.env.set('EKKO_TEST_VAR', 'hello123'); Ekko.env.get('EKKO_TEST_VAR')"
        ).unwrap();
        assert_eq!(r, "hello123");
        set_permissions(crate::ffi::ffi_runtime::PermissionSet::new());
    }

    #[test]
    fn ekko_env_has() {
        set_permissions(crate::ffi::ffi_runtime::PermissionSet::allow_all());
        let r = execute_script(
            "Ekko.env.set('EKKO_HAS_TEST', '1'); Ekko.env.has('EKKO_HAS_TEST')"
        ).unwrap();
        assert_eq!(r, "true");
        set_permissions(crate::ffi::ffi_runtime::PermissionSet::new());
    }

    #[test]
    fn ekko_env_delete() {
        set_permissions(crate::ffi::ffi_runtime::PermissionSet::allow_all());
        let r = execute_script(
            "Ekko.env.set('EKKO_DEL_TEST', '1'); Ekko.env.delete('EKKO_DEL_TEST'); Ekko.env.has('EKKO_DEL_TEST')"
        ).unwrap();
        assert_eq!(r, "false");
        set_permissions(crate::ffi::ffi_runtime::PermissionSet::new());
    }

    #[test]
    fn ekko_env_get_missing() {
        set_permissions(crate::ffi::ffi_runtime::PermissionSet::allow_all());
        let r = execute_script("Ekko.env.get('EKKO_NONEXISTENT_12345')").unwrap();
        assert_eq!(r, "undefined");
        set_permissions(crate::ffi::ffi_runtime::PermissionSet::new());
    }

    #[test]
    fn ekko_env_entries() {
        set_permissions(crate::ffi::ffi_runtime::PermissionSet::allow_all());
        let r = execute_script(
            "Ekko.env.set('EKKO_ENTRIES_TEST', 'val'); const e = Ekko.env.entries(); Array.isArray(e) && e.length > 0 && e[0].length === 2"
        ).unwrap();
        assert_eq!(r, "true");
        set_permissions(crate::ffi::ffi_runtime::PermissionSet::new());
    }

    #[test]
    fn ekko_cwd() {
        let r = execute_script("typeof Ekko.cwd()").unwrap();
        assert_eq!(r, "string");
        let cwd = execute_script("Ekko.cwd()").unwrap();
        assert!(!cwd.is_empty());
    }

    #[test]
    fn ekko_exit_exists() {
        let r = execute_script("typeof Ekko.exit").unwrap();
        assert_eq!(r, "function");
    }

    #[test]
    fn console_table_exists() {
        assert_eq!(execute_script("typeof console.table").unwrap(), "function");
    }

    #[test]
    fn console_table_array_of_objects() {
        execute_script("console.table([{a:1,b:2},{a:3,b:4}])").unwrap();
    }

    #[test]
    fn console_table_plain_object() {
        execute_script("console.table({key1: 'val1', key2: 'val2'})").unwrap();
    }

    #[test]
    fn console_table_array_of_primitives() {
        execute_script("console.table([10, 20, 30])").unwrap();
    }

    #[test]
    fn console_table_mixed_types() {
        execute_script("console.table([{a: 1, b: 'hello', c: true, d: null}])").unwrap();
    }

    #[test]
    fn console_table_empty_array() {
        execute_script("console.table([])").unwrap();
    }

    #[test]
    fn console_table_empty_object() {
        execute_script("console.table({})").unwrap();
    }

    #[test]
    fn performance_now_returns_number() {
        assert_eq!(execute_script("typeof performance.now()").unwrap(), "number");
    }

    #[test]
    fn performance_now_is_positive() {
        assert_eq!(execute_script("performance.now() > 0").unwrap(), "true");
    }

    #[test]
    fn performance_now_is_monotonic() {
        assert_eq!(
            execute_script("const a = performance.now(); const b = performance.now(); b >= a").unwrap(),
            "true"
        );
    }

    #[test]
    fn performance_mark_returns_entry() {
        let r = execute_script("const m = performance.mark('test'); m.entryType").unwrap();
        assert_eq!(r, "mark");
    }

    #[test]
    fn performance_mark_and_measure() {
        assert_eq!(
            execute_script(
                "performance.mark('start'); performance.mark('end'); const m = performance.measure('test', 'start', 'end'); m.duration >= 0"
            ).unwrap(),
            "true"
        );
    }

    #[test]
    fn performance_measure_entry_type() {
        assert_eq!(
            execute_script(
                "performance.mark('s'); performance.mark('e'); performance.measure('w','s','e').entryType"
            ).unwrap(),
            "measure"
        );
    }

    #[test]
    fn performance_get_entries_by_name() {
        assert_eq!(
            execute_script("performance.mark('x'); performance.getEntriesByName('x').length").unwrap(),
            "1"
        );
    }

    #[test]
    fn performance_get_entries_by_type() {
        assert_eq!(
            execute_script("performance.mark('a'); performance.mark('b'); performance.getEntriesByType('mark').length").unwrap(),
            "2"
        );
    }

    #[tokio::test]
    async fn spawn_error_is_spawn_error() {
        execute_script_async(
            "var __test_result = ''; (async () => { try { await Ekko.spawn(() => { throw new Error('boom'); }); } catch(e) { __test_result = e.name; } })()"
        ).await.unwrap();
        let r = execute_script("__test_result");
        assert!(r.is_err() || r.unwrap() == "undefined");
        
        execute_script_async(
            "(async () => { try { await Ekko.spawn(() => { throw new Error('boom'); }); } catch(e) { if (e.name !== 'SpawnError') throw new Error('expected SpawnError, got ' + e.name); } })()"
        ).await.unwrap();
    }

    #[tokio::test]
    async fn spawn_error_has_stitched_stack() {
        execute_script_async(
            "(async () => { try { await Ekko.spawn(() => { throw new Error('x'); }); } catch(e) { if (!e.stack.includes('--- spawned from ---')) throw new Error('missing stitched stack'); } })()"
        ).await.unwrap();
    }

    #[tokio::test]
    async fn spawn_error_has_cause() {
        execute_script_async(
            "(async () => { try { await Ekko.spawn(() => { throw new Error('inner'); }); } catch(e) { if (typeof e.cause !== 'object') throw new Error('expected cause object'); } })()"
        ).await.unwrap();
    }

    #[tokio::test]
    async fn spawn_timeout_terminates() {
        execute_script_async(
            "(async () => { try { await Ekko.spawn(() => { while(true){} }, { timeout: 100 }); throw new Error('should have timed out'); } catch(e) { if (!String(e).includes('timed out')) throw new Error('expected timeout error, got: ' + e); } })()"
        ).await.unwrap();
    }

    #[tokio::test]
    async fn spawn_options_with_args() {
        execute_script_async(
            "(async () => { const r = await Ekko.spawn((a,b) => a+b, { args: [10, 20] }); if (r !== 30) throw new Error('expected 30, got ' + r); })()"
        ).await.unwrap();
    }

    #[tokio::test]
    async fn spawn_no_options_backward_compat() {
        execute_script_async(
            "(async () => { const r = await Ekko.spawn((a,b) => a*b, [3, 4]); if (r !== 12) throw new Error('expected 12, got ' + r); })()"
        ).await.unwrap();
    }

    #[tokio::test]
    async fn spawn_parent_abort_cascades() {
        execute_script_async(
            "(async () => { \
               try { \
                 await Ekko.spawn(() => { while(true){} }, { timeout: 100 }); \
               } catch(e) { \
                 if (!String(e).includes('timed out')) throw e; \
               } \
             })()"
        ).await.unwrap();
    }

    #[tokio::test]
    async fn ekko_select_basic() {
        execute_script_async(
            "(async () => { \
               const ch1 = Ekko.Channel({capacity: 4}); \
               const ch2 = Ekko.Channel({capacity: 4}); \
               ch2.trySend(42); \
               const r = await Ekko.select([ch1, ch2]); \
               if (r.channel !== 1 || r.value !== 42) throw new Error('select failed: ' + JSON.stringify(r)); \
             })()"
        ).await.unwrap();
    }

    #[tokio::test]
    async fn channel_async_iterator() {
        execute_script_async(
            "(async () => { \
               const ch = Ekko.Channel({capacity: 4}); \
               ch.trySend(1); ch.trySend(2); ch.close(); \
               const items = []; \
               for await (const msg of ch) { items.push(msg); } \
               if (items.length !== 2 || items[0] !== 1) throw new Error('iter failed: ' + JSON.stringify(items)); \
             })()"
        ).await.unwrap();
    }

    #[test]
    fn ekko_select_exists() {
        assert_eq!(execute_script("typeof Ekko.select").unwrap(), "function");
    }

    #[test]
    fn thread_local_default_is_deny_all() {
        let perms = get_context_permissions();
        assert!(!perms.check("fs"));
        assert!(!perms.check("net"));
        assert!(!perms.check("env"));
        assert!(!perms.check("ffi"));
        assert!(!perms.check("process"));
        assert!(!perms.check("crypto"));
        assert!(!perms.is_full_trust());
    }

    #[test]
    fn set_permissions_overrides_default() {
        set_permissions(crate::ffi::ffi_runtime::PermissionSet::from_flags(&["fs".into(), "net".into()]));
        assert!(check_permission("fs"));
        assert!(check_permission("net"));
        assert!(!check_permission("env"));
        set_permissions(crate::ffi::ffi_runtime::PermissionSet::new());
    }
}
