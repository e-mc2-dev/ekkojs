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
use std::path::{Path, PathBuf};
use std::sync::{Arc, OnceLock};

use crate::packages::workspace::{self, Workspace, ResolvedDep, DepLocation, split_package_specifier};

use std::cell::RefCell;

static VFS_REGISTRY: OnceLock<ekko_vfs::VfsRegistry> = OnceLock::new();

pub(super) fn get_vfs_registry() -> &'static ekko_vfs::VfsRegistry {
    VFS_REGISTRY.get_or_init(ekko_vfs::VfsRegistry::new)
}

pub fn vfs_registry() -> &'static ekko_vfs::VfsRegistry {
    get_vfs_registry()
}

static IMPORT_MAP: OnceLock<HashMap<String, String>> = OnceLock::new();

fn get_import_map() -> &'static HashMap<String, String> {
    IMPORT_MAP.get_or_init(|| {
        let mut map = HashMap::new();
        let config_path = std::env::current_dir()
            .unwrap_or_default()
            .join("ekko.json");
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            if let Some(imports_pos) = content.find("\"imports\"") {
                let rest = &content[imports_pos..];
                if let Some(obj_start) = rest.find('{') {
                    let inner = &rest[obj_start + 1..];
                    if let Some(obj_end) = inner.find('}') {
                        let obj = &inner[..obj_end];
                        for pair in obj.split(',') {
                            let parts: Vec<&str> = pair.splitn(2, ':').collect();
                            if parts.len() == 2 {
                                let key = parts[0].trim().trim_matches('"').trim();
                                let val = parts[1].trim().trim_matches('"').trim();
                                if !key.is_empty() && !val.is_empty() {
                                    map.insert(key.to_string(), val.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
        map
    })
}

thread_local! {

    
    static MODULE_PATHS: RefCell<HashMap<std::num::NonZeroI32, PathBuf>> = RefCell::new(HashMap::new());

    
    
    static MODULE_CACHE: RefCell<HashMap<String, v8::Global<v8::Module>>> = RefCell::new(HashMap::new());

    static MIMIR_STORE: RefCell<Option<v8::Global<v8::Value>>> = RefCell::new(None);

    pub(crate) static SPAWN_ERROR_CTOR: RefCell<Option<v8::Global<v8::Value>>> = RefCell::new(None);

    pub(crate) static CHANNEL_ITER_FN: RefCell<Option<v8::Global<v8::Value>>> = RefCell::new(None);

    

    static MOCK_MODULES: RefCell<HashMap<String, v8::Global<v8::Object>>> = RefCell::new(HashMap::new());

    
    
    static MOCK_MODULE_EXPORTS_BY_HASH: RefCell<HashMap<std::num::NonZeroI32, v8::Global<v8::Object>>> = RefCell::new(HashMap::new());

    
    
    static CSS_MODULE_EXPORTS_BY_HASH: RefCell<HashMap<std::num::NonZeroI32, v8::Global<v8::Object>>> = RefCell::new(HashMap::new());
}

pub fn register_mock_module(scope: &mut v8::HandleScope, spec: String, obj: v8::Local<v8::Object>) -> String {
    let key = mock_registration_key(scope, &spec);
    let g = v8::Global::new(scope, obj);
    MOCK_MODULES.with(|m| { m.borrow_mut().insert(key.clone(), g); });
    key
}

pub fn unregister_mock_module(key: &str) {
    MOCK_MODULES.with(|m| { m.borrow_mut().remove(key); });
}

fn mock_registration_key(scope: &mut v8::HandleScope, spec: &str) -> String {
    if spec.starts_with("ekko:") {
        return spec.to_string();
    }
    let is_relative = spec.starts_with("./") || spec.starts_with("../");
    let is_absolute = Path::new(spec).is_absolute();
    if !is_relative && !is_absolute {
        
        return spec.to_string();
    }
    let referrer_dir = caller_dir_from_stack(scope);
    let abs_path = if is_absolute {
        normalize_path(Path::new(spec))
    } else if let Some(dir) = referrer_dir {
        normalize_path(&PathBuf::from(dir).join(spec))
    } else {
        normalize_path(&std::env::current_dir().unwrap_or_default().join(spec))
    };
    let abs_path = resolve_module_path(abs_path);
    canonical_module_key(&abs_path)
}

fn caller_dir_from_stack(scope: &mut v8::HandleScope) -> Option<String> {
    let stack = v8::StackTrace::current_stack_trace(scope, 16)?;
    for i in 0..stack.get_frame_count() {
        if let Some(frame) = stack.get_frame(scope, i as usize) {
            if let Some(name) = frame.get_script_name_or_source_url(scope) {
                let raw = name.to_rust_string_lossy(scope);
                if raw.is_empty() || raw.starts_with("ekko:") || raw.starts_with("ekl:///") {
                    continue;
                }
                return Path::new(&raw).parent().map(|p| p.to_string_lossy().to_string());
            }
        }
    }
    None
}

pub(crate) fn reset_worker_thread_caches() {
    MODULE_CACHE.with(|c| c.borrow_mut().clear());
    MODULE_PATHS.with(|c| c.borrow_mut().clear());
    MIMIR_STORE.with(|c| *c.borrow_mut() = None);
    SPAWN_ERROR_CTOR.with(|c| *c.borrow_mut() = None);
    CHANNEL_ITER_FN.with(|c| *c.borrow_mut() = None);
    MOCK_MODULES.with(|c| c.borrow_mut().clear());
    MOCK_MODULE_EXPORTS_BY_HASH.with(|c| c.borrow_mut().clear());
    CSS_MODULE_EXPORTS_BY_HASH.with(|c| c.borrow_mut().clear());
}

pub fn get_spawn_error_ctor<'a>(scope: &mut v8::HandleScope<'a>) -> Option<v8::Local<'a, v8::Value>> {
    SPAWN_ERROR_CTOR.with(|cell| {
        cell.borrow().as_ref().map(|g| v8::Local::new(scope, g))
    })
}

pub fn get_channel_iter_fn<'a>(scope: &mut v8::HandleScope<'a>) -> Option<v8::Local<'a, v8::Value>> {
    CHANNEL_ITER_FN.with(|cell| {
        cell.borrow().as_ref().map(|g| v8::Local::new(scope, g))
    })
}

fn register_module_path(identity_hash: std::num::NonZeroI32, path: &Path) {
    MODULE_PATHS.with(|m| {
        m.borrow_mut().insert(identity_hash, path.to_path_buf());
    });
}

pub fn register_entry_module(identity_hash: std::num::NonZeroI32, path: &Path) {
    register_module_path(identity_hash, path);
}

pub fn module_display_url(identity_hash: std::num::NonZeroI32) -> Option<String> {
    MODULE_PATHS.with(|m| {
        m.borrow().get(&identity_hash)
            .map(|p| crate::engine::v8_runtime::display_origin(&p.to_string_lossy()))
    })
}

fn get_module_dir(_scope: &mut v8::CallbackScope, identity_hash: std::num::NonZeroI32) -> Option<String> {
    MODULE_PATHS.with(|m| {
        m.borrow().get(&identity_hash)
            .and_then(|p| p.parent())
            .map(|p| p.to_string_lossy().to_string())
    })
}

macro_rules! fs_throw {
    ($scope:expr, $msg:expr) => {{
        let m = v8::String::new($scope, &$msg).unwrap();
        $scope.throw_exception(m.into());
    }};
}

macro_rules! set_str_or_throw {
    ($scope:expr, $rv:expr, $s:expr, $what:expr) => {{
        match v8::String::new($scope, &$s) {
            Some(v) => $rv.set(v.into()),
            None => { fs_throw!($scope, concat!($what, ": result string too large for V8 (max ~512M chars)")); }
        }
    }};
}

macro_rules! check_perm {
    ($scope:expr, $category:expr) => {
        if !crate::engine::v8_runtime::check_permission($category) {
            let m = v8::String::new($scope, &format!(
                "PermissionError: {} access denied in this context. Run with --allow={}",
                $category, $category
            )).unwrap();
            $scope.throw_exception(m.into());
            return;
        }
    };
    ($scope:expr, $category:expr, $path:expr) => {
        if !crate::engine::v8_runtime::check_permission_path($category, $path) {
            let m = v8::String::new($scope, &format!(
                "PermissionError: {} access denied for '{}'. Run with --allow={}",
                $category, $path, $category
            )).unwrap();
            $scope.throw_exception(m.into());
            return;
        }
    };
}

macro_rules! set_export_fn {
    ($scope:expr, $module:expr, $name:expr, $cb:expr) => {
        let key = v8::String::new($scope, $name).unwrap();
        let func = v8::Function::new($scope, $cb).unwrap();
        let _ = $module.set_synthetic_module_export($scope, key, func.into());
    };
}

macro_rules! obj_fn {
    ($scope:expr, $obj:expr, $name:expr, $cb:expr) => {
        let key = v8::String::new($scope, $name).unwrap();
        let func = v8::Function::new($scope, $cb).unwrap();
        $obj.set($scope, key.into(), func.into());
    };
}

pub(super) fn export_obj<'a>(scope: &mut v8::CallbackScope<'a>, module: v8::Local<'a, v8::Module>, name: &str, obj: v8::Local<v8::Object>) {
    let k = v8::String::new(scope, name).unwrap();
    let _ = module.set_synthetic_module_export(scope, k, obj.into());
}

pub(super) fn extract_bytes(scope: &mut v8::HandleScope, val: v8::Local<v8::Value>) -> Vec<u8> {
    if let Ok(ab) = v8::Local::<v8::ArrayBufferView>::try_from(val) {
        let mut buf = vec![0u8; ab.byte_length()];
        ab.copy_contents(&mut buf);
        buf
    } else {
        val.to_rust_string_lossy(scope).into_bytes()
    }
}

pub struct ModuleRegistry {
    _compiled: HashMap<String, v8::Global<v8::Module>>,
    base_dir: PathBuf,
}

impl ModuleRegistry {
    
    pub fn new(entry_file: &Path) -> Self {
        Self {
            _compiled: HashMap::new(),
            base_dir: entry_file
                .parent()
                .unwrap_or(Path::new("."))
                .to_path_buf(),
        }
    }

    pub fn set_base_dir(&mut self, dir: PathBuf) {
        self.base_dir = dir;
    }
}

mod builtin_fs;
mod builtin_path;
mod builtin_css;
mod builtin_encoding;
mod builtin_compress;
mod builtin_ekl;
mod builtin_image;
pub(crate) mod builtin_json; 
mod builtin_net;
mod builtin_web;
mod builtin_crypto;
mod builtin_process;
mod builtin_regex;
mod builtin_datetime;
mod builtin_db;
mod builtin_ffi;
mod builtin_gui;
mod builtin_tui;
mod builtin_js;

pub use builtin_crypto::crypto_random_uuid;
pub use builtin_web::{web_fetch, web_fetch_body_text, web_fetch_body_bytes, web_read_body_chunk, web_fetch_dispose, web_ws_connect_client};

pub fn resolve_callback<'a>(
    context: v8::Local<'a, v8::Context>,
    specifier: v8::Local<'a, v8::String>,
    _import_attributes: v8::Local<'a, v8::FixedArray>,
    referrer: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Module>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let spec = specifier.to_rust_string_lossy(scope);

    let referrer_dir = get_module_dir(scope, referrer.get_identity_hash());
    resolve_specifier(scope, &spec, specifier, referrer_dir)
}

pub(crate) fn resolve_specifier<'a>(
    scope: &mut v8::HandleScope<'a>,
    spec: &str,
    specifier: v8::Local<'a, v8::String>,
    referrer_dir: Option<String>,
) -> Option<v8::Local<'a, v8::Module>> {

    
    let mock_obj = MOCK_MODULES.with(|m| {
        m.borrow().get(spec).map(|g| v8::Local::new(scope, g))
    });
    if let Some(obj) = mock_obj {
        return build_mock_module(scope, specifier, obj);
    }

    if spec.starts_with("ekko:") {
        return resolve_builtin(scope, spec, specifier);
    }

    if spec.starts_with("https://") || spec.starts_with("http://") {
        let msg = v8::String::new(
            scope,
            &format!("URL imports are not allowed in EkkoJS. Use 'ekko add' to install packages locally. Got: {}", spec),
        ).unwrap();
        scope.throw_exception(msg.into());
        return None;
    }

    if spec.starts_with("./") || spec.starts_with("../") || spec.starts_with("/") {

        

        if let Some(bare) = forbidden_import_extension(spec) {
            let msg = v8::String::new(scope, &format!(
                "import specifiers must be extensionless — write \"{}\" instead of \"{}\". \
                 (EkkoJS resolves the right file in every mode; an extension breaks compiled/VFS runs.)",
                bare, spec)).unwrap();
            scope.throw_exception(msg.into());
            return None;
        }

        

        
        if is_css_asset_spec(spec) {
            if is_css_module_spec(spec) {
                return build_css_module(scope, spec, specifier, referrer_dir.as_deref());
            }
            return build_empty_module(scope, specifier);
        }

        if let Some(ref dir) = referrer_dir {
            if dir.starts_with("ekl:///") {
                return resolve_vfs_relative(scope, spec, dir, specifier);
            }

            
            
            if let Some(member_dir) = dir.strip_prefix("store:///") {
                let store = crate::packages::store::store_root();
                let store_abs = std::fs::canonicalize(&store).unwrap_or(store);
                let real_dir = store_abs.join(member_dir);
                return resolve_local(scope, spec, specifier, Some(&real_dir.to_string_lossy()), true);
            }
        }
        return resolve_local(scope, spec, specifier, referrer_dir.as_deref(), true);
    }

    if let Some(ws) = workspace::get_workspace() {
        
        if let Some((_member_root, file_path)) = resolve_workspace_member(ws, spec) {
            let path_str = file_path.to_string_lossy().to_string();
            return resolve_local(scope, &path_str, specifier, None, false);
        }

        

        

        

        
        
        let member_imports = referrer_dir.as_deref()
            .and_then(|d| ws.member_imports_owning_path(d));
        let lookup = |key: &str| -> Option<&String> {
            member_imports.and_then(|mi| mi.get(key)).or_else(|| ws.import_overrides.get(key))
        };
        let effective: String = {
            let mut cur = spec.to_string();
            let mut seen = std::collections::HashSet::new();
            seen.insert(cur.clone());
            while let Some(next) = lookup(&cur) {
                let next = next.clone();
                if !seen.insert(next.clone()) { break; } 
                cur = next;
            }
            cur
        };
        if effective != spec {
            return resolve_specifier(scope, &effective, specifier, referrer_dir);
        }

        
        if let Some((source, display, cache_key)) = resolve_from_vfs(spec) {
            return compile_vfs_module(scope, &source, &display, &cache_key, specifier);
        }

        let (pkg_name, _) = split_package_specifier(spec);
        if let Some(dep) = ws.dependencies.get(&pkg_name) {
            if let Some(file_path) = resolve_external_dep(ws, dep, spec) {
                return resolve_local(scope, &file_path.to_string_lossy(), specifier, None, false);
            }
        }

        

        let no_color = std::env::var_os("NO_COLOR").is_some();
        let (red, blue, green, rst) = if no_color { ("", "", "", "") }
            else { ("\x1b[31m", "\x1b[94m", "\x1b[32m", "\x1b[0m") };
        let msg = v8::String::new(
            scope,
            &format!(
                "{red}'{pkg_name}' is not installed in this project.{rst}\n  \
                 {blue}There is no ekko.lock, so no dependency has been installed here yet. ekko.json only lists \
                 what the project wants; `ekko add` resolves and installs it (and writes ekko.lock). A copy in the \
                 global store (what `ekko ekl ls` shows) is not used on its own.{rst}\n  \
                 {green}Fix: run  `ekko add`  to install everything ekko.json lists, or  `ekko add {pkg_name}`  for just this one.{rst}"
            ),
        ).unwrap();
        scope.throw_exception(msg.into());
        return None;
    }

    let import_map = get_import_map();
    if let Some(mapped) = import_map.get(spec) {
        return resolve_local(scope, mapped, specifier, referrer_dir.as_deref(), false);
    }

    for (key, val) in import_map.iter() {
        if key.ends_with('/') && spec.starts_with(key.as_str()) {
            let remainder = &spec[key.len()..];
            let resolved = format!("{}{}", val, remainder);
            return resolve_local(scope, &resolved, specifier, referrer_dir.as_deref(), false);
        }
    }

    if let Some((source, display, cache_key)) = resolve_from_vfs(spec) {
        return compile_vfs_module(scope, &source, &display, &cache_key, specifier);
    }

    let msg = v8::String::new(
        scope,
        &format!("module '{}' not found. Use a relative path, 'ekko:' prefix, or add to ekko.json \"imports\".", spec),
    ).unwrap();
    scope.throw_exception(msg.into());
    None
}

pub fn dynamic_import_callback<'s>(
    scope: &mut v8::HandleScope<'s>,
    _host_defined_options: v8::Local<'s, v8::Data>,
    resource_name: v8::Local<'s, v8::Value>,
    specifier: v8::Local<'s, v8::String>,
    _import_attributes: v8::Local<'s, v8::FixedArray>,
) -> Option<v8::Local<'s, v8::Promise>> {
    let resolver = v8::PromiseResolver::new(scope)?;
    let promise = resolver.get_promise(scope);
    let spec = specifier.to_rust_string_lossy(scope);

    let referrer_dir = {
        let res = resource_name.to_rust_string_lossy(scope);
        if res.is_empty() || res == "undefined" {
            None
        } else {
            std::path::Path::new(&res)
                .parent()
                .map(|p| p.to_string_lossy().to_string())
        }
    };

    
    
    let tc = &mut v8::TryCatch::new(scope);
    let module = match resolve_specifier(tc, &spec, specifier, referrer_dir) {
        Some(m) => m,
        None => {
            let e = tc.exception().unwrap_or_else(|| v8::undefined(tc).into());
            resolver.reject(tc, e);
            return Some(promise);
        }
    };
    if module.get_status() == v8::ModuleStatus::Uninstantiated
        && module.instantiate_module(tc, resolve_callback) != Some(true)
    {
        let e = tc.exception().unwrap_or_else(|| v8::undefined(tc).into());
        
        let raw = e.to_string(tc).map(|s| s.to_rust_string_lossy(tc)).unwrap_or_default();
        let hinted = missing_export_hint(&raw);
        let e = if hinted != raw {
            let s = v8::String::new(tc, &hinted).unwrap();
            v8::Exception::syntax_error(tc, s)
        } else { e };
        resolver.reject(tc, e);
        return Some(promise);
    }
    if module.get_status() == v8::ModuleStatus::Instantiated {
        let _ = module.evaluate(tc);
    }
    if module.get_status() == v8::ModuleStatus::Errored {
        let e = module.get_exception();
        resolver.reject(tc, e);
    } else {
        let ns = module.get_module_namespace();
        resolver.resolve(tc, ns);
    }
    Some(promise)
}

pub fn missing_export_hint(msg: &str) -> String {
    
    const MARK: &str = "does not provide an export named '";
    let after = match msg.split(MARK).nth(1) { Some(r) => r, None => return msg.to_string() };
    let name = match after.split('\'').next() { Some(n) if !n.is_empty() => n, _ => return msg.to_string() };
    
    let spec = msg.split('\'').nth(1).unwrap_or("");

    if let Some(module_name) = spec.strip_prefix("ekko:") {
        if let Some(names) = builtin_export_names(module_name) {
            let nl = name.to_lowercase();
            let near = names.iter().copied()
                .find(|e| { let el = e.to_lowercase(); el.contains(&nl) || nl.contains(&el) });
            let doc = builtin_doc_command(module_name);
            let mut out = format!("{msg}\n  '{spec}' exports: {}", names.join(", "));
            match near {
                Some(best) => out.push_str(&format!(
                    "\n  hint: did you mean '{best}'? Recheck '{spec}' usage with `{doc}` before guessing export names.")),
                None => out.push_str(&format!(
                    "\n  hint: '{name}' is not exported by '{spec}'. Recheck its exports and usage with `{doc}`.")),
            }
            out.push_str(&format!(
                "\n  note: if '{name}' is a TypeScript type, import it with `import type {{ {name} }} from \"{spec}\"` \
                 (EkkoJS strips types only with `import type`)."));
            return out;
        }
    }

    let where_doc = if spec == "@ekko/asgard" || spec.starts_with("@ekko/asgard/") {
        "with `ekko doc as`"
    } else { "in its documentation" };
    format!(
        "{msg}\n  hint: '{name}' is not exported by '{spec}'. Recheck the module's exports {where_doc}.\n  \
         note: if '{name}' is a TypeScript type, import it with `import type {{ {name} }} from \"{spec}\"` \
         (EkkoJS strips types only with `import type`)."
    )
}

fn builtin_doc_command(module_name: &str) -> &'static str {
    if module_name == "rune" || module_name.starts_with("rune/") { "ekko doc ru" } else { "ekko doc" }
}

pub fn builtin_export_names(module_name: &str) -> Option<&'static [&'static str]> {
    Some(match module_name {
        "fs" => &["read", "readText", "readLines", "write", "writeText", "append", "appendBytes",
            "copy", "rename", "remove", "exists", "stat", "chmod", "symlink", "readlink",
            "mkdir", "readDir", "tempDir", "tempFile", "tempSubdir", "open", "watch"],
        "fs/path" => &["join", "resolve", "dirname", "basename", "extname", "isAbsolute", "normalize", "sep"],
        "text/encoding" => &["base64", "hex", "utf8", "utf16"],
        "ssr/css" => &["compileSass", "transform", "cssModules", "minify"],
        "net" => &["tcp", "udp", "dns"],
        "web" => &["fetch", "createServer", "WebSocket", "cors", "rateLimit", "helmet",
            "safePath", "bodyLimit", "csrf", "errorHandler", "timeout", "httpsRedirect",
            "secureCookies", "requestId", "ipFilter", "validateContentType"],
        "crypto" => &["hash", "hmac", "randomBytes", "randomUUID", "hashHex", "generateKey",
            "encrypt", "decrypt", "pbkdf2", "hkdf", "rsaGenerateKeyPem", "rsaSign", "rsaVerify",
            "ecdsaGenerateKeyPem", "ecdsaSign", "ecdsaVerify"],
        "compress" => &["gzip", "brotli", "deflate"],
        "ekl" => &["list", "entries", "exists", "readText", "read"],
        "image" => &["info", "convert", "decode"],
        "text/json" => &["json"],
        "text/regex" => &["Regex"],
        "test/assert" => &["assert", "assertEqual", "assertNotEqual", "assertStrictEqual",
            "assertDeepEqual", "assertThrows", "assertRejects", "assertType", "fail"],
        "log" => &["log", "createLogger"],
        "test" => &["describe", "test", "expect", "beforeEach", "afterEach", "beforeAll", "afterAll", "mock"],
        "web/validate" => &["z"],
        "db/orm" => &["orm", "defineTable", "connect", "registerDriver", "Dialect", "SqlDialect",
            "Connection", "Transaction", "Pool", "Query", "col", "idx", "SqliteClient", "SqliteClientTransaction"],
        "jsx-runtime" => &["jsx", "jsxs", "Fragment", "registerReact", "Link"],
        "ssr" => &["renderToString", "escapeHtml", "htmlShell", "serializeProps", "registerRenderer", "getRenderer", "__raw"],
        "rune" => &["createApp", "scanRoutes", "readManifest", "resolvePageAssets", "composeLayouts", "cssModule", "createStyleCollector"],
        "web/realtime" => &["createRealtime"],
        "web/graphql" => &["createGraphQL"],
        "app/cli" => &["cli", "prompt", "render"],
        "job/cron" => &["cron"],
        "job/queue" => &["createQueue"],
        "auth" => &["createAuth", "totp"],
        "auth/rbac" => &["createRBAC", "createRbacHelpers", "matchPerm"],
        "datetime" => &["datetime", "timezone"],
        "db" => &["Database"],
        "process" => &["exec", "spawn"],
        "ffi" => &["dlopen", "types"],
        "rune/mimir" => &["atom", "selector", "mimir", "createStore", "Mimir", "useAtom", "useAtomValue", "useSetAtom"],
        "rune/router" => &["createRouter", "useRouter", "useParams", "useSearchParams", "navigate",
            "validateUrl", "matchPath", "extractParams", "Link"],
        "rune/seo" => &["createSEO"],
        "app/gui" => &["createWindow", "send", "onMessage", "setTitle", "close",
            "setAlwaysOnTop", "createTray", "setMenu"],
        "app/tui" => &["render", "onInput", "createNode", "computeLayout", "generateCells", "setScroll",
            "nextFrame", "hostConfig", "Box", "Text", "Spacer", "FocusGroup", "FocusItem", "Modal",
            "TextInput", "SelectInput", "Spinner", "ProgressBar", "Table", "SplitPane", "Terminal",
            "SyntaxText", "Markdown", "CodeView", "renderMarkdown", "mdWrap", "useState", "useEffect",
            "useRef", "useCallback", "useInput", "useGlobalKey", "useFocus", "useResize", "useDimensions",
            "useDebounce", "useTextInput", "useApp", "useStdout", "dispatchInput", "scheduleRender",
            "focusManager", "registerLanguage", "theme"],
        _ => return None,
    })
}

#[cfg(test)]
mod import_hint_tests {
    use super::{missing_export_hint, builtin_export_names};
    #[test]
    fn builtin_missing_export_lists_real_exports_and_doc() {
        
        let m = "The requested module 'ekko:rune' does not provide an export named 'App'";
        let out = missing_export_hint(m);
        assert!(out.contains("'ekko:rune' exports:"), "lists real exports: {out}");
        assert!(out.contains("createApp"), "names the real export: {out}");
        assert!(out.contains("did you mean 'createApp'"), "suggests nearest: {out}");
        assert!(out.contains("ekko doc ru"), "points at the docs: {out}");
    }
    #[test]
    fn non_builtin_missing_export_invites_doc_recheck() {
        let m = "The requested module 'react' does not provide an export named 'ReactNode'";
        let out = missing_export_hint(m);
        assert!(out.contains("Recheck the module's exports"));
        assert!(out.contains("import type"));
    }
    #[test]
    fn asgard_missing_export_cites_ekko_doc_as() {
        let m = "The requested module '@ekko/asgard' does not provide an export named 'ThemeCssVars'";
        let out = missing_export_hint(m);
        assert!(out.contains("ekko doc as"), "{out}");
    }
    #[test]
    fn passes_through_unrelated_error() {
        let m = "TypeError: foo is not a function";
        assert_eq!(missing_export_hint(m), m);
    }
    #[test]
    fn export_table_has_rune_createapp() {
        assert!(builtin_export_names("rune").unwrap().contains(&"createApp"));
        assert!(builtin_export_names("rune/mimir").unwrap().contains(&"useAtom"));
        assert!(builtin_export_names("nope").is_none());
    }
}

fn resolve_workspace_member(ws: &Workspace, specifier: &str) -> Option<(PathBuf, PathBuf)> {
    let (pkg_name, subpath) = split_package_specifier(specifier);
    let member = ws.members.get(&pkg_name)?;
    let export_path = member.resolve_export(&subpath)
        .map(|s| s.to_string())
        .or_else(|| member.resolve_export_wildcard(&subpath))?;
    let file_path = member.root_dir.join(export_path);
    Some((member.root_dir.clone(), file_path))
}

fn resolve_from_vfs(specifier: &str) -> Option<(Arc<String>, String, String)> {
    let registry = get_vfs_registry();
    let (pkg_name, _subpath) = split_package_specifier(specifier);
    if !registry.has_package(&pkg_name) {
        return None;
    }
    let (pkg, file_path) = registry.resolve(specifier)?;
    let normalized = file_path.strip_prefix("./").unwrap_or(&file_path);
    let source = registry.read_module(&pkg.metadata.name, normalized)?;
    let display = format!("{}/{}", pkg.metadata.name, normalized);
    let cache_key = canonical_pkg_key(&pkg.metadata.name, &pkg.metadata.version, normalized);
    Some((source, display, cache_key))
}

fn resolve_external_dep(_ws: &Workspace, dep: &ResolvedDep, specifier: &str) -> Option<PathBuf> {
    let (_, subpath) = split_package_specifier(specifier);
    let export_path = resolve_dep_export(&dep.exports, &subpath)?;

    match &dep.location {
        DepLocation::Store(store_path) => {
            let full_path = store_path.join(&export_path);
            if full_path.exists() { Some(full_path) } else { None }
        }
        DepLocation::Vendor(vendor_path) => {
            let full_path = vendor_path.join(&export_path);
            if full_path.exists() { Some(full_path) } else { None }
        }
        DepLocation::Vfs(_) => None, 
    }
}

fn resolve_dep_export(exports: &HashMap<String, String>, subpath: &str) -> Option<String> {
    
    if let Some(path) = exports.get(subpath) {
        return Some(path.clone());
    }
    
    if subpath == "." {
        return exports.get(".").cloned();
    }
    
    for (pattern, target) in exports {
        if pattern.contains('*') {
            let prefix = pattern.split('*').next().unwrap_or("");
            if subpath.starts_with(prefix) {
                let remainder = &subpath[prefix.len()..];
                return Some(target.replace('*', remainder));
            }
        }
    }
    None
}

fn normalize_vfs_path(path: &str) -> String {
    let mut parts: Vec<&str> = Vec::new();
    for segment in path.split('/') {
        match segment {
            "." | "" => {}
            ".." => { parts.pop(); }
            s => parts.push(s),
        }
    }
    parts.join("/")
}

fn normalize_internal_path(internal: &str) -> String {
    let s = internal.replace('\\', "/");
    let s = s.strip_prefix("./").unwrap_or(&s);
    for (from, to) in [(".tsx", ".js"), (".ts", ".js"), (".jsx", ".js"), (".mjs", ".js")] {
        if let Some(stem) = s.strip_suffix(from) {
            return format!("{}{}", stem, to);
        }
    }
    s.to_string()
}

fn canonical_pkg_key(name: &str, version: &str, internal: &str) -> String {
    format!("pkg:{}@{}/{}", name, version, normalize_internal_path(internal))
}

fn canonical_real_path(abs_path: &Path) -> String {
    let real = std::fs::canonicalize(abs_path).unwrap_or_else(|_| abs_path.to_path_buf());
    let mut s = real.to_string_lossy().to_string();
    if let Some(stripped) = s.strip_prefix(r"\\?\") {
        s = stripped.to_string();
    }
    s = s.replace('\\', "/");
    if cfg!(windows) {
        s = s.to_lowercase();
    }
    s
}

fn canonical_module_key(abs_path: &Path) -> String {
    
    if let Some(ws) = workspace::get_workspace() {
        for member in ws.members.values() {
            if let Ok(rel) = abs_path.strip_prefix(&member.root_dir) {
                return canonical_pkg_key(&member.name, &member.version, &rel.to_string_lossy());
            }
        }
    }
    
    let store = crate::packages::store::store_root();
    if let Ok(rel) = abs_path.strip_prefix(&store) {
        let rel_s = rel.to_string_lossy().replace('\\', "/");
        let segs: Vec<&str> = rel_s.split('/').filter(|s| !s.is_empty()).collect();
        let (name, ver_idx) = if segs.first().is_some_and(|s| s.starts_with('@')) && segs.len() >= 2 {
            (format!("{}/{}", segs[0], segs[1]), 2)
        } else if !segs.is_empty() {
            (segs[0].to_string(), 1)
        } else {
            return format!("file:{}", canonical_real_path(abs_path));
        };
        if segs.len() > ver_idx {
            return canonical_pkg_key(&name, segs[ver_idx], &segs[ver_idx + 1..].join("/"));
        }
    }
    
    format!("file:{}", canonical_real_path(abs_path))
}

fn resolve_vfs_relative<'a>(
    scope: &mut v8::HandleScope<'a>,
    spec: &str,
    referrer_vfs_dir: &str,
    specifier: v8::Local<'a, v8::String>,
) -> Option<v8::Local<'a, v8::Module>> {
    let vfs_prefix = "ekl:///";
    let inner_path = &referrer_vfs_dir[vfs_prefix.len()..];

    let pkg_end = if inner_path.starts_with('@') {
        inner_path.find('/').and_then(|i| inner_path[i+1..].find('/').map(|j| i + 1 + j))
    } else {
        inner_path.find('/')
    };

    let (pkg_name, rel_dir) = match pkg_end {
        Some(idx) => (&inner_path[..idx], &inner_path[idx + 1..]),
        None => (inner_path, ""),
    };

    
    let resolved = if rel_dir.is_empty() {
        spec.trim_start_matches("./").to_string()
    } else {
        let joined = Path::new(rel_dir).join(spec);
        normalize_vfs_path(&joined.to_string_lossy().replace('\\', "/"))
    };

    let registry = get_vfs_registry();
    let resolved_js = resolved
        .replace(".tsx", ".js")
        .replace(".jsx", ".js")
        .replace(".ts", ".js");

    let version = registry.get_package(pkg_name).map(|p| p.metadata.version.clone()).unwrap_or_default();

    
    let candidates: Vec<String> = vec![
        resolved.clone(),
        resolved_js.clone(),
        format!("{}.js", resolved),
        format!("{}.mjs", resolved),

        
        format!("{}/index.js", resolved),
        format!("{}/index.mjs", resolved),
        format!("{}/index.ts", resolved),
        format!("{}/index.tsx", resolved),
        format!("{}/index.jsx", resolved),
        format!("{}/index.json", resolved),
    ];
    for path in &candidates {
        if let Some(source) = registry.read_module(pkg_name, path) {
            let display = format!("{}/{}", pkg_name, path);
            let cache_key = canonical_pkg_key(pkg_name, &version, path);
            return compile_vfs_module(scope, &source, &display, &cache_key, specifier);
        }
    }
    let msg = v8::String::new(scope, &format!("VFS module '{}' not found in package '{}'", spec, pkg_name)).unwrap();
    scope.throw_exception(msg.into());
    None
}

fn compile_vfs_module<'a>(
    scope: &mut v8::HandleScope<'a>,
    source: &str,
    display_name: &str,
    cache_key: &str,
    _specifier: v8::Local<'a, v8::String>,
) -> Option<v8::Local<'a, v8::Module>> {

    

    

    if let Some(m) = MODULE_CACHE.with(|c| c.borrow().get(cache_key).map(|g| v8::Local::new(scope, g))) {
        return Some(m);
    }
    let vfs_path = format!("ekl:///{}", display_name);
    let source_str = v8::String::new(scope, source).unwrap();
    let name_str = v8::String::new(scope, &vfs_path).unwrap();
    let origin = v8::ScriptOrigin::new(
        scope, name_str.into(), 0, 0, false, 0, None, false, false, true, None,
    );
    let mut v8_source = v8::script_compiler::Source::new(source_str, Some(&origin));

    
    let compile_err: Option<String> = {
        let tc = &mut v8::TryCatch::new(scope);
        match v8::script_compiler::compile_module(tc, &mut v8_source) {
            Some(m) => {
                MODULE_PATHS.with(|paths| {
                    paths.borrow_mut().insert(m.get_identity_hash(), PathBuf::from(&vfs_path));
                });
                MODULE_CACHE.with(|c| {
                    c.borrow_mut().insert(cache_key.to_string(), v8::Global::new(tc, m));
                });
                None
            }
            None => {
                
                let detail = tc.exception()
                    .and_then(|e| e.to_string(tc))
                    .map(|s| s.to_rust_string_lossy(tc))
                    .filter(|s| !s.is_empty());
                Some(match detail {
                    Some(d) => format!("compile error in VFS module '{}': {}", display_name, d),
                    None => format!("compile error in VFS module '{}'", display_name),
                })
            }
        }
    };
    match compile_err {
        None => MODULE_CACHE.with(|c| c.borrow().get(cache_key).map(|g| v8::Local::new(scope, g))),
        Some(full) => {
            let msg = v8::String::new(scope, &full).unwrap();
            scope.throw_exception(msg.into());
            None
        }
    }
}

fn is_css_asset_spec(spec: &str) -> bool {
    let core = spec.split(['?', '#']).next().unwrap_or(spec).to_ascii_lowercase();
    core.ends_with(".css") || core.ends_with(".scss") || core.ends_with(".sass")
}

fn is_css_module_spec(spec: &str) -> bool {
    spec.split(['?', '#']).next().unwrap_or(spec).to_ascii_lowercase().contains(".module.")
}

fn build_empty_module<'a>(
    scope: &mut v8::HandleScope<'a>,
    specifier: v8::Local<'a, v8::String>,
) -> Option<v8::Local<'a, v8::Module>> {
    Some(v8::Module::create_synthetic_module(scope, specifier, &[], empty_module_eval))
}

fn empty_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    _module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    Some(v8::undefined(scope).into())
}

fn css_module_logical_name(abs_path: &Path) -> String {
    let file_name = abs_path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    if let Some(ws) = workspace::get_workspace() {
        let root = std::fs::canonicalize(&ws.root).unwrap_or_else(|_| ws.root.clone());
        let canon = std::fs::canonicalize(abs_path).unwrap_or_else(|_| abs_path.to_path_buf());
        if let Ok(rel) = canon.strip_prefix(&root) {
            return rel.to_string_lossy().replace('\\', "/");
        }
    }
    file_name
}

fn build_css_module<'a>(
    scope: &mut v8::HandleScope<'a>,
    spec: &str,
    specifier: v8::Local<'a, v8::String>,
    referrer_dir: Option<&str>,
) -> Option<v8::Local<'a, v8::Module>> {

    if referrer_dir.is_some_and(|d| d.starts_with("ekl:///")) {
        let msg = v8::String::new(scope, &format!(
            "CSS Modules inside a packed .ekl are not yet supported (task 313): '{}'", spec)).unwrap();
        scope.throw_exception(msg.into());
        return None;
    }

    let abs_path: PathBuf = {
        let base: Option<PathBuf> = match referrer_dir {
            Some(d) if d.starts_with("store:///") => {
                let store = crate::packages::store::store_root();
                let store_abs = std::fs::canonicalize(&store).unwrap_or(store);
                Some(store_abs.join(&d["store:///".len()..]))
            }
            Some(d) => Some(PathBuf::from(d)),
            None => std::env::current_dir().ok(),
        };
        let p = PathBuf::from(spec);
        if p.is_absolute() { normalize_path(&p) }
        else if let Some(b) = base { normalize_path(&b.join(spec)) }
        else { normalize_path(&p) }
    };

    
    
    if let Some(r) = crate::engine::v8_runtime::app_root() {
        if r.own_reads_exempt {
            let canon = std::fs::canonicalize(&abs_path).unwrap_or_else(|_| abs_path.clone());
            if !crate::engine::v8_runtime::module_read_permit(&canon) {
                let msg = v8::String::new(scope, &format!(
                    "cannot load CSS module '{}': it resolves outside the app root. Packaged code may only \
                     import its own files; run with --allow=fs to read host files.", spec)).unwrap();
                scope.throw_exception(msg.into());
                return None;
            }
        }
    }

    let cache_key = canonical_module_key(&abs_path);
    if let Some(m) = MODULE_CACHE.with(|c| c.borrow().get(&cache_key).map(|g| v8::Local::new(scope, g))) {
        return Some(m);
    }

    let src = match std::fs::read_to_string(&abs_path) {
        Ok(s) => s,
        Err(e) => {
            let msg = v8::String::new(scope, &format!("cannot load CSS module '{}': {}", spec, e)).unwrap();
            scope.throw_exception(msg.into());
            return None;
        }
    };

    let logical = css_module_logical_name(&abs_path);
    let syntax = if abs_path.extension().and_then(|e| e.to_str()) == Some("sass") {
        crate::parsers::css::SassSyntax::Sass
    } else {
        crate::parsers::css::SassSyntax::Scss
    };
    let classes = match crate::parsers::css::convert_css_module(&src, &logical, syntax) {
        Ok(r) => r.classes,
        Err(e) => {
            let msg = v8::String::new(scope, &format!("CSS module '{}': {}", spec, e)).unwrap();
            scope.throw_exception(msg.into());
            return None;
        }
    };

    

    let map_obj = v8::Object::new(scope);
    for (k, v) in &classes {
        let key = v8::String::new(scope, k)?;
        let val = v8::String::new(scope, v)?;
        map_obj.create_data_property(scope, key.into(), val.into());
    }
    let default_key = v8::String::new(scope, "default")?;
    let exports_obj = v8::Object::new(scope);
    exports_obj.create_data_property(scope, default_key.into(), map_obj.into());

    let export_names = [default_key];
    let module = v8::Module::create_synthetic_module(scope, specifier, &export_names, css_module_eval);
    let hash = module.get_identity_hash();
    CSS_MODULE_EXPORTS_BY_HASH.with(|m| { m.borrow_mut().insert(hash, v8::Global::new(scope, exports_obj)); });
    MODULE_CACHE.with(|c| { c.borrow_mut().insert(cache_key, v8::Global::new(scope, module)); });
    Some(module)
}

fn css_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let hash = module.get_identity_hash();
    let obj = CSS_MODULE_EXPORTS_BY_HASH.with(|m| {
        m.borrow().get(&hash).map(|g| v8::Local::new(scope, g))
    });
    if let Some(obj) = obj {
        let default_key = v8::String::new(scope, "default")?;
        if let Some(v) = obj.get(scope, default_key.into()) {
            let _ = module.set_synthetic_module_export(scope, default_key, v);
        }
    }
    Some(v8::undefined(scope).into())
}

fn build_mock_module<'a>(
    scope: &mut v8::HandleScope<'a>,
    specifier: v8::Local<'a, v8::String>,
    exports_obj: v8::Local<'a, v8::Object>,
) -> Option<v8::Local<'a, v8::Module>> {
    let names = exports_obj
        .get_own_property_names(scope, v8::GetPropertyNamesArgs::default())?;
    let mut export_names: Vec<v8::Local<v8::String>> = Vec::new();
    for i in 0..names.length() {
        let key = names.get_index(scope, i).unwrap();
        if let Ok(s) = v8::Local::<v8::String>::try_from(key) {
            export_names.push(s);
        }
    }
    let module = v8::Module::create_synthetic_module(scope, specifier, &export_names, mock_module_eval);
    let hash = module.get_identity_hash();
    let g = v8::Global::new(scope, exports_obj);
    MOCK_MODULE_EXPORTS_BY_HASH.with(|m| { m.borrow_mut().insert(hash, g); });
    Some(module)
}

fn mock_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let hash = module.get_identity_hash();
    let obj = MOCK_MODULE_EXPORTS_BY_HASH.with(|m| {
        m.borrow().get(&hash).map(|g| v8::Local::new(scope, g))
    });
    if let Some(obj) = obj {
        let names = obj
            .get_own_property_names(scope, v8::GetPropertyNamesArgs::default())
            .unwrap();
        for i in 0..names.length() {
            let key = names.get_index(scope, i).unwrap();
            if let Ok(k) = v8::Local::<v8::String>::try_from(key) {
                let v = obj.get(scope, k.into()).unwrap();
                let _ = module.set_synthetic_module_export(scope, k, v);
            }
        }
    }
    Some(v8::undefined(scope).into())
}

fn resolve_builtin<'a>(
    scope: &mut v8::HandleScope<'a>,
    spec: &str,
    specifier: v8::Local<'a, v8::String>,
) -> Option<v8::Local<'a, v8::Module>> {
    
    let cached = MODULE_CACHE.with(|cache| {
        cache.borrow().get(spec).map(|g| v8::Local::new(scope, g))
    });
    if let Some(module) = cached {
        return Some(module);
    }

    let module_name = &spec[5..];

    
    macro_rules! synth {
        ($eval:expr) => {{
            let names = builtin_export_names(module_name).unwrap_or(&[]);
            let exports: Vec<v8::Local<v8::String>> = names.iter()
                .map(|n| v8::String::new(scope, n).unwrap()).collect();
            Some(v8::Module::create_synthetic_module(scope, specifier, &exports, $eval))
        }};
    }

    let result = match module_name {
        "fs" => synth!(builtin_fs::fs_module_eval),
        "fs/path" => synth!(builtin_path::path_module_eval),
        "text/encoding" => synth!(builtin_encoding::encoding_module_eval),
        "ssr/css" => synth!(builtin_css::css_module_eval),
        "net" => synth!(builtin_net::net_module_eval),
        "web" => synth!(builtin_web::web_module_eval),
        "crypto" => synth!(builtin_crypto::crypto_module_eval),
        "compress" => synth!(builtin_compress::compress_module_eval),
        "ekl" => synth!(builtin_ekl::ekl_module_eval),
        "image" => synth!(builtin_image::image_module_eval),
        "text/json" => synth!(builtin_json::json_module_eval),
        "text/regex" => synth!(builtin_regex::regex_module_eval),
        "test/assert" => synth!(builtin_js::assert_module_eval),
        "log" => synth!(builtin_js::log_module_eval),
        "test" => synth!(builtin_js::test_module_eval),
        "web/validate" => synth!(builtin_js::validate_module_eval),
        "db/orm" => synth!(builtin_js::orm_module_eval),
        "jsx-runtime" => synth!(builtin_js::jsx_module_eval),
        "ssr" => synth!(builtin_js::ssr_module_eval),
        "rune" => synth!(builtin_js::rune_module_eval),
        "web/realtime" => synth!(builtin_js::realtime_module_eval),
        "web/graphql" => synth!(builtin_js::graphql_module_eval),
        "app/cli" => synth!(builtin_js::cli_module_eval),
        "job/cron" => synth!(builtin_js::cron_module_eval),
        "job/queue" => synth!(builtin_js::queue_module_eval),
        "auth" => synth!(builtin_js::auth_module_eval),
        "auth/rbac" => synth!(builtin_js::rbac_module_eval),
        "datetime" => synth!(builtin_datetime::datetime_module_eval),
        "db" => synth!(builtin_db::db_module_eval),
        "process" => synth!(builtin_process::process_module_eval),
        "ffi" => synth!(builtin_ffi::ffi_module_eval),
        "rune/mimir" => synth!(builtin_js::mimir_module_eval),
        "rune/router" => synth!(builtin_js::router_module_eval),
        "rune/seo" => synth!(builtin_js::seo_module_eval),
        "app/gui" => synth!(builtin_gui::gui_module_eval),
        "app/tui" => synth!(builtin_tui::tui_module_eval),
        _ => {
            let msg = v8::String::new(scope, &format!("unknown built-in module: {}", spec)).unwrap();
            scope.throw_exception(msg.into());
            None
        }
    };

    if let Some(ref module) = result {
        MODULE_CACHE.with(|cache| {
            cache.borrow_mut().insert(spec.to_string(), v8::Global::new(scope, *module));
        });
    }

    result
}

fn normalize_path(path: &Path) -> PathBuf {
    let mut components = Vec::new();
    for component in path.components() {
        match component {
            std::path::Component::CurDir => {}
            std::path::Component::ParentDir => { components.pop(); }
            other => components.push(other),
        }
    }
    components.iter().collect()
}

fn forbidden_import_extension(spec: &str) -> Option<String> {
    const FORBIDDEN: [&str; 6] = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

    let core = spec.split(['?', '#']).next().unwrap_or(spec).trim_end_matches('/');
    let lower = core.to_ascii_lowercase();
    for ext in FORBIDDEN {
        if lower.ends_with(ext) {
            return Some(core[..core.len() - ext.len()].to_string());
        }
    }
    None
}

fn resolve_module_path(abs_path: PathBuf) -> PathBuf {

    

    
    const EXTS: [&str; 6] = ["js", "mjs", "ts", "tsx", "jsx", "json"];
    if abs_path.is_file() {
        return abs_path;
    }
    let base = abs_path.to_string_lossy();
    for ext in EXTS {
        let cand = PathBuf::from(format!("{}.{}", base, ext));
        if cand.is_file() {
            return cand;
        }
    }
    for ext in EXTS {
        let cand = abs_path.join(format!("index.{}", ext));
        if cand.is_file() {
            return cand;
        }
    }
    abs_path
}

fn resolve_local<'a>(
    scope: &mut v8::HandleScope<'a>,
    spec: &str,
    specifier: v8::Local<'a, v8::String>,
    referrer_dir: Option<&str>,

    
    
    confine: bool,
) -> Option<v8::Local<'a, v8::Module>> {
    
    let path = PathBuf::from(spec);
    let abs_path = if path.is_absolute() {
        normalize_path(&path)
    } else if let Some(dir) = referrer_dir {
        normalize_path(&PathBuf::from(dir).join(spec))
    } else {
        normalize_path(&std::env::current_dir().unwrap_or_default().join(spec))
    };

    

    let abs_path = resolve_module_path(abs_path);

    

    
    
    if confine {
        if let Some(r) = crate::engine::v8_runtime::app_root() {
            if r.own_reads_exempt {
                let canon = std::fs::canonicalize(&abs_path).unwrap_or_else(|_| abs_path.clone());
                if !crate::engine::v8_runtime::module_read_permit(&canon) {
                    let msg = v8::String::new(scope, &format!(
                        "cannot load module '{}': it resolves outside the app root. Packaged code may only \
                         import its own files; run with --allow=fs to read host files.", spec)).unwrap();
                    scope.throw_exception(msg.into());
                    return None;
                }
            }
        }
    }

    
    
    let abs_name = crate::engine::v8_runtime::display_origin(&abs_path.to_string_lossy());

    let cache_key = canonical_module_key(&abs_path);

    
    
    let mock = MOCK_MODULES.with(|m| {
        m.borrow().get(&cache_key).map(|g| v8::Local::new(scope, g))
    });
    if let Some(obj) = mock {
        return build_mock_module(scope, specifier, obj);
    }

    let cached = MODULE_CACHE.with(|c| {
        c.borrow().get(&cache_key).map(|g| v8::Local::new(scope, g))
    });
    if let Some(m) = cached {
        return Some(m);
    }

    let source = match std::fs::read_to_string(&abs_path) {
        Ok(s) => s,
        Err(e) => {
            let msg = v8::String::new(scope, &format!("cannot load module '{}': {}", spec, e)).unwrap();
            scope.throw_exception(msg.into());
            return None;
        }
    };

    let js_source = if abs_path.extension().is_some_and(|e| e == "ts" || e == "tsx" || e == "jsx") {

        match crate::parsers::swc_transform::transpile(&source, &abs_name) {
            Ok(js) => js,
            Err(e) => {
                let msg = v8::String::new(scope, &format!("SWC error in '{}': {}", spec, e)).unwrap();
                scope.throw_exception(msg.into());
                return None;
            }
        }
    } else {
        source
    };

    let source_str = v8::String::new(scope, &js_source).unwrap_or_else(|| v8::String::empty(scope));
    let name_str = v8::String::new(scope, &abs_name).unwrap_or_else(|| v8::String::empty(scope));
    let origin = v8::ScriptOrigin::new(
        scope, name_str.into(), 0, 0, false, 0, None, false, false, true, None,
    );
    let mut v8_source = v8::script_compiler::Source::new(source_str, Some(&origin));

    

    
    let compile_err: Option<String> = {
        let tc = &mut v8::TryCatch::new(scope);
        match v8::script_compiler::compile_module(tc, &mut v8_source) {
            Some(m) => {
                
                register_module_path(m.get_identity_hash(), &abs_path);
                MODULE_CACHE.with(|c| {
                    c.borrow_mut().insert(cache_key.clone(), v8::Global::new(tc, m));
                });
                None
            }
            None => {
                
                let detail = tc.exception()
                    .and_then(|e| e.to_string(tc))
                    .map(|s| s.to_rust_string_lossy(tc))
                    .filter(|s| !s.is_empty());
                Some(match detail {
                    Some(d) => format!("compile error in '{}': {}", spec, d),
                    None => format!("compile error in '{}'", spec),
                })
            }
        }
    };
    match compile_err {
        None => MODULE_CACHE.with(|c| c.borrow().get(&cache_key).map(|g| v8::Local::new(scope, g))),
        Some(full) => {
            let msg = v8::String::new(scope, &full).unwrap();
            scope.throw_exception(msg.into());
            None
        }
    }
}

#[cfg(test)]
mod fuzz_vfs_tests {
    use super::normalize_vfs_path;

    
    #[test]
    fn fuzz_vfs_normalize_no_panic_idempotent() {
        crate::fuzz_support::run_fuzz("path", |s| {
            let n = normalize_vfs_path(s);
            let n2 = normalize_vfs_path(&n);
            assert_eq!(n, n2, "normalize_vfs_path not idempotent for input {:?}", s);
        });
    }
}

#[cfg(test)]
mod canonical_key_tests {
    use super::{canonical_pkg_key, normalize_internal_path, resolve_module_path};

    #[test]
    fn resolve_prefers_compiled_js_over_source_tsx() {
        use std::fs;
        
        let dir = std::env::temp_dir().join(format!("ekko_rmp_{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("Foo.js"), "export const x=1;").unwrap();
        fs::write(dir.join("Foo.tsx"), "export const x=1;").unwrap();
        let resolved = resolve_module_path(dir.join("Foo"));
        assert_eq!(resolved.extension().and_then(|e| e.to_str()), Some("js"),
            "must prefer compiled .js over source .tsx (got {:?})", resolved);
        
        fs::write(dir.join("Bar.tsx"), "export const y=1;").unwrap();
        let r2 = resolve_module_path(dir.join("Bar"));
        assert_eq!(r2.extension().and_then(|e| e.to_str()), Some("tsx"));
        let _ = fs::remove_dir_all(&dir);
    }

    

    #[test]
    fn pkg_key_is_source_and_compiled_extension_invariant() {

        let from_source = canonical_pkg_key("@ekko/asgard", "1.0.0", "src/theme/ThemeContext.tsx");
        let from_compiled = canonical_pkg_key("@ekko/asgard", "1.0.0", "./src/theme/ThemeContext.js");
        assert_eq!(from_source, from_compiled);
        assert_eq!(from_source, "pkg:@ekko/asgard@1.0.0/src/theme/ThemeContext.js");
    }

    #[test]
    fn pkg_key_separator_invariant() {
        
        assert_eq!(
            canonical_pkg_key("@x/lib", "2.1.0", "src\\a\\b.ts"),
            canonical_pkg_key("@x/lib", "2.1.0", "src/a/b.ts"),
        );
    }

    #[test]
    fn normalize_internal_folds_source_ext_only() {
        assert_eq!(normalize_internal_path("./a/b.tsx"), "a/b.js");
        assert_eq!(normalize_internal_path("a\\b.ts"), "a/b.js");
        assert_eq!(normalize_internal_path("a/b.jsx"), "a/b.js");
        assert_eq!(normalize_internal_path("a/b.js"), "a/b.js");
        assert_eq!(normalize_internal_path("a/b.json"), "a/b.json"); 
        assert_eq!(normalize_internal_path("a/b.css"), "a/b.css");
    }

    #[test]
    fn pkg_key_distinguishes_version() {
        assert_ne!(
            canonical_pkg_key("@x/lib", "1.0.0", "src/index.ts"),
            canonical_pkg_key("@x/lib", "2.0.0", "src/index.ts"),
        );
    }
}
