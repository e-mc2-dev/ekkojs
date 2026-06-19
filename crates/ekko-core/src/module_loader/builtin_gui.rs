// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



pub(super) fn gui_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };

    set_export_fn!(scope, module, "createWindow", gui_create_window);
    set_export_fn!(scope, module, "send", gui_send);
    set_export_fn!(scope, module, "setTitle", gui_set_title);
    set_export_fn!(scope, module, "close", gui_close);
    set_export_fn!(scope, module, "setAlwaysOnTop", gui_set_always_on_top);
    set_export_fn!(scope, module, "createTray", gui_create_tray);
    set_export_fn!(scope, module, "setMenu", gui_set_menu);

    let gui_ops = v8::Object::new(scope);
    let rk = v8::String::new(scope, "recv").unwrap();
    let rf = v8::Function::new(scope, gui_recv).unwrap();
    gui_ops.set(scope, rk.into(), rf.into());

    let src = v8::String::new(scope, include_str!("../modules/gui.js")).unwrap();
    let script = v8::Script::compile(scope, src, None)?;
    let iife_fn = script.run(scope)?;
    let func = v8::Local::<v8::Function>::try_from(iife_fn).ok()?;
    let undef = v8::undefined(scope).into();
    let result = func.call(scope, undef, &[gui_ops.into()])?;
    let obj = v8::Local::<v8::Object>::try_from(result).ok()?;
    let k = v8::String::new(scope, "onMessage").unwrap();
    let v = obj.get(scope, k.into()).unwrap();
    let _ = module.set_synthetic_module_export(scope, k, v);

    Some(v8::undefined(scope).into())
}

fn gui_guard(scope: &mut v8::HandleScope) -> bool {
    if !crate::bridges::gui_bridge::is_available() {
        let msg = v8::String::new(scope, "ekko:app/gui is only available with the 'ekko gui' command").unwrap();
        scope.throw_exception(msg.into());
        return false;
    }
    true
}

fn gui_json_arg(scope: &mut v8::HandleScope, val: v8::Local<v8::Value>) -> String {
    if val.is_undefined() || val.is_null() {
        "{}".to_string()
    } else {
        v8::json::stringify(scope, val)
            .map(|s| s.to_rust_string_lossy(scope))
            .unwrap_or_else(|| "{}".to_string())
    }
}

fn gui_create_window(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    if !gui_guard(scope) { return; }

    let json_str = gui_json_arg(scope, args.get(0));

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
        let (ack_tx, ack_rx) = tokio::sync::oneshot::channel::<u32>();
        let result = if let Some(sender) = crate::bridges::gui_bridge::sender() {
            sender.create_window(json_str, ack_tx)
        } else {
            Err("GUI bridge not available".to_string())
        };

        let completion = match result {
            Ok(()) => match ack_rx.await {
                Ok(window_id) => Ok(window_id.to_string()),
                Err(_) => Err("window creation was cancelled".to_string()),
            },
            Err(e) => Err(e),
        };

        let _ = tx.send(crate::ops::async_state::AsyncCompletion { id, result: completion }).await;
        notify.notify_one();
    });
}

fn gui_send(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    if !gui_guard(scope) { return; }

    let data = args.get(0);
    let json_v = match v8::json::stringify(scope, data) {
        Some(s) => s,
        None => {
            let msg = v8::String::new(scope, "ekko:app/gui send() failed to serialize data").unwrap();
            scope.throw_exception(msg.into());
            return;
        }
    };
    let json = json_v.to_rust_string_lossy(scope);

    let js = format!("window.ekko.__dispatch({})", json);
    if let Some(sender) = crate::bridges::gui_bridge::sender() {
        let _ = sender.eval_script_all(js);
    }
}

fn gui_recv(
    scope: &mut v8::HandleScope,
    _args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    if !gui_guard(scope) { return; }

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

    let rx = crate::bridges::gui_bridge::ipc_rx();
    tokio::spawn(async move {
        let completion = if let Some(rx_lock) = rx {
            let mut rx_guard = rx_lock.lock().await;
            match rx_guard.recv().await {
                Some(msg) => Ok(msg),
                None => Ok("null".to_string()),
            }
        } else {
            Err("GUI IPC channel not available".to_string())
        };

        let _ = tx.send(crate::ops::async_state::AsyncCompletion { id, result: completion }).await;
        notify.notify_one();
    });
}

fn gui_set_title(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    if !gui_guard(scope) { return; }

    let window_id = args.get(0).uint32_value(scope).unwrap_or(1);
    let title = args.get(1).to_rust_string_lossy(scope);
    if let Some(sender) = crate::bridges::gui_bridge::sender() {
        let _ = sender.set_title(window_id, title);
    }
}

fn gui_close(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    if !gui_guard(scope) { return; }

    if args.length() > 0 && args.get(0).is_number() {
        let window_id = args.get(0).uint32_value(scope).unwrap_or(0);
        if let Some(sender) = crate::bridges::gui_bridge::sender() {
            let _ = sender.close_window(window_id);
        }
    } else {
        if let Some(sender) = crate::bridges::gui_bridge::sender() {
            let _ = sender.close_all();
        }
    }
}

fn gui_set_always_on_top(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    if !gui_guard(scope) { return; }

    let window_id = args.get(0).uint32_value(scope).unwrap_or(1);
    let value = args.get(1).boolean_value(scope);
    if let Some(sender) = crate::bridges::gui_bridge::sender() {
        let _ = sender.set_always_on_top(window_id, value);
    }
}

fn gui_create_tray(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    if !gui_guard(scope) { return; }

    let json_str = gui_json_arg(scope, args.get(0));
    if let Some(sender) = crate::bridges::gui_bridge::sender() {
        if let Err(e) = sender.create_tray(json_str) {
            let msg = v8::String::new(scope, &format!("createTray failed: {}", e)).unwrap();
            scope.throw_exception(msg.into());
        }
    }
}

fn gui_set_menu(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    if !gui_guard(scope) { return; }

    let json_str = gui_json_arg(scope, args.get(0));
    if let Some(sender) = crate::bridges::gui_bridge::sender() {
        if let Err(e) = sender.set_menu(json_str) {
            let msg = v8::String::new(scope, &format!("setMenu failed: {}", e)).unwrap();
            scope.throw_exception(msg.into());
        }
    }
}

