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
use std::io::{Read, Write, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, AtomicBool, Ordering};
use crate::engine::v8_runtime::{resolve_read, resolve_write, read_permit, vfs_meta, vfs_children, app_root, ReadTarget, VfsMeta};

fn errno_prefix(e: &std::io::Error) -> &'static str {

    
    if let Some(n) = e.raw_os_error() {
        match n {
            20 => return "ENOTDIR",    
            21 => return "EISDIR",     
            39 | 66 => return "ENOTEMPTY", 
            _ => {}
        }
    }
    use std::io::ErrorKind::*;
    match e.kind() {
        NotFound => "ENOENT",
        PermissionDenied => "EACCES",
        AlreadyExists => "EEXIST",
        InvalidInput | InvalidData => "EINVAL",
        _ => "EIO",
    }
}

fn throw_read_denied(scope: &mut v8::HandleScope, p: &Path) {
    let m = v8::String::new(scope, &format!("PermissionError: fs access denied for '{}'. Run with --allow=fs", p.display()))
        .unwrap_or_else(|| v8::String::empty(scope));
    scope.throw_exception(m.into());
}

fn read_all(scope: &mut v8::HandleScope, path: &str) -> Result<Vec<u8>, ()> {
    match resolve_read(path) {
        ReadTarget::Vfs(b) => Ok(b),
        ReadTarget::Disk(p) => {
            if !read_permit(&p) { throw_read_denied(scope, &p); return Err(()); }
            std::fs::read(&p).map_err(|e| {
                let m = v8::String::new(scope, &format!("{}: {}", errno_prefix(&e), e)).unwrap_or_else(|| v8::String::empty(scope));
                scope.throw_exception(m.into());
            })
        }
    }
}

static NEXT_HANDLE: AtomicU32 = AtomicU32::new(1);

thread_local! {

    
    static FILE_HANDLES: std::cell::RefCell<HashMap<u32, std::fs::File>> = std::cell::RefCell::new(HashMap::new());
}

pub(super) fn fs_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };

    set_export_fn!(scope, module, "readText", fs_read_text);
    set_export_fn!(scope, module, "read", fs_read);
    set_export_fn!(scope, module, "writeText", fs_write_text);
    set_export_fn!(scope, module, "write", fs_write);

    set_export_fn!(scope, module, "exists", fs_exists);
    set_export_fn!(scope, module, "stat", fs_stat);
    set_export_fn!(scope, module, "remove", fs_remove);
    set_export_fn!(scope, module, "mkdir", fs_mkdir);
    set_export_fn!(scope, module, "readDir", fs_read_dir);
    set_export_fn!(scope, module, "readLines", fs_read_lines);

    set_export_fn!(scope, module, "tempDir", fs_temp_dir);
    set_export_fn!(scope, module, "tempFile", fs_temp_file);

    set_export_fn!(scope, module, "append", fs_append);
    set_export_fn!(scope, module, "appendBytes", fs_append_bytes);
    set_export_fn!(scope, module, "copy", fs_copy);
    set_export_fn!(scope, module, "rename", fs_rename);

    set_export_fn!(scope, module, "chmod", fs_chmod);
    set_export_fn!(scope, module, "symlink", fs_symlink);
    set_export_fn!(scope, module, "readlink", fs_readlink);
    set_export_fn!(scope, module, "tempSubdir", fs_temp_subdir);

    set_export_fn!(scope, module, "open", fs_open);
    set_export_fn!(scope, module, "watch", fs_watch);

    Some(v8::undefined(scope).into())
}

fn fs_read_text(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let path = args.get(0).to_rust_string_lossy(scope);
    let bytes = match read_all(scope, &path) { Ok(b) => b, Err(()) => return };

    
    if bytes.iter().all(|&b| b < 128) {
        match v8::String::new_from_one_byte(scope, &bytes, v8::NewStringType::Normal) {
            Some(v8_str) => rv.set(v8_str.into()),
            None => fs_throw!(scope, "fs.readText: file too large for a V8 string (max ~512M chars)"),
        }
    } else if simdutf8::basic::from_utf8(&bytes).is_ok() {
        
        let s = unsafe { std::str::from_utf8_unchecked(&bytes) };
        match v8::String::new(scope, s) {
            Some(v) => rv.set(v.into()),
            None => fs_throw!(scope, "fs.readText: file too large for a V8 string (max ~512M chars)"),
        }
    } else {
        fs_throw!(scope, format!("EILSEQ: file '{}' is not valid UTF-8", path));
    }
}

fn fs_read(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let path = args.get(0).to_rust_string_lossy(scope);
    let bytes = match read_all(scope, &path) { Ok(b) => b, Err(()) => return };
    
    let store = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared();
    let ab = v8::ArrayBuffer::with_backing_store(scope, &store);
    let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap();
    rv.set(ua.into());
}

fn fs_write_text(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let path = resolve_write(&args.get(0).to_rust_string_lossy(scope));
    check_perm!(scope, "fs", &path);
    let text = args.get(1).to_rust_string_lossy(scope);
    let result = std::fs::write(&path, &text).map_err(|e| format!("{}: {}", errno_prefix(&e), e));
    if let Err(e) = result { fs_throw!(scope, e); }
}

fn fs_write(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let path = resolve_write(&args.get(0).to_rust_string_lossy(scope));
    check_perm!(scope, "fs", &path);
    
    let data = if let Ok(ab) = v8::Local::<v8::ArrayBufferView>::try_from(args.get(1)) {
        let mut buf = vec![0u8; ab.byte_length()];
        ab.copy_contents(&mut buf);
        buf
    } else {
        args.get(1).to_rust_string_lossy(scope).into_bytes()
    };
    let result = std::fs::write(&path, &data).map_err(|e| format!("{}: {}", errno_prefix(&e), e));
    if let Err(e) = result { fs_throw!(scope, e); }
}

fn fs_exists(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let path = args.get(0).to_rust_string_lossy(scope);
    if let Some(VfsMeta::File(_)) | Some(VfsMeta::Dir) = vfs_meta(&path) {
        rv.set(v8::Boolean::new(scope, true).into());
        return;
    }
    let p = match resolve_read(&path) {
        ReadTarget::Vfs(_) => { rv.set(v8::Boolean::new(scope, true).into()); return; }
        ReadTarget::Disk(p) => p,
    };
    if !read_permit(&p) { throw_read_denied(scope, &p); return; }
    rv.set(v8::Boolean::new(scope, p.exists()).into());
}

fn fs_stat(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let path = args.get(0).to_rust_string_lossy(scope);
    let name = Path::new(&path).file_name().unwrap_or_default().to_string_lossy().to_string();
    
    let json = match vfs_meta(&path) {
        Some(VfsMeta::File(sz)) => format!(r#"{{"name":"{}","size":{},"isFile":true,"isDirectory":false}}"#, name, sz),
        Some(VfsMeta::Dir) => format!(r#"{{"name":"{}","size":0,"isFile":false,"isDirectory":true}}"#, name),
        _ => match resolve_read(&path) {
            ReadTarget::Vfs(b) => format!(r#"{{"name":"{}","size":{},"isFile":true,"isDirectory":false}}"#, name, b.len()),
            ReadTarget::Disk(p) => {
                if !read_permit(&p) { throw_read_denied(scope, &p); return; }
                match std::fs::metadata(&p) {
                    Ok(meta) => format!(r#"{{"name":"{}","size":{},"isFile":{},"isDirectory":{}}}"#, name, meta.len(), meta.is_file(), meta.is_dir()),
                    Err(e) => { fs_throw!(scope, format!("{}: {}", errno_prefix(&e), e)); return; }
                }
            }
        },
    };
    let s = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope));
    let parsed = v8::json::parse(scope, s).unwrap();
    rv.set(parsed);
}

fn fs_remove(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let path = resolve_write(&args.get(0).to_rust_string_lossy(scope));
    check_perm!(scope, "fs", &path);
    let recursive = if args.length() > 1 { args.get(1).boolean_value(scope) } else { false };
    let result = {
        let p = Path::new(&path);
        let r = if p.is_dir() {
            if recursive { std::fs::remove_dir_all(p) } else { std::fs::remove_dir(p) }
        } else { std::fs::remove_file(p) };
        r.map_err(|e| format!("{}: {}", errno_prefix(&e), e))
    };
    if let Err(e) = result { fs_throw!(scope, e); }
}

fn fs_mkdir(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let path = resolve_write(&args.get(0).to_rust_string_lossy(scope));
    check_perm!(scope, "fs", &path);
    let result = std::fs::create_dir_all(&path).map_err(|e| format!("{}: {}", errno_prefix(&e), e));
    if let Err(e) = result { fs_throw!(scope, e); }
}

fn fs_read_dir(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let path = args.get(0).to_rust_string_lossy(scope);
    let meta = vfs_meta(&path);
    
    if let Some(VfsMeta::File(_)) = meta { fs_throw!(scope, format!("ENOTDIR: '{}' is a file", path)); return; }

    

    
    
    let mut found = false;
    let mut denied: Option<std::path::PathBuf> = None;
    let mut entries: std::collections::BTreeMap<String, bool> = std::collections::BTreeMap::new(); 

    

    let p = std::path::Path::new(&path);
    let real_dirs: Vec<std::path::PathBuf> = if p.is_absolute() {
        vec![p.to_path_buf()]
    } else if let Some(root) = app_root() {
        let mut v = vec![root.read_root.join(p)];
        if root.write_root != root.read_root { v.push(root.write_root.join(p)); }
        v
    } else {
        vec![p.to_path_buf()]
    };
    for dir in &real_dirs {
        if !read_permit(dir) { denied = Some(dir.clone()); continue; } 
        match std::fs::read_dir(dir) {
            Ok(rd) => {
                found = true;
                for e in rd.flatten() {
                    let name = e.file_name().to_string_lossy().to_string();
                    let is_dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
                    entries.insert(name, is_dir); 
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {} 
            Err(e) => { fs_throw!(scope, format!("{}: {}", errno_prefix(&e), e)); return; }
        }
    }
    
    if let Some(VfsMeta::Dir) = meta {
        found = true;
        for (n, is_dir) in vfs_children(&path).unwrap_or_default() { entries.insert(n, is_dir); }
    }
    if !found {
        if let Some(d) = denied { throw_read_denied(scope, &d); return; } 
        fs_throw!(scope, format!("ENOENT: no such directory '{}'", path)); return;
    }

    let items: Vec<String> = entries.into_iter()
        .map(|(n, is_dir)| format!(r#"{{"name":"{}","isFile":{},"isDirectory":{}}}"#, n, !is_dir, is_dir))
        .collect();
    let json = format!("[{}]", items.join(","));
    let s = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope));
    let parsed = v8::json::parse(scope, s).unwrap();
    rv.set(parsed);
}

fn fs_read_lines(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let path = args.get(0).to_rust_string_lossy(scope);
    let bytes = match read_all(scope, &path) { Ok(b) => b, Err(()) => return };
    let s = match String::from_utf8(bytes) {
        Ok(s) => s,
        Err(_) => { fs_throw!(scope, format!("EILSEQ: file '{}' is not valid UTF-8", path)); return; }
    };
    
    let lines: Vec<String> = s.lines().map(|l| format!("\"{}\"", l.replace('\\', "\\\\").replace('"', "\\\""))).collect();
    let json = format!("[{}]", lines.join(","));
    let vs = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope));
    let parsed = v8::json::parse(scope, vs).unwrap();
    rv.set(parsed);
}

fn fs_temp_dir(scope: &mut v8::HandleScope, _args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "fs");
    let result = std::env::temp_dir().to_string_lossy().to_string();
    rv.set(v8::String::new(scope, &result).unwrap_or_else(|| v8::String::empty(scope)).into());
}

fn fs_temp_file(scope: &mut v8::HandleScope, _args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "fs");
    let mut path = std::env::temp_dir();
    path.push(format!("ekko-{}-{}", std::process::id(), NEXT_HANDLE.fetch_add(1, Ordering::Relaxed)));
    let result = std::fs::write(&path, "").map(|_| path.to_string_lossy().to_string()).map_err(|e| format!("{}: {}", errno_prefix(&e), e));
    match result {
        Ok(s) => rv.set(v8::String::new(scope, &s).unwrap_or_else(|| v8::String::empty(scope)).into()),
        Err(e) => fs_throw!(scope, e),
    }
}

fn fs_append(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let path = resolve_write(&args.get(0).to_rust_string_lossy(scope));
    check_perm!(scope, "fs", &path);
    let text = args.get(1).to_rust_string_lossy(scope);
    let result = std::fs::OpenOptions::new().append(true).create(true).open(&path)
        .and_then(|mut f| f.write_all(text.as_bytes()))
        .map_err(|e| format!("{}: {}", errno_prefix(&e), e));
    if let Err(e) = result { fs_throw!(scope, e); }
}

fn fs_append_bytes(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let path = resolve_write(&args.get(0).to_rust_string_lossy(scope));
    check_perm!(scope, "fs", &path);
    if let Ok(ab) = v8::Local::<v8::ArrayBufferView>::try_from(args.get(1)) {
        let mut buf = vec![0u8; ab.byte_length()];
        ab.copy_contents(&mut buf);
        let result = std::fs::OpenOptions::new().append(true).create(true).open(&path)
            .and_then(|mut f| f.write_all(&buf))
            .map_err(|e| format!("{}: {}", errno_prefix(&e), e));
        if let Err(e) = result { fs_throw!(scope, e); }
    }
}

fn fs_copy(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    
    let src = args.get(0).to_rust_string_lossy(scope);
    let bytes = match read_all(scope, &src) { Ok(b) => b, Err(()) => return };
    let dst = resolve_write(&args.get(1).to_rust_string_lossy(scope));
    check_perm!(scope, "fs", &dst);
    let result = std::fs::write(&dst, &bytes).map_err(|e| format!("{}: {}", errno_prefix(&e), e));
    if let Err(e) = result { fs_throw!(scope, e); }
}

fn fs_rename(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let from = resolve_write(&args.get(0).to_rust_string_lossy(scope));
    check_perm!(scope, "fs", &from);
    let to = resolve_write(&args.get(1).to_rust_string_lossy(scope));
    check_perm!(scope, "fs", &to);
    let result = std::fs::rename(&from, &to).map_err(|e| format!("{}: {}", errno_prefix(&e), e));
    if let Err(e) = result { fs_throw!(scope, e); }
}

fn fs_chmod(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let path = resolve_write(&args.get(0).to_rust_string_lossy(scope));
    check_perm!(scope, "fs", &path);

    let mode = if args.get(1).is_undefined() {
        0o644
    } else {
        args.get(1).int32_value(scope).unwrap_or(0o644)
    };
    let result = {
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&path, std::fs::Permissions::from_mode(mode as u32))
                .map_err(|e| format!("{}: {}", errno_prefix(&e), e))
        }
        #[cfg(not(unix))]
        Ok::<(), String>(())
    };
    if let Err(e) = result { fs_throw!(scope, e); }
}

fn fs_symlink(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let target = args.get(0).to_rust_string_lossy(scope);
    
    let link = resolve_write(&args.get(1).to_rust_string_lossy(scope));
    check_perm!(scope, "fs", &target);
    check_perm!(scope, "fs", &link);
    let result = {
        #[cfg(unix)]
        { std::os::unix::fs::symlink(&target, &link).map_err(|e| format!("{}: {}", errno_prefix(&e), e)) }
        #[cfg(windows)]
        {
            let native_target = target.replace('/', "\\");
            let nt = std::path::Path::new(&native_target);
            
            let probe = if nt.is_absolute() {
                std::path::PathBuf::from(&native_target)
            } else {
                std::path::Path::new(&link).parent().unwrap_or_else(|| std::path::Path::new("")).join(&native_target)
            };
            let r = if probe.is_dir() {
                std::os::windows::fs::symlink_dir(&native_target, &link)
            } else {
                std::os::windows::fs::symlink_file(&native_target, &link)
            };
            r.map_err(|e| format!("{}: {}", errno_prefix(&e), e))
        }
    };
    if let Err(e) = result { fs_throw!(scope, e); }
}

fn fs_readlink(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    
    let path = match resolve_read(&args.get(0).to_rust_string_lossy(scope)) {
        ReadTarget::Vfs(_) => { fs_throw!(scope, "EINVAL: cannot readlink a packed (VFS) path"); return; }
        ReadTarget::Disk(p) => p,
    };
    if !read_permit(&path) { throw_read_denied(scope, &path); return; }
    let result = std::fs::read_link(&path).map(|t| t.to_string_lossy().to_string()).map_err(|e| format!("{}: {}", errno_prefix(&e), e));
    match result {
        Ok(s) => rv.set(v8::String::new(scope, &s).unwrap_or_else(|| v8::String::empty(scope)).into()),
        Err(e) => fs_throw!(scope, e),
    }
}

fn fs_temp_subdir(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "fs");
    let prefix = if args.length() > 0 && !args.get(0).is_undefined() {
        args.get(0).to_rust_string_lossy(scope)
    } else {
        "ekko".to_string()
    };
    let result = {
        let mut path = std::env::temp_dir();
        path.push(format!("{}-{}-{}", prefix, std::process::id(), NEXT_HANDLE.fetch_add(1, Ordering::Relaxed)));
        std::fs::create_dir_all(&path).map(|_| path.to_string_lossy().to_string()).map_err(|e| format!("{}: {}", errno_prefix(&e), e))
    };
    match result {
        Ok(s) => rv.set(v8::String::new(scope, &s).unwrap_or_else(|| v8::String::empty(scope)).into()),
        Err(e) => fs_throw!(scope, e),
    }
}

fn fs_open(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let raw = args.get(0).to_rust_string_lossy(scope);

    let mut read_flag = true;
    let mut write_flag = false;
    let mut create_flag = false;
    let mut truncate_flag = false;
    let mut append_flag = false;

    if args.length() > 1 && args.get(1).is_object() {
        let opts = v8::Local::<v8::Object>::try_from(args.get(1)).unwrap();
        
        macro_rules! get_bool {
            ($name:expr) => {{
                let k = v8::String::new(scope, $name).unwrap();
                opts.get(scope, k.into()).map(|v| v.boolean_value(scope)).unwrap_or(false)
            }};
        }
        read_flag = get_bool!("read");
        write_flag = get_bool!("write");
        create_flag = get_bool!("create");
        truncate_flag = get_bool!("truncate");
        append_flag = get_bool!("append");
        
        if !read_flag && !write_flag && !append_flag {
            read_flag = true;
        }
    }

    
    
    let is_write = write_flag || create_flag || truncate_flag || append_flag;
    let path = if is_write {
        resolve_write(&raw)
    } else {
        match resolve_read(&raw) {
            ReadTarget::Vfs(_) => { fs_throw!(scope, "EINVAL: cannot fs.open a packed (VFS) file; use fs.read/fs.readText"); return; }
            ReadTarget::Disk(p) => p.to_string_lossy().into_owned(),
        }
    };
    check_perm!(scope, "fs", &path);

    let file = std::fs::OpenOptions::new()
        .read(read_flag)
        .write(write_flag || truncate_flag || append_flag)
        .create(create_flag || truncate_flag || append_flag)
        .truncate(truncate_flag)
        .append(append_flag)
        .open(&path);

    let file = match file {
        Ok(f) => f,
        Err(e) => {
            let m = v8::String::new(scope, &format!("{}: {}", errno_prefix(&e), e)).unwrap();
            scope.throw_exception(m.into());
            return;
        }
    };

    let handle_id = NEXT_HANDLE.fetch_add(1, Ordering::SeqCst);
    FILE_HANDLES.with(|h| h.borrow_mut().insert(handle_id, file));

    let obj = v8::Object::new(scope);

    let hk = v8::String::new(scope, "_handle").unwrap();
    let hv = v8::Integer::new(scope, handle_id as i32);
    obj.set(scope, hk.into(), hv.into());

    macro_rules! bind_method {
        ($name:expr, $cb:expr) => {{
            let k = v8::String::new(scope, $name).unwrap();
            let f = v8::Function::new(scope, $cb).unwrap();
            obj.set(scope, k.into(), f.into());
        }};
    }

    bind_method!("read", handle_read);
    bind_method!("write", handle_write);
    bind_method!("seek", handle_seek);
    bind_method!("tell", handle_tell);
    bind_method!("flush", handle_flush);
    bind_method!("truncate", handle_truncate);
    bind_method!("close", handle_close);

    let size = FILE_HANDLES.with(|h| {
        h.borrow().get(&handle_id).and_then(|f| f.metadata().ok()).map(|m| m.len()).unwrap_or(0)
    });
    let sk = v8::String::new(scope, "size").unwrap();
    let sv = v8::Number::new(scope, size as f64);
    obj.set(scope, sk.into(), sv.into());

    rv.set(obj.into());
}

macro_rules! get_handle_id {
    ($scope:expr, $args:expr) => {{
        let this = $args.this();
        let k = v8::String::new($scope, "_handle").unwrap();
        this.get($scope, k.into())
            .and_then(|v| v.int32_value($scope))
            .unwrap_or(0) as u32
    }};
}

fn handle_read(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let id = get_handle_id!(scope, args);

    
    let count = if args.get(0).is_undefined() {
        16384
    } else {
        args.get(0).int32_value(scope).unwrap_or(16384) as usize
    };

    let result = FILE_HANDLES.with(|h| {
        let mut handles = h.borrow_mut();
        if let Some(file) = handles.get_mut(&id) {
            let mut buf = vec![0u8; count];
            match file.read(&mut buf) {
                
                Ok(n) => { buf.truncate(n); Ok(buf) }
                Err(e) => Err(format!("{}: {}", errno_prefix(&e), e))
            }
        } else {
            Err("EBADF: invalid handle".to_string())
        }
    });

    match result {
        Ok(bytes) => {
            let store = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared();
            let ab = v8::ArrayBuffer::with_backing_store(scope, &store);
            let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap();
            rv.set(ua.into());
        }
        Err(e) => { let m = v8::String::new(scope, &e).unwrap_or_else(|| v8::String::empty(scope)); scope.throw_exception(m.into()); }
    }
}

fn handle_write(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let id = get_handle_id!(scope, args);

    let data = if let Ok(ab) = v8::Local::<v8::ArrayBufferView>::try_from(args.get(0)) {
        let mut buf = vec![0u8; ab.byte_length()];
        ab.copy_contents(&mut buf);
        buf
    } else {
        let s = args.get(0).to_rust_string_lossy(scope);
        s.into_bytes()
    };

    let result = FILE_HANDLES.with(|h| {
        let mut handles = h.borrow_mut();
        if let Some(file) = handles.get_mut(&id) {
            match file.write_all(&data) {
                Ok(()) => Ok(data.len()),
                Err(e) => Err(format!("{}: {}", errno_prefix(&e), e))
            }
        } else {
            Err("EBADF: invalid handle".to_string())
        }
    });

    match result {
        Ok(n) => rv.set(v8::Integer::new(scope, n as i32).into()),
        Err(e) => { let m = v8::String::new(scope, &e).unwrap_or_else(|| v8::String::empty(scope)); scope.throw_exception(m.into()); }
    }
}

fn handle_seek(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let id = get_handle_id!(scope, args);
    let offset = args.get(0).number_value(scope).unwrap_or(0.0) as i64;
    let origin_str = if args.length() > 1 {
        args.get(1).to_rust_string_lossy(scope)
    } else {
        "start".to_string()
    };
    
    let seek_from = match origin_str.as_str() {
        "current" => SeekFrom::Current(offset),
        "end" => SeekFrom::End(offset),
        _ => SeekFrom::Start(offset as u64),
    };

    let result = FILE_HANDLES.with(|h| {
        let mut handles = h.borrow_mut();
        if let Some(file) = handles.get_mut(&id) {
            file.seek(seek_from).map_err(|e| format!("{}: {}", errno_prefix(&e), e))
        } else {
            Err("EBADF: invalid handle".to_string())
        }
    });

    match result {
        Ok(pos) => rv.set(v8::Number::new(scope, pos as f64).into()),
        Err(e) => { let m = v8::String::new(scope, &e).unwrap_or_else(|| v8::String::empty(scope)); scope.throw_exception(m.into()); }
    }
}

fn handle_tell(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let id = get_handle_id!(scope, args);
    let result = FILE_HANDLES.with(|h| {
        let mut handles = h.borrow_mut();
        if let Some(file) = handles.get_mut(&id) {
            file.stream_position().map_err(|e| format!("{}: {}", errno_prefix(&e), e))
        } else {
            Err("EBADF: invalid handle".to_string())
        }
    });
    match result {
        Ok(pos) => rv.set(v8::Number::new(scope, pos as f64).into()),
        Err(e) => { let m = v8::String::new(scope, &e).unwrap_or_else(|| v8::String::empty(scope)); scope.throw_exception(m.into()); }
    }
}

fn handle_flush(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let id = get_handle_id!(scope, args);
    FILE_HANDLES.with(|h| {
        let mut handles = h.borrow_mut();
        if let Some(file) = handles.get_mut(&id) {
            let _ = file.flush();
        }
    });
}

fn handle_truncate(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let id = get_handle_id!(scope, args);
    let len = args.get(0).number_value(scope).unwrap_or(0.0) as u64;
    FILE_HANDLES.with(|h| {
        let handles = h.borrow();
        if let Some(file) = handles.get(&id) {
            let _ = file.set_len(len);
        }
    });
}

fn handle_close(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let id = get_handle_id!(scope, args);
    FILE_HANDLES.with(|h| {
        h.borrow_mut().remove(&id);
    });
}

static NEXT_WATCHER: AtomicU32 = AtomicU32::new(1);

struct WatcherState {
    rx: std::sync::mpsc::Receiver<WatchEvent>,
    
    closed: std::sync::Arc<AtomicBool>,
}

struct WatchEvent {
    event_type: String,  
    path: String,
}

thread_local! {
    
    static WATCHERS: std::cell::RefCell<HashMap<u32, WatcherState>> = std::cell::RefCell::new(HashMap::new());
}

fn fs_watch(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let path = args.get(0).to_rust_string_lossy(scope);
    check_perm!(scope, "fs", &path);
    let recursive = if args.length() > 1 && args.get(1).is_object() {
        let opts = v8::Local::<v8::Object>::try_from(args.get(1)).unwrap();
        let k = v8::String::new(scope, "recursive").unwrap();
        opts.get(scope, k.into()).map(|v| v.boolean_value(scope)).unwrap_or(true)
    } else {
        true
    };

    let (tx, rx) = std::sync::mpsc::channel::<WatchEvent>();
    
    let closed = std::sync::Arc::new(AtomicBool::new(false));
    let closed_clone = closed.clone();

    let watch_path = PathBuf::from(&path);
    let rec_mode = if recursive {
        notify::RecursiveMode::Recursive
    } else {
        notify::RecursiveMode::NonRecursive
    };

    
    
    std::thread::spawn(move || {
        use notify::Watcher;
        let tx_clone = tx.clone();
        let mut watcher = match notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                
                let event_type = match event.kind {
                    notify::EventKind::Create(_) => "create",
                    notify::EventKind::Modify(_) => "modify",
                    notify::EventKind::Remove(_) => "remove",
                    _ => return,
                };
                for p in &event.paths {
                    let _ = tx_clone.send(WatchEvent {
                        event_type: event_type.to_string(),
                        path: p.to_string_lossy().to_string(),
                    });
                }
            }
        }) {
            Ok(w) => w,
            Err(_) => return,
        };

        if watcher.watch(&watch_path, rec_mode).is_err() {
            return;
        }

        while !closed_clone.load(std::sync::atomic::Ordering::SeqCst) {
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        drop(watcher);  
    });

    let watcher_id = NEXT_WATCHER.fetch_add(1, Ordering::SeqCst);
    WATCHERS.with(|w| {
        w.borrow_mut().insert(watcher_id, WatcherState { rx, closed });
    });

    let obj = v8::Object::new(scope);

    let idk = v8::String::new(scope, "_watcherId").unwrap();
    let idv = v8::Integer::new(scope, watcher_id as i32);
    obj.set(scope, idk.into(), idv.into());

    let next_key = v8::String::new(scope, "next").unwrap();
    let next_fn = v8::Function::new(scope, watcher_next).unwrap();
    obj.set(scope, next_key.into(), next_fn.into());

    let close_key = v8::String::new(scope, "close").unwrap();
    let close_fn = v8::Function::new(scope, watcher_close).unwrap();
    obj.set(scope, close_key.into(), close_fn.into());

    rv.set(obj.into());
}

fn watcher_next(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let this = args.this();
    let k = v8::String::new(scope, "_watcherId").unwrap();
    let watcher_id = this.get(scope, k.into())
        .and_then(|v| v.int32_value(scope))
        .unwrap_or(0) as u32;

    let event = WATCHERS.with(|w| {
        let watchers = w.borrow();
        if let Some(state) = watchers.get(&watcher_id) {
            match state.rx.try_recv() {
                Ok(e) => Some(e),
                Err(_) => None,
            }
        } else {
            None
        }
    });

    if let Some(evt) = event {
        
        let obj = v8::Object::new(scope);
        let tk = v8::String::new(scope, "type").unwrap();
        let tv = v8::String::new(scope, &evt.event_type).unwrap_or_else(|| v8::String::empty(scope));
        obj.set(scope, tk.into(), tv.into());
        let pk = v8::String::new(scope, "path").unwrap();
        let pv = v8::String::new(scope, &evt.path).unwrap_or_else(|| v8::String::empty(scope));
        obj.set(scope, pk.into(), pv.into());

        let dk = v8::String::new(scope, "done").unwrap();
        let dv = v8::Boolean::new(scope, false);
        let result = v8::Object::new(scope);
        let vk = v8::String::new(scope, "value").unwrap();
        result.set(scope, vk.into(), obj.into());
        result.set(scope, dk.into(), dv.into());
        rv.set(result.into());
    } else {
        
        let is_closed = WATCHERS.with(|w| {
            w.borrow().get(&watcher_id)
                .map(|s| s.closed.load(std::sync::atomic::Ordering::SeqCst))
                .unwrap_or(true)
        });

        if is_closed {
            
            let result = v8::Object::new(scope);
            let dk = v8::String::new(scope, "done").unwrap();
            let dv = v8::Boolean::new(scope, true);
            result.set(scope, dk.into(), dv.into());
            let vk = v8::String::new(scope, "value").unwrap();
            let undef = v8::undefined(scope);
            result.set(scope, vk.into(), undef.into());
            rv.set(result.into());
        } else {
            
            rv.set(v8::undefined(scope).into());
        }
    }
}

fn watcher_close(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let this = args.this();
    let k = v8::String::new(scope, "_watcherId").unwrap();
    let watcher_id = this.get(scope, k.into())
        .and_then(|v| v.int32_value(scope))
        .unwrap_or(0) as u32;

    WATCHERS.with(|w| {
        if let Some(state) = w.borrow().get(&watcher_id) {
            state.closed.store(true, std::sync::atomic::Ordering::SeqCst);
        }
    });
}

