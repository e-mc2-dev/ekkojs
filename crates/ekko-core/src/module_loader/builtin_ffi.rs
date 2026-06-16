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
use std::path::{Path, PathBuf};
use super::get_vfs_registry;

use crate::ffi::ffi_runtime::{
    self, FfiType, FfiStruct, FfiValue, FnDeclaration, FfiCallContext,
    DynLibrary, register_ffi_lib, unregister_ffi_lib,
    register_ffi_context, unregister_ffi_contexts_for_lib,
    FFI_CONTEXTS,
};

pub(super) fn ffi_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };

    set_export_fn!(scope, module, "dlopen", ffi_dlopen);

    
    let types_obj = v8::Object::new(scope);
    for (name, type_id) in [
        ("i8", "i8"), ("i16", "i16"), ("i32", "i32"), ("i64", "i64"),
        ("u8", "u8"), ("u16", "u16"), ("u32", "u32"), ("u64", "u64"),
        ("f32", "f32"), ("f64", "f64"), ("bool", "bool"), ("void", "void"),
        ("ptr", "ptr"), ("cstring", "cstring"), ("buffer", "buffer"),
    ] {
        let sentinel = v8::Object::new(scope);
        let tk = v8::String::new(scope, "_ffi_type").unwrap();
        let tv = v8::String::new(scope, type_id).unwrap();
        sentinel.set(scope, tk.into(), tv.into());
        let key = v8::String::new(scope, name).unwrap();
        types_obj.set(scope, key.into(), sentinel.into());
    }
    obj_fn!(scope, types_obj, "struct", ffi_struct_type);

    let types_key = v8::String::new(scope, "types").unwrap();
    let _ = module.set_synthetic_module_export(scope, types_key, types_obj.into());

    Some(v8::undefined(scope).into())
}

fn ffi_struct_type(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    if args.length() < 1 || !args.get(0).is_object() {
        fs_throw!(scope, "ffi: struct() expects an object with field definitions");
        return;
    }
    let fields_obj = v8::Local::<v8::Object>::try_from(args.get(0)).unwrap();
    let names = match fields_obj.get_own_property_names(scope, v8::GetPropertyNamesArgs::default()) {
        Some(n) => n,
        None => { fs_throw!(scope, "ffi: could not read struct fields"); return; }
    };

    let mut fields: Vec<(String, FfiType)> = Vec::new();
    for i in 0..names.length() {
        let key = names.get_index(scope, i).unwrap();
        let name = key.to_rust_string_lossy(scope);
        let type_val = fields_obj.get(scope, key).unwrap();
        match parse_ffi_type_sentinel(scope, type_val) {
            Some(ft) => fields.push((name, ft)),
            None => { fs_throw!(scope, format!("ffi: invalid type for struct field '{}'", name)); return; }
        }
    }

    let st = FfiStruct::new("".to_string(), fields);
    let result = v8::Object::new(scope);
    let tk = v8::String::new(scope, "_ffi_type").unwrap();
    let tv = v8::String::new(scope, "struct").unwrap();
    result.set(scope, tk.into(), tv.into());

    let fields_arr = v8::Array::new(scope, st.fields.len() as i32);
    for (i, (name, _)) in st.fields.iter().enumerate() {
        let n = v8::String::new(scope, name).unwrap();
        fields_arr.set_index(scope, i as u32, n.into());
    }
    let fk = v8::String::new(scope, "_fields").unwrap();
    result.set(scope, fk.into(), fields_arr.into());

    let sk = v8::String::new(scope, "_size").unwrap();
    let sv = v8::Integer::new(scope, st.size as i32);
    result.set(scope, sk.into(), sv.into());

    let ak = v8::String::new(scope, "_align").unwrap();
    let av = v8::Integer::new(scope, st.alignment as i32);
    result.set(scope, ak.into(), av.into());

    let offsets_arr = v8::Array::new(scope, st.offsets.len() as i32);
    for (i, off) in st.offsets.iter().enumerate() {
        let ov = v8::Integer::new(scope, *off as i32);
        offsets_arr.set_index(scope, i as u32, ov.into());
    }
    let ok = v8::String::new(scope, "_offsets").unwrap();
    result.set(scope, ok.into(), offsets_arr.into());

    let types_arr = v8::Array::new(scope, st.fields.len() as i32);
    for (i, (_, ft)) in st.fields.iter().enumerate() {
        let ft_obj = ffi_type_to_sentinel(scope, ft);
        types_arr.set_index(scope, i as u32, ft_obj);
    }
    let ttk = v8::String::new(scope, "_types").unwrap();
    result.set(scope, ttk.into(), types_arr.into());

    rv.set(result.into());
}

fn ffi_type_to_sentinel<'s>(scope: &mut v8::HandleScope<'s>, ft: &FfiType) -> v8::Local<'s, v8::Value> {
    let obj = v8::Object::new(scope);
    let tk = v8::String::new(scope, "_ffi_type").unwrap();
    let type_name = match ft {
        FfiType::I8 => "i8", FfiType::I16 => "i16", FfiType::I32 => "i32", FfiType::I64 => "i64",
        FfiType::U8 => "u8", FfiType::U16 => "u16", FfiType::U32 => "u32", FfiType::U64 => "u64",
        FfiType::F32 => "f32", FfiType::F64 => "f64", FfiType::Bool => "bool", FfiType::Void => "void",
        FfiType::Pointer => "ptr", FfiType::CString => "cstring", FfiType::Buffer => "buffer",
        FfiType::Struct(_) => "struct",
    };
    let tv = v8::String::new(scope, type_name).unwrap();
    obj.set(scope, tk.into(), tv.into());
    obj.into()
}

fn parse_ffi_type_sentinel(scope: &mut v8::HandleScope, val: v8::Local<v8::Value>) -> Option<FfiType> {
    if !val.is_object() { return None; }
    let obj = v8::Local::<v8::Object>::try_from(val).ok()?;
    let tk = v8::String::new(scope, "_ffi_type")?;
    let tv = obj.get(scope, tk.into())?;
    if !tv.is_string() { return None; }
    let type_str = tv.to_rust_string_lossy(scope);
    match type_str.as_str() {
        "i8" => Some(FfiType::I8), "i16" => Some(FfiType::I16),
        "i32" => Some(FfiType::I32), "i64" => Some(FfiType::I64),
        "u8" => Some(FfiType::U8), "u16" => Some(FfiType::U16),
        "u32" => Some(FfiType::U32), "u64" => Some(FfiType::U64),
        "f32" => Some(FfiType::F32), "f64" => Some(FfiType::F64),
        "bool" => Some(FfiType::Bool), "void" => Some(FfiType::Void),
        "ptr" => Some(FfiType::Pointer), "cstring" => Some(FfiType::CString),
        "buffer" => Some(FfiType::Buffer),
        "struct" => {
            let fk = v8::String::new(scope, "_fields")?;
            let fields_val = obj.get(scope, fk.into())?;
            let fields_arr = v8::Local::<v8::Array>::try_from(fields_val).ok()?;
            let ttk = v8::String::new(scope, "_types")?;
            let types_val = obj.get(scope, ttk.into())?;
            let types_arr = v8::Local::<v8::Array>::try_from(types_val).ok()?;
            let mut fields = Vec::new();
            for i in 0..fields_arr.length() {
                let name = fields_arr.get_index(scope, i)?.to_rust_string_lossy(scope);
                let ft_sentinel = types_arr.get_index(scope, i)?;
                let ft = parse_ffi_type_sentinel(scope, ft_sentinel)?;
                fields.push((name, ft));
            }
            Some(FfiType::Struct(FfiStruct::new("".to_string(), fields)))
        }
        _ => None,
    }
}

fn parse_declarations(scope: &mut v8::HandleScope, decls_val: v8::Local<v8::Value>) -> Result<std::collections::HashMap<String, FnDeclaration>, String> {
    if !decls_val.is_object() {
        return Err("dlopen: declarations must be an object".to_string());
    }
    let decls_obj = v8::Local::<v8::Object>::try_from(decls_val).map_err(|_| "dlopen: invalid declarations")?;
    let names = decls_obj.get_own_property_names(scope, v8::GetPropertyNamesArgs::default())
        .ok_or("dlopen: could not read declaration keys")?;

    let mut result = std::collections::HashMap::new();
    for i in 0..names.length() {
        let key = names.get_index(scope, i).unwrap();
        let name = key.to_rust_string_lossy(scope);
        let decl_val = decls_obj.get(scope, key).unwrap();
        if !decl_val.is_object() {
            return Err(format!("dlopen: declaration for '{}' must be an object", name));
        }
        let decl_obj = v8::Local::<v8::Object>::try_from(decl_val).unwrap();

        let args_key = v8::String::new(scope, "args").unwrap();
        let args_val = decl_obj.get(scope, args_key.into()).ok_or(format!("dlopen: '{}' missing args", name))?;
        let args_arr = v8::Local::<v8::Array>::try_from(args_val).map_err(|_| format!("dlopen: '{}' args must be array", name))?;
        let mut arg_types = Vec::new();
        for j in 0..args_arr.length() {
            let at = args_arr.get_index(scope, j).unwrap();
            match parse_ffi_type_sentinel(scope, at) {
                Some(ft) => arg_types.push(ft),
                None => return Err(format!("dlopen: '{}' arg {} has invalid type", name, j)),
            }
        }

        let ret_key = v8::String::new(scope, "returns").unwrap();
        let ret_val = decl_obj.get(scope, ret_key.into()).ok_or(format!("dlopen: '{}' missing returns", name))?;
        let return_type = parse_ffi_type_sentinel(scope, ret_val)
            .ok_or(format!("dlopen: '{}' has invalid return type", name))?;

        let async_key = v8::String::new(scope, "async").unwrap();
        let is_async = decl_obj.get(scope, async_key.into())
            .map(|v| v.is_true())
            .unwrap_or(false);

        result.insert(name, FnDeclaration { args: arg_types, returns: return_type, is_async });
    }
    Ok(result)
}

fn resolve_native(scope: &mut v8::HandleScope, lib_name: &str) -> Result<String, String> {
    
    let stack = v8::StackTrace::current_stack_trace(scope, 10)
        .ok_or("ffi: cannot determine caller")?;

    for i in 0..stack.get_frame_count() {
        if let Some(frame) = stack.get_frame(scope, i as usize) {
            if let Some(script_name) = frame.get_script_name_or_source_url(scope) {
                let name = script_name.to_rust_string_lossy(scope);
                if name.starts_with("ekl:///") {
                    let inner = &name["ekl:///".len()..];
                    let pkg_name = if inner.starts_with('@') {
                        inner.splitn(3, '/').take(2).collect::<Vec<_>>().join("/")
                    } else {
                        inner.split('/').next().unwrap_or("").to_string()
                    };
                    let registry = get_vfs_registry();
                    let pkg = registry.get_package(&pkg_name)
                        .ok_or_else(|| format!("ffi: package '{}' not found in VFS", pkg_name))?;
                    let cache_dir = ffi_runtime::ekko_home();
                    return pkg.extract_native(&cache_dir, lib_name)
                        .map(|p| p.to_string_lossy().to_string())
                        .map_err(|e| format!("ffi: {}", e));
                }
            }
        }
    }

    if let Some(ws) = crate::packages::workspace::get_workspace() {
        let platform_key = crate::packages::build::current_platform_key();

        

        
        if let Some(member) = caller_owning_member(scope, &stack, ws) {
            if let Some(rel_path) = member.native.get(lib_name).and_then(|p| p.get(&platform_key)) {
                let full_path = member.root_dir.join(rel_path);
                if full_path.exists() {
                    return Ok(full_path.to_string_lossy().to_string());
                }
                return Err(format!(
                    "ffi: native lib '{}' for package '{}' missing at '{}' (platform '{}')",
                    lib_name, member.name, full_path.display(), platform_key
                ));
            }
            return Err(format!(
                "ffi: package '{}' declares no native lib '{}' for platform '{}'",
                member.name, lib_name, platform_key
            ));
        }

        
        for (_member_name, member) in &ws.members {
            if let Some(platforms) = member.native.get(lib_name) {
                if let Some(rel_path) = platforms.get(&platform_key) {
                    let full_path = member.root_dir.join(rel_path);
                    if full_path.exists() {
                        return Ok(full_path.to_string_lossy().to_string());
                    }
                }
            }
        }
        return Err(format!(
            "ffi: native lib '{}' not found in any workspace member for platform '{}'",
            lib_name, platform_key
        ));
    }

    Err("ffi: native resolution requires a VFS package or workspace with ekko.json".to_string())
}

fn caller_owning_member<'a>(
    scope: &mut v8::HandleScope,
    stack: &v8::Local<v8::StackTrace>,
    ws: &'a crate::packages::workspace::Workspace,
) -> Option<&'a crate::packages::workspace::Member> {
    for i in 0..stack.get_frame_count() {
        if let Some(frame) = stack.get_frame(scope, i as usize) {
            if let Some(name) = frame.get_script_name_or_source_url(scope) {
                let raw = name.to_rust_string_lossy(scope);
                if raw.is_empty() || raw.starts_with("ekko:") || raw.starts_with("ekl:///") {
                    continue;
                }
                if let Some(member) = ws.member_owning_path(&raw) {
                    return Some(member);
                }
            }
        }
    }
    None
}

fn ffi_dlopen(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    if args.length() < 2 {
        fs_throw!(scope, "ffi: dlopen(path, declarations) requires 2 arguments");
        return;
    }

    let path_str = args.get(0).to_rust_string_lossy(scope);

    let resolved_path = if path_str.starts_with("native:") {
        let raw_name = &path_str["native:".len()..];
        let lib_name = if raw_name == "self" { "_" } else { raw_name };
        match resolve_native(scope, lib_name) {
            Ok(p) => p,
            Err(e) => { fs_throw!(scope, e); return; }
        }
    } else if path_str.starts_with("./") || path_str.starts_with("../") {
        let referrer_dir = scope.get_current_context().global(scope);
        let dir_key = v8::String::new(scope, "__filename").unwrap();
        let base = referrer_dir.get(scope, dir_key.into())
            .filter(|v| v.is_string())
            .map(|v| {
                let p = PathBuf::from(v.to_rust_string_lossy(scope));
                p.parent().unwrap_or(Path::new(".")).to_path_buf()
            })
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
        base.join(&path_str).to_string_lossy().to_string()
    } else {
        path_str.clone()
    };

    let is_native_self = path_str.starts_with("native:");
    if !is_native_self {
        if !crate::engine::v8_runtime::check_ffi_permission(&resolved_path) {
            let lib_name = std::path::Path::new(&resolved_path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or(&resolved_path);
            fs_throw!(scope, format!(
                "PermissionError: ffi access denied for '{}'. Use --allow=ffi:{} to allow this library, or --allow=ffi:unsafe for unrestricted native code",
                resolved_path, lib_name
            ));
            return;
        }
        eprintln!("[security] ffi: loading native library '{}'", resolved_path);
    } else if !crate::engine::v8_runtime::check_permission("ffi") {
        fs_throw!(scope, "PermissionError: ffi access denied. Run with --allow=ffi:unsafe");
        return;
    }

    let declarations = match parse_declarations(scope, args.get(1)) {
        Ok(d) => d,
        Err(e) => { fs_throw!(scope, e); return; }
    };

    let lib = match DynLibrary::open(&resolved_path, &declarations) {
        Ok(l) => Arc::new(l),
        Err(e) => { fs_throw!(scope, e); return; }
    };

    let proxy = v8::Object::new(scope);

    let path_key = v8::String::new(scope, "__ffi_path").unwrap();
    let path_val = v8::String::new(scope, &lib.path).unwrap_or_else(|| v8::String::empty(scope));
    proxy.set(scope, path_key.into(), path_val.into());

    
    
    let sym_names: Vec<String> = lib.symbols.keys().cloned().collect();
    for name in &sym_names {
        let sym = lib.symbols.get(name).unwrap();
        let ctx_id = register_ffi_context(FfiCallContext {
            lib: lib.clone(),
            symbol_name: name.clone(),
        });

        let ctx_id_external = v8::External::new(scope, ctx_id as usize as *mut std::ffi::c_void);
        let key = v8::String::new(scope, name).unwrap();

        if sym.is_async {
            let tmpl = v8::FunctionTemplate::builder(ffi_call_async_trampoline)
                .data(ctx_id_external.into())
                .build(scope);
            let func = match tmpl.get_function(scope) {
                Some(f) => f,
                None => { fs_throw!(scope, format!("ffi: failed to create function for '{}'", name)); return; }
            };
            proxy.set(scope, key.into(), func.into());
        } else {
            let tmpl = v8::FunctionTemplate::builder(ffi_call_trampoline)
                .data(ctx_id_external.into())
                .build(scope);
            let func = match tmpl.get_function(scope) {
                Some(f) => f,
                None => { fs_throw!(scope, format!("ffi: failed to create function for '{}'", name)); return; }
            };
            proxy.set(scope, key.into(), func.into());
        }
    }

    obj_fn!(scope, proxy, "close", ffi_close);

    register_ffi_lib(lib);

    rv.set(proxy.into());
}

fn ffi_call_trampoline(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let ctx_id = {
        let data = args.data();
        let external = match v8::Local::<v8::External>::try_from(data) {
            Ok(e) => e,
            Err(_) => { fs_throw!(scope, "ffi: invalid call context"); return; }
        };
        external.value() as usize as u32
    };

    let (lib, symbol_name) = match FFI_CONTEXTS.with(|ctxs| {
        ctxs.borrow().get(&ctx_id).map(|c| (c.lib.clone(), c.symbol_name.clone()))
    }) {
        Some(pair) => pair,
        None => { fs_throw!(scope, "ffi: call context not found (library may be closed)"); return; }
    };

    let sym = match lib.symbols.get(&symbol_name) {
        Some(s) => s,
        None => { fs_throw!(scope, format!("ffi: symbol '{}' not found", symbol_name)); return; }
    };

    if args.length() < sym.arg_types.len() as i32 {
        fs_throw!(scope, format!("ffi: '{}' expects {} arguments, got {}", symbol_name, sym.arg_types.len(), args.length()));
        return;
    }

    let mut ffi_args = Vec::with_capacity(sym.arg_types.len());
    for (i, ft) in sym.arg_types.iter().enumerate() {
        match marshal_v8_to_ffi(scope, args.get(i as i32), ft) {
            Ok(v) => ffi_args.push(v),
            Err(e) => { fs_throw!(scope, format!("ffi: '{}' arg {}: {}", symbol_name, i, e)); return; }
        }
    }

    match lib.call(&symbol_name, &ffi_args) {
        Ok(result) => {
            let v8_val = marshal_ffi_to_v8(scope, &result, &sym.return_type);
            rv.set(v8_val);
        }
        Err(e) => fs_throw!(scope, format!("ffi: call '{}' failed: {}", symbol_name, e)),
    }
}

fn ffi_call_async_trampoline(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let ctx_id = {
        let data = args.data();
        let external = match v8::Local::<v8::External>::try_from(data) {
            Ok(e) => e,
            Err(_) => { fs_throw!(scope, "ffi: invalid async call context"); return; }
        };
        external.value() as usize as u32
    };

    let (lib, symbol_name) = match FFI_CONTEXTS.with(|ctxs| {
        ctxs.borrow().get(&ctx_id).map(|c| (c.lib.clone(), c.symbol_name.clone()))
    }) {
        Some(pair) => pair,
        None => { fs_throw!(scope, "ffi: async call context not found"); return; }
    };

    let sym = match lib.symbols.get(&symbol_name) {
        Some(s) => s,
        None => { fs_throw!(scope, format!("ffi: symbol '{}' not found", symbol_name)); return; }
    };

    let mut ffi_args = Vec::with_capacity(sym.arg_types.len());
    for (i, ft) in sym.arg_types.iter().enumerate() {
        match marshal_v8_to_ffi(scope, args.get(i as i32), ft) {
            Ok(v) => ffi_args.push(v),
            Err(e) => { fs_throw!(scope, format!("ffi: '{}' arg {}: {}", symbol_name, i, e)); return; }
        }
    }

    let resolver = v8::PromiseResolver::new(scope).unwrap();
    let promise = resolver.get_promise(scope);
    rv.set(promise.into());

    let async_state = scope
        .get_slot::<std::rc::Rc<std::cell::RefCell<crate::ops::async_state::AsyncState>>>()
        .unwrap()
        .clone();
    let mut state = async_state.borrow_mut();
    let (id, tx, notify) = state.register(v8::Global::new(scope, resolver), None);
    drop(state);

    let return_type = sym.return_type.clone();
    let sym_name = symbol_name.clone();

    tokio::spawn(async move {
        let result = lib.call(&sym_name, &ffi_args);
        let completion = match result {
            Ok(val) => Ok(ffi_runtime::ffi_value_to_json(&val, &return_type)),
            Err(e) => Err(e),
        };
        let _ = tx.send(crate::ops::async_state::AsyncCompletion { id, result: completion }).await;
        notify.notify_one();
    });
}

fn ffi_close(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let this = args.this();
    let path_key = v8::String::new(scope, "__ffi_path").unwrap();
    if let Some(path_val) = this.get(scope, path_key.into()) {
        if path_val.is_string() {
            let path = path_val.to_rust_string_lossy(scope);
            unregister_ffi_contexts_for_lib(&path);
            unregister_ffi_lib(&path);
        }
    }
}

fn marshal_v8_to_ffi(scope: &mut v8::HandleScope, val: v8::Local<v8::Value>, ft: &FfiType) -> Result<FfiValue, String> {
    match ft {
        FfiType::Void => Ok(FfiValue::Void),
        FfiType::I8 => Ok(FfiValue::I8(val.int32_value(scope).unwrap_or(0) as i8)),
        FfiType::I16 => Ok(FfiValue::I16(val.int32_value(scope).unwrap_or(0) as i16)),
        FfiType::I32 => Ok(FfiValue::I32(val.int32_value(scope).unwrap_or(0))),
        FfiType::I64 => {
            if val.is_big_int() {
                let bi = v8::Local::<v8::BigInt>::try_from(val).map_err(|_| "expected BigInt")?;
                let (value, _) = bi.i64_value();
                Ok(FfiValue::I64(value))
            } else {
                Ok(FfiValue::I64(val.integer_value(scope).unwrap_or(0)))
            }
        }
        FfiType::U8 => Ok(FfiValue::U8(val.uint32_value(scope).unwrap_or(0) as u8)),
        FfiType::U16 => Ok(FfiValue::U16(val.uint32_value(scope).unwrap_or(0) as u16)),
        FfiType::U32 => Ok(FfiValue::U32(val.uint32_value(scope).unwrap_or(0))),
        FfiType::U64 => {
            if val.is_big_int() {
                let bi = v8::Local::<v8::BigInt>::try_from(val).map_err(|_| "expected BigInt")?;
                let (value, _) = bi.u64_value();
                Ok(FfiValue::U64(value))
            } else {
                Ok(FfiValue::U64(val.integer_value(scope).unwrap_or(0) as u64))
            }
        }
        FfiType::F32 => Ok(FfiValue::F32(val.number_value(scope).unwrap_or(0.0) as f32)),
        FfiType::F64 => Ok(FfiValue::F64(val.number_value(scope).unwrap_or(0.0))),
        FfiType::Bool => Ok(FfiValue::Bool(val.boolean_value(scope))),
        FfiType::Pointer => {
            if val.is_big_int() {
                let bi = v8::Local::<v8::BigInt>::try_from(val).map_err(|_| "expected BigInt for pointer")?;
                let (value, _) = bi.u64_value();
                Ok(FfiValue::Pointer(value as *mut std::ffi::c_void))
            } else if val.is_null() || val.is_undefined() {
                Ok(FfiValue::Pointer(std::ptr::null_mut()))
            } else {
                let n = val.integer_value(scope).unwrap_or(0);
                Ok(FfiValue::Pointer(n as *mut std::ffi::c_void))
            }
        }
        FfiType::CString => {

            if val.is_null() || val.is_undefined() {
                Ok(FfiValue::Pointer(std::ptr::null_mut()))
            } else {
                let s = val.to_rust_string_lossy(scope);
                Ok(FfiValue::CString(std::ffi::CString::new(s.as_str()).map_err(|_| "null byte in string")?))
            }
        }
        FfiType::Buffer => {
            if let Ok(view) = v8::Local::<v8::ArrayBufferView>::try_from(val) {
                let len = view.byte_length();
                let mut buf = vec![0u8; len];
                view.copy_contents(&mut buf);
                Ok(FfiValue::Buffer(buf))
            } else {
                Err("expected Uint8Array or ArrayBufferView".to_string())
            }
        }
        FfiType::Struct(st) => {
            if !val.is_object() { return Err("expected object for struct".to_string()); }
            let obj = v8::Local::<v8::Object>::try_from(val).map_err(|_| "expected object")?;
            let mut fields = Vec::new();
            for (name, field_type) in &st.fields {
                let key = v8::String::new(scope, name).ok_or(format!("field '{}'", name))?;
                let field_val = obj.get(scope, key.into()).ok_or(format!("missing field '{}'", name))?;
                let fv = marshal_v8_to_ffi(scope, field_val, field_type)?;
                fields.push((name.clone(), fv));
            }
            ffi_runtime::marshal_struct(&fields, st).map(FfiValue::Struct)
        }
    }
}

fn marshal_ffi_to_v8<'s>(scope: &mut v8::HandleScope<'s>, val: &FfiValue, ft: &FfiType) -> v8::Local<'s, v8::Value> {
    match val {
        FfiValue::Void => v8::undefined(scope).into(),
        FfiValue::I8(v) => v8::Integer::new(scope, *v as i32).into(),
        FfiValue::I16(v) => v8::Integer::new(scope, *v as i32).into(),
        FfiValue::I32(v) => v8::Integer::new(scope, *v).into(),
        FfiValue::I64(v) => v8::BigInt::new_from_i64(scope, *v).into(),
        FfiValue::U8(v) => v8::Integer::new_from_unsigned(scope, *v as u32).into(),
        FfiValue::U16(v) => v8::Integer::new_from_unsigned(scope, *v as u32).into(),
        FfiValue::U32(v) => v8::Integer::new_from_unsigned(scope, *v).into(),
        FfiValue::U64(v) => v8::BigInt::new_from_u64(scope, *v).into(),
        FfiValue::F32(v) => v8::Number::new(scope, *v as f64).into(),
        FfiValue::F64(v) => v8::Number::new(scope, *v).into(),
        FfiValue::Bool(v) => v8::Boolean::new(scope, *v).into(),
        FfiValue::Pointer(v) => v8::BigInt::new_from_u64(scope, *v as u64).into(),
        FfiValue::CString(s) => {
            let rs = s.to_str().unwrap_or("");
            v8::String::new(scope, rs).unwrap().into()
        }
        FfiValue::Buffer(b) => {
            let store = v8::ArrayBuffer::new_backing_store_from_vec(b.clone()).make_shared();
            let ab = v8::ArrayBuffer::with_backing_store(scope, &store);
            let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap();
            ua.into()
        }
        FfiValue::Struct(bytes) => {
            if let FfiType::Struct(st) = ft {
                let fields = ffi_runtime::unmarshal_struct(bytes, st);
                let obj = v8::Object::new(scope);
                for (name, fv) in &fields {
                    let field_type = st.fields.iter().find(|(n, _)| n == name).map(|(_, t)| t).unwrap();
                    let key = v8::String::new(scope, name).unwrap();
                    let v8_val = marshal_ffi_to_v8(scope, fv, field_type);
                    obj.set(scope, key.into(), v8_val);
                }
                obj.into()
            } else {
                v8::undefined(scope).into()
            }
        }
    }
}

