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
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};

use crate::engine::channel::ChannelRegistry;
use crate::ops::async_state::{AsyncCompletion, AsyncState};

macro_rules! make_channel_obj {
    ($scope:expr, $id:expr) => {{
        let obj = v8::Object::new($scope);
        let id_key = v8::String::new($scope, "id").unwrap();
        let id_val = v8::Integer::new($scope, $id as i32);
        obj.set($scope, id_key.into(), id_val.into());

        let k = v8::String::new($scope, "send").unwrap();
        let f = v8::Function::new($scope, channel_send).unwrap();
        obj.set($scope, k.into(), f.into());

        let k = v8::String::new($scope, "recv").unwrap();
        let f = v8::Function::new($scope, channel_recv).unwrap();
        obj.set($scope, k.into(), f.into());

        let k = v8::String::new($scope, "trySend").unwrap();
        let f = v8::Function::new($scope, channel_try_send).unwrap();
        obj.set($scope, k.into(), f.into());

        let k = v8::String::new($scope, "tryRecv").unwrap();
        let f = v8::Function::new($scope, channel_try_recv).unwrap();
        obj.set($scope, k.into(), f.into());

        let k = v8::String::new($scope, "close").unwrap();
        let f = v8::Function::new($scope, channel_close).unwrap();
        obj.set($scope, k.into(), f.into());

        let k = v8::String::new($scope, "toJSON").unwrap();
        let f = v8::Function::new($scope, channel_to_json).unwrap();
        obj.set($scope, k.into(), f.into());

        let iter_sym = v8::Symbol::get_async_iterator($scope);
        if let Some(iter_fn) = crate::module_loader::get_channel_iter_fn($scope) {
            if iter_fn.is_function() {
                obj.set($scope, iter_sym.into(), iter_fn);
            }
        }

        obj
    }};
}

macro_rules! ch_id {
    ($scope:expr, $this:expr) => {{
        let k = v8::String::new($scope, "id").unwrap();
        $this
            .get($scope, k.into())
            .and_then(|v| v.int32_value($scope))
            .unwrap_or(0) as u32
    }};
}

fn channel_to_json(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let this = args.this();
    let id = ch_id!(scope, this);
    let obj = v8::Object::new(scope);
    let marker_key = v8::String::new(scope, "__ekko_ch").unwrap();
    let id_val = v8::Integer::new(scope, id as i32);
    obj.set(scope, marker_key.into(), id_val.into());
    rv.set(obj.into());
}

pub fn ekko_channel_new(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let capacity = if args.length() > 0 && args.get(0).is_object() {
        let opts = v8::Local::<v8::Object>::try_from(args.get(0)).unwrap();
        let cap_key = v8::String::new(scope, "capacity").unwrap();
        opts.get(scope, cap_key.into())
            .and_then(|v| v.number_value(scope))
            .map(|n| n as usize)
            .unwrap_or(64)
    } else {
        64
    };

    let registry = scope
        .get_slot::<Arc<Mutex<ChannelRegistry>>>()
        .unwrap()
        .clone();
    let id = registry.lock().unwrap().create(capacity);
    let obj = make_channel_obj!(scope, id);
    rv.set(obj.into());
}

pub fn ekko_channel_from_id(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let id = args.get(0).int32_value(scope).unwrap_or(0) as u32;
    let obj = make_channel_obj!(scope, id);
    rv.set(obj.into());
}

fn parse_channel_msg<'s>(scope: &mut v8::HandleScope<'s>, msg: &str) -> v8::Local<'s, v8::Value> {
    if crate::module_loader::builtin_json::json_str_too_deep(msg) {
        return v8::undefined(scope).into();
    }
    match v8::String::new(scope, msg) {
        Some(s) => v8::json::parse(scope, s).unwrap_or_else(|| v8::undefined(scope).into()),
        None => v8::undefined(scope).into(),
    }
}

fn channel_send(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let this = args.this();
    let id = ch_id!(scope, this);

    let resolver = v8::PromiseResolver::new(scope).unwrap();
    let promise = resolver.get_promise(scope);
    rv.set(promise.into());

    
    
    if crate::module_loader::builtin_json::json_value_too_deep(scope, args.get(0)) {
        let msg = v8::String::new(scope, "channel.send: value nesting exceeds 1000 levels (denial-of-service guard)").unwrap();
        resolver.reject(scope, msg.into());
        return;
    }
    let msg_json = v8::json::stringify(scope, args.get(0))
        .map(|s| s.to_rust_string_lossy(scope))
        .unwrap_or_else(|| "null".to_string());

    let registry = scope
        .get_slot::<Arc<Mutex<ChannelRegistry>>>()
        .unwrap()
        .clone();

    let ch = match registry.lock().unwrap().get(id) {
        Some(ch) => ch,
        None => {
            let msg = v8::String::new(scope, "channel not found").unwrap();
            resolver.reject(scope, msg.into());
            return;
        }
    };

    if ch.closed.load(Ordering::SeqCst) {
        let msg = v8::String::new(scope, "channel is closed").unwrap();
        resolver.reject(scope, msg.into());
        return;
    }

    match ch.tx.try_send(msg_json.clone()) {
        Ok(()) => {
            let undef = v8::undefined(scope);
            resolver.resolve(scope, undef.into());
        }
        Err(tokio::sync::mpsc::error::TrySendError::Full(_)) => {
            let async_state = scope
                .get_slot::<Rc<RefCell<AsyncState>>>()
                .unwrap()
                .clone();
            let mut state = async_state.borrow_mut();
            let (op_id, completion_tx, notify) = state.register(v8::Global::new(scope, resolver), None);
            drop(state);

            let tx = ch.tx.clone();
            std::thread::spawn(move || {
                let _ = tx.blocking_send(msg_json);
                let _ = completion_tx.blocking_send(AsyncCompletion {
                    id: op_id,
                    result: Ok("undefined".to_string()),
                });
                notify.notify_one();
            });
        }
        Err(_) => {
            let msg = v8::String::new(scope, "channel send failed").unwrap();
            resolver.reject(scope, msg.into());
        }
    }
}

fn channel_recv(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let this = args.this();
    let id = ch_id!(scope, this);

    let registry = scope
        .get_slot::<Arc<Mutex<ChannelRegistry>>>()
        .unwrap()
        .clone();

    let resolver = v8::PromiseResolver::new(scope).unwrap();
    let promise = resolver.get_promise(scope);
    rv.set(promise.into());

    let ch = match registry.lock().unwrap().get(id) {
        Some(ch) => ch,
        None => {
            let msg = v8::String::new(scope, "channel not found").unwrap();
            resolver.reject(scope, msg.into());
            return;
        }
    };

    if let Ok(msg) = ch.rx.lock().unwrap().try_recv() {
        let parsed = parse_channel_msg(scope, &msg);
        resolver.resolve(scope, parsed);
        return;
    }

    if ch.closed.load(Ordering::SeqCst) {
        let undef = v8::undefined(scope);
        resolver.resolve(scope, undef.into());
        return;
    }

    let async_state = scope
        .get_slot::<Rc<RefCell<AsyncState>>>()
        .unwrap()
        .clone();
    let mut state = async_state.borrow_mut();
    let (op_id, completion_tx, notify) = state.register(v8::Global::new(scope, resolver), None);
    drop(state);

    let rx = ch.rx.clone();
    let closed = ch.closed.clone();
    std::thread::spawn(move || {
        loop {
            if let Ok(msg) = rx.lock().unwrap().try_recv() {
                let _ = completion_tx.blocking_send(AsyncCompletion {
                    id: op_id,
                    result: Ok(msg),
                });
                notify.notify_one();
                return;
            }
            if closed.load(Ordering::SeqCst) {
                let _ = completion_tx.blocking_send(AsyncCompletion {
                    id: op_id,
                    result: Ok("null".to_string()),
                });
                notify.notify_one();
                return;
            }
            std::thread::sleep(std::time::Duration::from_millis(1));
        }
    });
}

fn channel_try_send(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let this = args.this();
    let id = ch_id!(scope, this);
    
    if crate::module_loader::builtin_json::json_value_too_deep(scope, args.get(0)) {
        let msg = v8::String::new(scope, "channel.trySend: value nesting exceeds 1000 levels (denial-of-service guard)").unwrap();
        scope.throw_exception(msg.into());
        return;
    }
    let msg_json = v8::json::stringify(scope, args.get(0))
        .map(|s| s.to_rust_string_lossy(scope))
        .unwrap_or_else(|| "null".to_string());

    let registry = scope
        .get_slot::<Arc<Mutex<ChannelRegistry>>>()
        .unwrap()
        .clone();

    let ch = match registry.lock().unwrap().get(id) {
        Some(ch) => ch,
        None => {
            rv.set(v8::Boolean::new(scope, false).into());
            return;
        }
    };

    if ch.closed.load(Ordering::SeqCst) {
        rv.set(v8::Boolean::new(scope, false).into());
        return;
    }

    let ok = ch.tx.try_send(msg_json).is_ok();
    rv.set(v8::Boolean::new(scope, ok).into());
}

fn channel_try_recv(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let this = args.this();
    let id = ch_id!(scope, this);

    let registry = scope
        .get_slot::<Arc<Mutex<ChannelRegistry>>>()
        .unwrap()
        .clone();

    let ch = match registry.lock().unwrap().get(id) {
        Some(ch) => ch,
        None => {
            rv.set(v8::undefined(scope).into());
            return;
        }
    };

    match ch.rx.lock().unwrap().try_recv() {
        Ok(msg) => {
            let parsed = parse_channel_msg(scope, &msg);
            rv.set(parsed);
        }
        Err(_) => {
            rv.set(v8::undefined(scope).into());
        }
    }
}

fn channel_close(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let this = args.this();
    let id = ch_id!(scope, this);

    let registry = scope
        .get_slot::<Arc<Mutex<ChannelRegistry>>>()
        .unwrap()
        .clone();
    registry.lock().unwrap().close(id);
}

pub fn ekko_select(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let arr = match v8::Local::<v8::Array>::try_from(args.get(0)) {
        Ok(a) => a,
        Err(_) => {
            let msg = v8::String::new(scope, "Ekko.select expects an array of channels").unwrap();
            scope.throw_exception(msg.into());
            return;
        }
    };

    let len = arr.length();
    let registry = scope
        .get_slot::<Arc<Mutex<ChannelRegistry>>>()
        .unwrap()
        .clone();

    let resolver = v8::PromiseResolver::new(scope).unwrap();
    let promise = resolver.get_promise(scope);
    rv.set(promise.into());

    let mut channel_ids = Vec::new();
    for i in 0..len {
        if let Some(ch_val) = arr.get_index(scope, i) {
            if let Ok(ch_obj) = v8::Local::<v8::Object>::try_from(ch_val) {
                let id = ch_id!(scope, ch_obj);
                channel_ids.push(id);
            }
        }
    }

    {
        let reg = registry.lock().unwrap();
        for (idx, &id) in channel_ids.iter().enumerate() {
            if let Some(ch) = reg.get(id) {
                if let Ok(msg) = ch.rx.lock().unwrap().try_recv() {
                    drop(reg);

                    let value = parse_channel_msg(scope, &msg);
                    let obj = v8::Object::new(scope);
                    let ck = v8::String::new(scope, "channel").unwrap();
                    let cv = v8::Integer::new(scope, idx as i32);
                    obj.set(scope, ck.into(), cv.into());
                    let vk = v8::String::new(scope, "value").unwrap();
                    obj.set(scope, vk.into(), value);
                    resolver.resolve(scope, obj.into());
                    return;
                }
            }
        }
    }

    let async_state = scope
        .get_slot::<Rc<RefCell<AsyncState>>>()
        .unwrap()
        .clone();
    let mut state = async_state.borrow_mut();
    let (op_id, completion_tx, notify) = state.register(v8::Global::new(scope, resolver), None);
    drop(state);

    let registry_clone = registry.clone();
    std::thread::spawn(move || {
        loop {
            let reg = registry_clone.lock().unwrap();
            for (idx, &id) in channel_ids.iter().enumerate() {
                if let Some(ch) = reg.get(id) {
                    if let Ok(msg) = ch.rx.lock().unwrap().try_recv() {
                        drop(reg);
                        let json = format!("{{\"channel\":{},\"value\":{}}}", idx, msg);
                        let _ = completion_tx.blocking_send(AsyncCompletion {
                            id: op_id,
                            result: Ok(json),
                        });
                        notify.notify_one();
                        return;
                    }
                }
            }
            let all_closed = channel_ids.iter().all(|&id| {
                reg.get(id)
                    .map(|ch| ch.closed.load(Ordering::SeqCst))
                    .unwrap_or(true)
            });
            drop(reg);
            if all_closed {
                let _ = completion_tx.blocking_send(AsyncCompletion {
                    id: op_id,
                    result: Ok("null".to_string()),
                });
                notify.notify_one();
                return;
            }
            std::thread::sleep(std::time::Duration::from_millis(1));
        }
    });
}
