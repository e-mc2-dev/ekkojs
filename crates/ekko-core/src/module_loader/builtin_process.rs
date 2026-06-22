// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



use super::extract_bytes;
use std::sync::Arc;
use crate::ffi::generated::process_api;

pub(super) fn process_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    set_export_fn!(scope, module, "exec", process_exec);
    set_export_fn!(scope, module, "spawn", process_spawn);
    Some(v8::undefined(scope).into())
}

fn get_process_api(scope: &mut v8::HandleScope) -> Option<Arc<process_api::Api>> {
    scope.get_slot::<Arc<process_api::Api>>().cloned()
}

pub fn process_exec(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "process");
    let cmd = args.get(0).to_rust_string_lossy(scope);
    let args_arr = if args.length() > 1 && !args.get(1).is_undefined() {
        match v8::json::stringify(scope, args.get(1)) {
            Some(s) => s.to_rust_string_lossy(scope),
            None => "[]".to_string(),
        }
    } else { "[]".to_string() };
    let (cwd, env_json, timeout) = if args.length() > 2 && args.get(2).is_object() {
        let opts = v8::Local::<v8::Object>::try_from(args.get(2)).unwrap();
        let cwd_key = v8::String::new(scope, "cwd").unwrap();
        let cwd_val = opts.get(scope, cwd_key.into())
            .filter(|v| v.is_string())
            .map(|v| v.to_rust_string_lossy(scope))
            .unwrap_or_default();
        let env_key = v8::String::new(scope, "env").unwrap();
        let env_val = opts.get(scope, env_key.into())
            .filter(|v| v.is_object() && !v.is_null() && !v.is_undefined())
            .and_then(|v| v8::json::stringify(scope, v).map(|s| s.to_rust_string_lossy(scope)))
            .unwrap_or_else(|| "{}".to_string());
        let to_key = v8::String::new(scope, "timeout").unwrap();
        let to_val = opts.get(scope, to_key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(0);
        (cwd_val, env_val, to_val)
    } else { (String::new(), "{}".to_string(), 0) };

    let api = match get_process_api(scope) { Some(a) => a, None => { fs_throw!(scope, "process: .NET library not loaded"); return; } };

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

    tokio::spawn(async move {
        let result = api.process_exec(&cmd, &args_arr, &cwd, &env_json, timeout).await;
        let _ = tx.send(crate::ops::async_state::AsyncCompletion {
            id,
            result: match result {
                Ok(json) => Ok(json),
                Err(e) => Err(e),
            },
        }).await;
        notify.notify_one();
    });
}

macro_rules! bind_method {
    ($scope:expr, $obj:expr, $name:expr, $cb:expr) => {{
        let k = v8::String::new($scope, $name).unwrap();
        let f = v8::Function::new($scope, $cb).unwrap();
        $obj.set($scope, k.into(), f.into());
    }};
}

fn this_handle(scope: &mut v8::HandleScope, args: &v8::FunctionCallbackArguments) -> i32 {
    let this = args.this();
    let k = v8::String::new(scope, "_handle").unwrap();
    this.get(scope, k.into()).and_then(|v| v.int32_value(scope)).unwrap_or(0)
}

pub fn process_spawn(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "process");
    let cmd = args.get(0).to_rust_string_lossy(scope);
    let args_arr = if args.length() > 1 && !args.get(1).is_undefined() {
        match v8::json::stringify(scope, args.get(1)) {
            Some(s) => s.to_rust_string_lossy(scope),
            None => "[]".to_string(),
        }
    } else { "[]".to_string() };
    let (cwd, env_json) = if args.length() > 2 && args.get(2).is_object() {
        let opts = v8::Local::<v8::Object>::try_from(args.get(2)).unwrap();
        let cwd_key = v8::String::new(scope, "cwd").unwrap();
        let cwd_val = opts.get(scope, cwd_key.into())
            .filter(|v| v.is_string())
            .map(|v| v.to_rust_string_lossy(scope))
            .unwrap_or_default();
        let env_key = v8::String::new(scope, "env").unwrap();
        let env_val = opts.get(scope, env_key.into())
            .filter(|v| v.is_object() && !v.is_null() && !v.is_undefined())
            .and_then(|v| v8::json::stringify(scope, v).map(|s| s.to_rust_string_lossy(scope)))
            .unwrap_or_else(|| "{}".to_string());
        (cwd_val, env_val)
    } else { (String::new(), "{}".to_string()) };

    let api = match get_process_api(scope) { Some(a) => a, None => { fs_throw!(scope, "process: .NET library not loaded"); return; } };

    match api.process_spawn(&cmd, &args_arr, &cwd, &env_json) {
        Ok(handle) => {
            
            if let Some(ctr) = scope.get_slot::<Arc<std::sync::atomic::AtomicUsize>>().cloned() {
                ctr.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            }

            
            
            let real_pid = api.process_spawnPid(handle).unwrap_or(handle);
            let obj = v8::Object::new(scope);
            let hk = v8::String::new(scope, "_handle").unwrap();
            let pk = v8::String::new(scope, "pid").unwrap();
            let hv = v8::Integer::new(scope, handle);
            let pv = v8::Integer::new(scope, real_pid);
            obj.set(scope, hk.into(), hv.into());
            obj.set(scope, pk.into(), pv.into());
            bind_method!(scope, obj, "write", process_spawn_write);
            bind_method!(scope, obj, "closeStdin", process_spawn_close_stdin);
            bind_method!(scope, obj, "kill", process_spawn_kill);
            bind_method!(scope, obj, "onStdout", process_spawn_on_stdout);
            bind_method!(scope, obj, "onStderr", process_spawn_on_stderr);
            bind_method!(scope, obj, "onExit", process_spawn_on_exit);
            rv.set(obj.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn process_spawn_write(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let handle = this_handle(scope, &args);
    let data = extract_bytes(scope, args.get(0));
    let api = match get_process_api(scope) { Some(a) => a, None => { fs_throw!(scope, "process: .NET library not loaded"); return; } };
    if let Err(e) = api.process_spawnWrite(handle, &data) { fs_throw!(scope, e); }
}

pub fn process_spawn_close_stdin(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let handle = this_handle(scope, &args);
    let api = match get_process_api(scope) { Some(a) => a, None => { fs_throw!(scope, "process: .NET library not loaded"); return; } };
    if let Err(e) = api.process_spawnCloseStdin(handle) { fs_throw!(scope, e); }
}

pub fn process_spawn_kill(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let handle = this_handle(scope, &args);
    let api = match get_process_api(scope) { Some(a) => a, None => { fs_throw!(scope, "process: .NET library not loaded"); return; } };
    if let Err(e) = api.process_spawnKill(handle) { fs_throw!(scope, e); }
}

fn register_child_cb(scope: &mut v8::HandleScope, args: &v8::FunctionCallbackArguments, kind: u8) {
    let handle = this_handle(scope, args);
    let cb_val = args.get(0);
    if !cb_val.is_function() { return; }
    let func = v8::Local::<v8::Function>::try_from(cb_val).unwrap();
    let global = v8::Global::new(scope, func);
    let Some(reg) = scope.get_slot::<crate::engine::v8_runtime::ProcessCbRegistry>().cloned() else { return; };
    
    let latched_exit = {
        let mut map = reg.borrow_mut();
        let entry = map.entry(handle).or_default();
        match kind {
            0 => { entry.stdout = Some(global.clone()); None }
            1 => { entry.stderr = Some(global.clone()); None }
            _ => { entry.exit = Some(global.clone()); entry.exited }
        }
    };

    
    if kind == 2 {
        if let Some(code) = latched_exit {
            let f = v8::Local::new(scope, &global);
            let arg = v8::Integer::new(scope, code).into();
            let undef = v8::undefined(scope).into();
            f.call(scope, undef, &[arg]);
            scope.perform_microtask_checkpoint();
            reg.borrow_mut().remove(&handle);
        }
    }
}

pub fn process_spawn_on_stdout(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    register_child_cb(scope, &args, 0);
}

pub fn process_spawn_on_stderr(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    register_child_cb(scope, &args, 1);
}

pub fn process_spawn_on_exit(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    register_child_cb(scope, &args, 2);
}
