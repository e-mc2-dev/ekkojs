// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::cell::RefCell;
use std::rc::Rc;
use std::sync::{Arc, Mutex};

use crate::engine::channel::ChannelRegistry;
use crate::ffi::ffi_runtime::PermissionSet;
use crate::engine::isolate_pool::{ChildTracker, IsolatePool, WorkRequest};
use crate::ops::async_state::{AsyncCompletion, AsyncState};

fn parse_allow_from_v8(scope: &mut v8::HandleScope, allow_val: v8::Local<v8::Value>) -> PermissionSet {
    if allow_val.is_undefined() || allow_val.is_null() {
        return PermissionSet::new();
    }

    if allow_val.is_array() {
        if let Ok(arr) = v8::Local::<v8::Array>::try_from(allow_val) {
            let mut flags = Vec::new();
            for i in 0..arr.length() {
                if let Some(item) = arr.get_index(scope, i) {
                    if item.is_string() {
                        flags.push(item.to_rust_string_lossy(scope));
                    }
                }
            }
            return PermissionSet::from_flags(&flags);
        }
        return PermissionSet::new();
    }
    if let Ok(obj) = v8::Local::<v8::Object>::try_from(allow_val) {
        let mut flags = Vec::new();
        let names = obj.get_own_property_names(scope, Default::default());
        if let Some(names) = names {
            for i in 0..names.length() {
                let key = names.get_index(scope, i).unwrap();
                let key_str = key.to_rust_string_lossy(scope);
                let val = obj.get(scope, key).unwrap();
                if val.is_boolean() && val.boolean_value(scope) {
                    flags.push(key_str);
                } else if val.is_array() {
                    if let Ok(arr) = v8::Local::<v8::Array>::try_from(val) {
                        for j in 0..arr.length() {
                            if let Some(item) = arr.get_index(scope, j) {
                                let pattern = item.to_rust_string_lossy(scope);
                                flags.push(format!("{}:{}", key_str, pattern));
                            }
                        }
                    }
                } else if val.is_string() {
                    let pattern = val.to_rust_string_lossy(scope);
                    flags.push(format!("{}:{}", key_str, pattern));
                }
            }
        }
        PermissionSet::from_flags(&flags)
    } else {
        PermissionSet::new()
    }
}

pub fn ekko_spawn(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let func = args.get(0);
    let fn_source = func
        .to_string(scope)
        .unwrap()
        .to_rust_string_lossy(scope);

    let (args_json, timeout_ms, heap_limit, child_perms) = if args.length() > 1 && !args.get(1).is_undefined() {
        let second = args.get(1);
        if second.is_array() {
            match json_stringify(scope, second) { Some(j) => (j, None, None, None), None => return }
        } else if second.is_object() && !second.is_null() {
            let opts = v8::Local::<v8::Object>::try_from(second).unwrap();

            let args_key = v8::String::new(scope, "args").unwrap();
            let args_val = match opts.get(scope, args_key.into()).filter(|v| !v.is_undefined()) {
                Some(v) => match json_stringify(scope, v) { Some(j) => j, None => return },
                None => "[]".to_string(),
            };

            let timeout_key = v8::String::new(scope, "timeout").unwrap();
            let timeout = opts.get(scope, timeout_key.into())
                .filter(|v| !v.is_undefined() && !v.is_null_or_undefined())
                .and_then(|v| v.number_value(scope))
                .filter(|n| !n.is_nan() && *n > 0.0)
                .map(|n| n as u64);

            let heap_key = v8::String::new(scope, "heapLimit").unwrap();
            let heap = opts.get(scope, heap_key.into())
                .filter(|v| !v.is_undefined() && !v.is_null_or_undefined())
                .and_then(|v| v.number_value(scope))
                .filter(|n| !n.is_nan() && *n > 0.0)
                .map(|n| n as usize);

            let allow_key = v8::String::new(scope, "allow").unwrap();
            let allow_perms = opts.get(scope, allow_key.into())
                .filter(|v| !v.is_undefined() && !v.is_null())
                .map(|v| parse_allow_from_v8(scope, v));

            (args_val, timeout, heap, allow_perms)
        } else {
            match json_stringify(scope, second) { Some(j) => (j, None, None, None), None => return }
        }
    } else {
        ("[]".to_string(), None, None, None)
    };

    let parent_perms = crate::engine::v8_runtime::get_context_permissions();
    let spawn_perms = match child_perms {
        Some(requested) => {
            match parent_perms.intersect(&requested) {
                Ok(p) => p,
                Err(e) => {
                    let m = v8::String::new(scope, &e).unwrap_or_else(|| v8::String::empty(scope));
                    scope.throw_exception(m.into());
                    return;
                }
            }
        }
        None => PermissionSet::new(),
    };

    let resolver = v8::PromiseResolver::new(scope).unwrap();
    let promise = resolver.get_promise(scope);
    rv.set(promise.into());

    let parent_stack = {
        let code = v8::String::new(scope, "new Error().stack").unwrap();
        v8::Script::compile(scope, code, None)
            .and_then(|s| s.run(scope))
            .map(|v| v.to_rust_string_lossy(scope))
            .unwrap_or_default()
    };

    let async_state = scope
        .get_slot::<Rc<RefCell<AsyncState>>>()
        .unwrap()
        .clone();
    let mut state = async_state.borrow_mut();
    let (id, completion_tx, notify) = state.register(v8::Global::new(scope, resolver), Some(parent_stack));
    drop(state);

    let pool = scope
        .get_slot::<Arc<Mutex<IsolatePool>>>()
        .unwrap()
        .clone();
    let registry = scope
        .get_slot::<Arc<Mutex<ChannelRegistry>>>()
        .unwrap()
        .clone();
    let child_tracker = scope
        .get_slot::<Arc<Mutex<ChildTracker>>>()
        .unwrap()
        .clone();

    std::thread::spawn(move || {
        let result = {
            let mut p = pool.lock().unwrap();
            match p.claim() {
                Ok((worker_id, tx)) => {
                    drop(p);
                    let (respond_tx, respond_rx) = tokio::sync::oneshot::channel();
                    if tx
                        .blocking_send(WorkRequest {
                            fn_source,
                            args_json,
                            respond: respond_tx,
                            pool: pool.clone(),
                            registry: registry.clone(),
                            timeout_ms,
                            heap_limit,
                            parent_tracker: child_tracker.clone(),
                            permissions: spawn_perms,
                        })
                        .is_err()
                    {
                        Err("worker send failed".to_string())
                    } else {
                        match respond_rx.blocking_recv() {
                            Ok(r) => {
                                pool.lock().unwrap().release(worker_id);
                                r
                            }
                            Err(e) => Err(e.to_string()),
                        }
                    }
                }
                Err(e) => Err(e),
            }
        };

        let _ = completion_tx.blocking_send(AsyncCompletion {
            id,
            result: match result {
                Ok(json) => Ok(json),
                Err(e) => Err(e),
            },
        });
        notify.notify_one();
    });
}

pub fn ekko_parallel(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let arr = match v8::Local::<v8::Array>::try_from(args.get(0)) {
        Ok(a) => a,
        Err(_) => {
            let msg = v8::String::new(scope, "Ekko.parallel expects an array of functions").unwrap();
            scope.throw_exception(msg.into());
            return;
        }
    };

    let len = arr.length();
    let mut fn_sources = Vec::with_capacity(len as usize);
    for i in 0..len {
        let func = arr.get_index(scope, i).unwrap();
        fn_sources.push(func.to_rust_string_lossy(scope));
    }

    
    let mut args_jsons: Vec<String> = vec!["[]".to_string(); len as usize];

    
    
    let (par_timeout, par_heap, child_perms) = if args.length() > 1 && args.get(1).is_object() && !args.get(1).is_null() {
        let opts = v8::Local::<v8::Object>::try_from(args.get(1)).unwrap();
        let tk = v8::String::new(scope, "timeout").unwrap();
        let timeout = opts.get(scope, tk.into())
            .filter(|v| !v.is_undefined() && !v.is_null_or_undefined())
            .and_then(|v| v.number_value(scope))
            .filter(|n| !n.is_nan() && *n > 0.0)
            .map(|n| n as u64);
        let hk = v8::String::new(scope, "heapLimit").unwrap();
        let heap = opts.get(scope, hk.into())
            .filter(|v| !v.is_undefined() && !v.is_null_or_undefined())
            .and_then(|v| v.number_value(scope))
            .filter(|n| !n.is_nan() && *n > 0.0)
            .map(|n| n as usize);
        let ak = v8::String::new(scope, "allow").unwrap();
        let allow = opts.get(scope, ak.into())
            .filter(|v| !v.is_undefined() && !v.is_null())
            .map(|v| parse_allow_from_v8(scope, v));

        let argsk = v8::String::new(scope, "args").unwrap();
        if let Some(av) = opts.get(scope, argsk.into()).filter(|v| !v.is_undefined() && !v.is_null()) {
            if let Ok(aarr) = v8::Local::<v8::Array>::try_from(av) {
                let n = len.min(aarr.length());
                for i in 0..n {
                    if let Some(el) = aarr.get_index(scope, i).filter(|v| !v.is_undefined()) {
                        match json_stringify(scope, el) { Some(j) => args_jsons[i as usize] = j, None => return }
                    }
                }
            }
        }
        (timeout, heap, allow)
    } else {
        (None, None, None)
    };

    let parent_perms = crate::engine::v8_runtime::get_context_permissions();
    let parallel_perms = match child_perms {
        Some(requested) => match parent_perms.intersect(&requested) {
            Ok(p) => p,
            Err(e) => {
                let m = v8::String::new(scope, &e).unwrap_or_else(|| v8::String::empty(scope));
                scope.throw_exception(m.into());
                return;
            }
        },
        None => PermissionSet::new(),
    };

    let resolver = v8::PromiseResolver::new(scope).unwrap();
    let promise = resolver.get_promise(scope);
    rv.set(promise.into());

    let async_state = scope
        .get_slot::<Rc<RefCell<AsyncState>>>()
        .unwrap()
        .clone();
    let mut state = async_state.borrow_mut();
    let (id, completion_tx, notify) = state.register(v8::Global::new(scope, resolver), None);
    drop(state);

    let pool = scope
        .get_slot::<Arc<Mutex<IsolatePool>>>()
        .unwrap()
        .clone();
    let registry = scope
        .get_slot::<Arc<Mutex<ChannelRegistry>>>()
        .unwrap()
        .clone();
    let child_tracker = scope
        .get_slot::<Arc<Mutex<ChildTracker>>>()
        .unwrap()
        .clone();

    std::thread::spawn(move || {
        let mut handles = Vec::new();

        for (fn_src, args_json) in fn_sources.into_iter().zip(args_jsons.into_iter()) {
            let pool = pool.clone();
            let registry = registry.clone();
            let child_tracker = child_tracker.clone();
            let perms = parallel_perms.clone();
            let handle = std::thread::spawn(move || {
                let mut p = pool.lock().unwrap();
                match p.claim() {
                    Ok((worker_id, tx)) => {
                        drop(p);
                        let (respond_tx, respond_rx) = tokio::sync::oneshot::channel();
                        if tx
                            .blocking_send(WorkRequest {
                                fn_source: fn_src,
                                args_json,
                                respond: respond_tx,
                                pool: pool.clone(),
                                registry: registry.clone(),
                                timeout_ms: par_timeout,
                                heap_limit: par_heap,
                                parent_tracker: child_tracker.clone(),
                                permissions: perms,
                            })
                            .is_err()
                        {
                            return Err("worker send failed".to_string());
                        }
                        match respond_rx.blocking_recv() {
                            Ok(r) => {
                                pool.lock().unwrap().release(worker_id);
                                r
                            }
                            Err(e) => Err(e.to_string()),
                        }
                    }
                    Err(e) => Err(e),
                }
            });
            handles.push(handle);
        }

        let mut results = Vec::new();
        let mut first_error: Option<String> = None;
        for h in handles {
            match h.join() {
                Ok(Ok(v)) => results.push(v),
                Ok(Err(e)) => {
                    if first_error.is_none() { first_error = Some(e.clone()); }
                    results.push(format!("\"error: {}\"", e.replace('"', "\\\"")));
                }
                Err(_) => {
                    if first_error.is_none() { first_error = Some("worker panicked".to_string()); }
                    results.push("\"error: worker panicked\"".to_string());
                }
            }
        }

        let json_arr = format!("[{}]", results.join(","));

        let _ = completion_tx.blocking_send(AsyncCompletion {
            id,
            result: if let Some(err) = first_error {
                Err(err)
            } else {
                Ok(json_arr)
            },
        });
        notify.notify_one();
    });
}

fn json_stringify(scope: &mut v8::HandleScope, value: v8::Local<v8::Value>) -> Option<String> {
    if crate::module_loader::builtin_json::json_value_too_deep(scope, value) {
        let m = v8::String::new(scope, "Ekko.spawn: args nesting exceeds 1000 levels (denial-of-service guard)").unwrap();
        scope.throw_exception(m.into());
        return None;
    }
    Some(match v8::json::stringify(scope, value) {
        Some(s) => s.to_rust_string_lossy(scope),
        None => "[]".to_string(),
    })
}
