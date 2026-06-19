// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



pub(super) fn tui_guard(scope: &mut v8::HandleScope) -> bool {
    if !crate::bridges::tui_bridge::is_available() {
        let msg = v8::String::new(scope, "ekko:app/tui is only available with the 'ekko tui' command").unwrap();
        scope.throw_exception(msg.into());
        return false;
    }
    true
}

pub(super) fn tui_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };

    let tui_ops = v8::Object::new(scope);
    let k = v8::String::new(scope, "sendCells").unwrap();
    let f = v8::Function::new(scope, tui_send_cells).unwrap();
    tui_ops.set(scope, k.into(), f.into());
    let k = v8::String::new(scope, "recvEvent").unwrap();
    let f = v8::Function::new(scope, tui_recv_event).unwrap();
    tui_ops.set(scope, k.into(), f.into());
    let k = v8::String::new(scope, "getSize").unwrap();
    let f = v8::Function::new(scope, tui_get_size).unwrap();
    tui_ops.set(scope, k.into(), f.into());
    let k = v8::String::new(scope, "unicodeWidth").unwrap();
    let f = v8::Function::new(scope, tui_unicode_width).unwrap();
    tui_ops.set(scope, k.into(), f.into());
    let k = v8::String::new(scope, "tokenize").unwrap();
    let f = v8::Function::new(scope, tui_tokenize).unwrap();
    tui_ops.set(scope, k.into(), f.into());

    let src = v8::String::new(scope, include_str!("../modules/tui.js")).unwrap();
    let script = v8::Script::compile(scope, src, None)?;
    let iife_fn = script.run(scope)?;
    let func = v8::Local::<v8::Function>::try_from(iife_fn).ok()?;
    let undef = v8::undefined(scope).into();
    let result = func.call(scope, undef, &[tui_ops.into()])?;
    let obj = v8::Local::<v8::Object>::try_from(result).ok()?;

    let export_names = [
        "render", "onInput", "createNode", "computeLayout", "generateCells", "setScroll", "nextFrame", "hostConfig",
        "Box", "Text", "Spacer", "FocusGroup", "FocusItem", "Modal",
        "TextInput", "SelectInput", "Spinner", "ProgressBar",
        "Table", "SplitPane", "Terminal", "SyntaxText", "Markdown", "CodeView", "renderMarkdown", "mdWrap",
        "useState", "useEffect", "useRef", "useCallback",
        "useInput", "useGlobalKey", "useFocus", "useResize", "useDimensions",
        "useDebounce", "useTextInput", "useApp", "useStdout",
        "dispatchInput", "scheduleRender", "focusManager",
        "registerLanguage", "theme",
    ];
    for name in &export_names {
        let k = v8::String::new(scope, name).unwrap();
        let v = obj.get(scope, k.into()).unwrap();
        let _ = module.set_synthetic_module_export(scope, k, v);
    }

    Some(v8::undefined(scope).into())
}

fn tui_send_cells(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let json = args.get(0).to_rust_string_lossy(scope);
    if let Some(sender) = crate::bridges::tui_bridge::sender() {
        if json == "__quit__" {
            let _ = sender.quit();
            return;
        }
        let _ = sender.clear();
        if let Err(e) = sender.update_cells(json) {
            let msg = v8::String::new(scope, &format!("tui_send_cells failed: {}", e)).unwrap();
            scope.throw_exception(msg.into());
        }
        let _ = sender.flush();
    }
}

fn tui_recv_event(
    scope: &mut v8::HandleScope,
    _args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
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

    let rx = crate::bridges::tui_bridge::event_rx();
    tokio::spawn(async move {
        let completion = if let Some(rx_lock) = rx {
            let mut rx_guard = rx_lock.lock().await;
            match rx_guard.recv().await {
                Some(msg) => Ok(msg),
                None => Ok("null".to_string()),
            }
        } else {
            Ok("null".to_string())
        };

        let _ = tx.send(crate::ops::async_state::AsyncCompletion { id, result: completion }).await;
        notify.notify_one();
    });
}

pub(super) fn tui_get_size(
    scope: &mut v8::HandleScope,
    _args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let (cols, rows) = crate::bridges::tui_bridge::get_size();
    let obj = v8::Object::new(scope);
    let k = v8::String::new(scope, "columns").unwrap();
    let v = v8::Integer::new(scope, cols as i32);
    obj.set(scope, k.into(), v.into());
    let k = v8::String::new(scope, "rows").unwrap();
    let v = v8::Integer::new(scope, rows as i32);
    obj.set(scope, k.into(), v.into());
    rv.set(obj.into());
}

fn tui_unicode_width(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let s = args.get(0).to_rust_string_lossy(scope);
    let ch = s.chars().next().unwrap_or(' ');
    let cp = ch as u32;
    
    let w = if cp < 0x20 || (cp >= 0x7F && cp < 0xA0) { 0 }
    else if (0x1100..=0x115F).contains(&cp) || (0x2E80..=0x9FFF).contains(&cp)
        || (0xAC00..=0xD7AF).contains(&cp) || (0xF900..=0xFAFF).contains(&cp)
        || (0xFE30..=0xFE6F).contains(&cp) || (0xFF01..=0xFF60).contains(&cp)
        || (0xFFE0..=0xFFE6).contains(&cp) || (0x20000..=0x2FA1F).contains(&cp)
        || (0x1F000..=0x1FAFF).contains(&cp) || (0x1F300..=0x1F9FF).contains(&cp)
        || (0x2600..=0x27BF).contains(&cp) || cp == 0x231A || cp == 0x231B
        || cp == 0x2B50 || cp == 0x2B55 { 2 }
    else { 1 };
    rv.set(v8::Integer::new(scope, w).into());
}

fn tui_tokenize(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let language = args.get(0).to_rust_string_lossy(scope);
    let code = args.get(1).to_rust_string_lossy(scope);
    if let Some(sender) = crate::bridges::tui_bridge::sender() {
        match sender.tokenize(language, code) {
            Ok(json) => {
                let s = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope));
                rv.set(s.into());
            }
            Err(_) => {
                let s = v8::String::new(scope, "[]").unwrap();
                rv.set(s.into());
            }
        }
    } else {
        let s = v8::String::new(scope, "[]").unwrap();
        rv.set(s.into());
    }
}

fn tui_pty_spawn(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let config = args.get(0).to_rust_string_lossy(scope);
    if let Some(sender) = crate::bridges::tui_bridge::sender() {
        match sender.pty_spawn(config) {
            Ok(id) => rv.set(v8::Integer::new(scope, id as i32).into()),
            Err(e) => {
                let msg = v8::String::new(scope, &e).unwrap_or_else(|| v8::String::empty(scope));
                scope.throw_exception(msg.into());
            }
        }
    }
}

fn tui_pty_write(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let id = args.get(0).uint32_value(scope).unwrap_or(0);
    let data = args.get(1).to_rust_string_lossy(scope);
    if let Some(sender) = crate::bridges::tui_bridge::sender() {
        let _ = sender.pty_write(id, data);
    }
}

fn tui_pty_kill(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let id = args.get(0).uint32_value(scope).unwrap_or(0);
    if let Some(sender) = crate::bridges::tui_bridge::sender() {
        let _ = sender.pty_kill(id);
    }
}

