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
use crate::ffi::generated::net_api;

pub(super) fn net_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let tcp = v8::Object::new(scope);
    obj_fn!(scope, tcp, "connect", net_tcp_connect);
    obj_fn!(scope, tcp, "write", net_tcp_write);
    obj_fn!(scope, tcp, "read", net_tcp_read);
    obj_fn!(scope, tcp, "close", net_tcp_close);
    obj_fn!(scope, tcp, "listen", crate::engine::v8_runtime::net_tcp_listen);
    obj_fn!(scope, tcp, "stopServer", crate::engine::v8_runtime::net_tcp_server_close);
    export_obj(scope, module, "tcp", tcp);
    let udp = v8::Object::new(scope);
    obj_fn!(scope, udp, "createSocket", net_udp_create);
    obj_fn!(scope, udp, "send", net_udp_send);
    obj_fn!(scope, udp, "recv", net_udp_recv);
    obj_fn!(scope, udp, "close", net_udp_close);
    export_obj(scope, module, "udp", udp);
    let dns = v8::Object::new(scope);
    obj_fn!(scope, dns, "resolve", net_dns_resolve);
    export_obj(scope, module, "dns", dns);
    Some(v8::undefined(scope).into())
}

fn get_net_api(scope: &mut v8::HandleScope) -> Option<Arc<net_api::Api>> {
    scope.get_slot::<Arc<net_api::Api>>().cloned()
}

pub fn net_tcp_connect(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let host = args.get(0).to_rust_string_lossy(scope);
    check_perm!(scope, "net", &host);
    let port = args.get(1).int32_value(scope).unwrap_or(0);
    let api = match get_net_api(scope) { Some(a) => a, None => { fs_throw!(scope, "net: .NET library not loaded"); return; } };

    let resolver = v8::PromiseResolver::new(scope).unwrap();
    let promise = resolver.get_promise(scope);
    rv.set(promise.into());
    let async_state = scope.get_slot::<std::rc::Rc<std::cell::RefCell<crate::ops::async_state::AsyncState>>>().unwrap().clone();
    let mut state = async_state.borrow_mut();
    let (id, tx, notify) = state.register(v8::Global::new(scope, resolver), None);
    drop(state);

    tokio::spawn(async move {
        let result = api.net_tcpConnect(&host, port).await;
        let _ = tx.send(crate::ops::async_state::AsyncCompletion { id, result: result.map(|h| h.to_string()).map_err(|e| e) }).await;
        notify.notify_one();
    });
}

pub fn net_tcp_write(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    check_perm!(scope, "net");
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    let data = extract_bytes(scope, args.get(1));
    if let Some(api) = get_net_api(scope) { let _ = api.net_tcpWrite(handle, &data); }
}

pub fn net_tcp_read(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "net");
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    let max = if args.length() > 1 { args.get(1).int32_value(scope).unwrap_or(4096) } else { 4096 };
    let api = match get_net_api(scope) { Some(a) => a, None => { fs_throw!(scope, "net: .NET library not loaded"); return; } };

    let resolver = v8::PromiseResolver::new(scope).unwrap();
    let promise = resolver.get_promise(scope);
    rv.set(promise.into());
    let async_state = scope.get_slot::<std::rc::Rc<std::cell::RefCell<crate::ops::async_state::AsyncState>>>().unwrap().clone();
    let mut state = async_state.borrow_mut();
    let (id, tx, notify) = state.register(v8::Global::new(scope, resolver), None);
    drop(state);

    tokio::spawn(async move {
        let result = api.net_tcpRead(handle, max).await;
        let completion = match result {
            Ok(bytes) => { let arr = format!("[{}]", bytes.iter().map(|b| b.to_string()).collect::<Vec<_>>().join(",")); Ok(arr) }
            Err(e) => Err(e),
        };
        let _ = tx.send(crate::ops::async_state::AsyncCompletion { id, result: completion }).await;
        notify.notify_one();
    });
}

pub fn net_tcp_close(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    check_perm!(scope, "net");
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    if let Some(api) = get_net_api(scope) { let _ = api.net_tcpClose(handle); }
}

pub fn net_udp_create(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "net");
    let port = if args.length() > 0 { args.get(0).int32_value(scope).unwrap_or(0) } else { 0 };
    let api = match get_net_api(scope) { Some(a) => a, None => { fs_throw!(scope, "net: .NET library not loaded"); return; } };
    match api.net_udpCreate(port) {
        Ok(handle) => rv.set(v8::Integer::new(scope, handle).into()),
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn net_udp_send(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {

    
    let host = args.get(2).to_rust_string_lossy(scope);
    check_perm!(scope, "net", &host);
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    let data = extract_bytes(scope, args.get(1));
    let port = args.get(3).int32_value(scope).unwrap_or(0);
    if let Some(api) = get_net_api(scope) { let _ = api.net_udpSend(handle, &data, &host, port); }
}

pub fn net_udp_recv(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "net");
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    let api = match get_net_api(scope) { Some(a) => a, None => { fs_throw!(scope, "net: .NET library not loaded"); return; } };

    let resolver = v8::PromiseResolver::new(scope).unwrap();
    let promise = resolver.get_promise(scope);
    rv.set(promise.into());
    let async_state = scope.get_slot::<std::rc::Rc<std::cell::RefCell<crate::ops::async_state::AsyncState>>>().unwrap().clone();
    let mut state = async_state.borrow_mut();
    let (id, tx, notify) = state.register(v8::Global::new(scope, resolver), None);
    drop(state);

    tokio::spawn(async move {
        let result = api.net_udpRecv(handle).await;
        let _ = tx.send(crate::ops::async_state::AsyncCompletion { id, result }).await;
        notify.notify_one();
    });
}

pub fn net_udp_close(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    check_perm!(scope, "net");
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    if let Some(api) = get_net_api(scope) { let _ = api.net_udpClose(handle); }
}

pub fn net_dns_resolve(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let hostname = args.get(0).to_rust_string_lossy(scope);
    check_perm!(scope, "net", &hostname);
    let api = match get_net_api(scope) { Some(a) => a, None => { fs_throw!(scope, "net: .NET library not loaded"); return; } };

    let resolver = v8::PromiseResolver::new(scope).unwrap();
    let promise = resolver.get_promise(scope);
    rv.set(promise.into());
    let async_state = scope.get_slot::<std::rc::Rc<std::cell::RefCell<crate::ops::async_state::AsyncState>>>().unwrap().clone();
    let mut state = async_state.borrow_mut();
    let (id, tx, notify) = state.register(v8::Global::new(scope, resolver), None);
    drop(state);

    tokio::spawn(async move {
        let result = api.net_dnsResolve(&hostname).await;
        let _ = tx.send(crate::ops::async_state::AsyncCompletion { id, result }).await;
        notify.notify_one();
    });
}
