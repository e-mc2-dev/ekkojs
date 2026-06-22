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
use crate::ffi::generated::web_api;


pub(super) fn web_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let global = scope.get_current_context().global(scope);
    let fetch_key = v8::String::new(scope, "fetch").unwrap();
    if let Some(fetch_fn) = global.get(scope, fetch_key.into()) {
        let _ = module.set_synthetic_module_export(scope, fetch_key, fetch_fn);
    }
    if let Some(web_ref) = scope.get_slot::<crate::engine::v8_runtime::WebExports>() {
        let exports_global = web_ref.0.clone();
        let exports_local = v8::Local::new(scope, exports_global);
        if let Ok(exports_obj) = v8::Local::<v8::Object>::try_from(exports_local) {
            for name in ["createServer", "WebSocket", "cors", "rateLimit", "helmet",
                "safePath", "bodyLimit", "csrf", "errorHandler", "timeout",
                "httpsRedirect", "secureCookies", "requestId", "ipFilter", "validateContentType"] {
                let k = v8::String::new(scope, name).unwrap();
                if let Some(f) = exports_obj.get(scope, k.into()) {
                    let _ = module.set_synthetic_module_export(scope, k, f);
                }
            }
        }
    }
    Some(v8::undefined(scope).into())
}


fn get_web_api(scope: &mut v8::HandleScope) -> Option<Arc<web_api::Api>> {
    scope.get_slot::<Arc<web_api::Api>>().cloned()
}


pub fn web_fetch(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let url = args.get(0).to_rust_string_lossy(scope);
    check_perm!(scope, "net", &url);

    let mut method = "GET".to_string();
    let mut headers_json = "{}".to_string();
    let mut body: Vec<u8> = vec![];
    let mut redirect = "follow".to_string();

    if args.length() > 1 && args.get(1).is_object() && !args.get(1).is_null() {
        let opts = v8::Local::<v8::Object>::try_from(args.get(1)).unwrap();

        let mk = v8::String::new(scope, "method").unwrap();
        if let Some(v) = opts.get(scope, mk.into()) {
            if v.is_string() { method = v.to_rust_string_lossy(scope); }
        }

        let rk = v8::String::new(scope, "redirect").unwrap();
        if let Some(v) = opts.get(scope, rk.into()) {
            if v.is_string() { redirect = v.to_rust_string_lossy(scope); }
        }

        let hk = v8::String::new(scope, "headers").unwrap();
        if let Some(v) = opts.get(scope, hk.into()) {
            if v.is_object() && !v.is_null() {
                if let Some(json) = v8::json::stringify(scope, v) {
                    headers_json = json.to_rust_string_lossy(scope);
                }
            }
        }

        let bk = v8::String::new(scope, "body").unwrap();
        if let Some(v) = opts.get(scope, bk.into()) {
            if !v.is_undefined() && !v.is_null() {
                body = extract_bytes(scope, v);
            }
        }
    }

    let api = match get_web_api(scope) {
        Some(a) => a,
        None => { fs_throw!(scope, "web: .NET library not loaded"); return; }
    };

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
        let result = api.web_fetch(&url, &method, &headers_json, &body, &redirect).await;
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


pub fn web_fetch_body_text(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    let api = match get_web_api(scope) {
        Some(a) => a,
        None => { fs_throw!(scope, "web: .NET library not loaded"); return; }
    };

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
        let result = api.web_fetchBodyText(handle).await;
        let _ = tx.send(crate::ops::async_state::AsyncCompletion {
            id,
            result: match result {
                Ok(s) => Ok(format!("\"{}\"", s.replace('\\', "\\\\").replace('"', "\\\"").replace('\n', "\\n").replace('\r', "\\r"))),
                Err(e) => Err(e),
            },
        }).await;
        notify.notify_one();
    });
}


pub fn web_fetch_body_bytes(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    let api = match get_web_api(scope) {
        Some(a) => a,
        None => { fs_throw!(scope, "web: .NET library not loaded"); return; }
    };

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
        let result = api.web_fetchBodyBytes(handle).await;
        let completion = match result {
            Ok(bytes) => {
                let json_arr = format!("[{}]", bytes.iter().map(|b| b.to_string()).collect::<Vec<_>>().join(","));
                Ok(json_arr)
            }
            Err(e) => Err(e),
        };
        let _ = tx.send(crate::ops::async_state::AsyncCompletion { id, result: completion }).await;
        notify.notify_one();
    });
}


pub fn web_fetch_dispose(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let handle = args.get(0).int32_value(scope).unwrap_or(0);
    if let Some(api) = get_web_api(scope) {
        let _ = api.web_fetchDispose(handle);
    }
}


pub fn web_ws_connect_client(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let url = args.get(0).to_rust_string_lossy(scope);
    check_perm!(scope, "net", &url);
    let api = match get_web_api(scope) {
        Some(a) => a,
        None => { fs_throw!(scope, "web: .NET library not loaded"); return; }
    };
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
        let result = api.web_wsConnect(&url).await;
        let _ = tx.send(crate::ops::async_state::AsyncCompletion {
            id,
            result: match result {
                Ok(handle) => Ok(handle.to_string()),
                Err(e) => Err(e),
            },
        }).await;
        notify.notify_one();
    });
}
