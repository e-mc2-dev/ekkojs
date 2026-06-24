// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



use super::MIMIR_STORE;

pub(super) fn assert_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let src = v8::String::new(scope, include_str!("../modules/assert.js")).unwrap();
    let script = v8::Script::compile(scope, src, None).unwrap();
    let result = script.run(scope).unwrap();
    let obj = v8::Local::<v8::Object>::try_from(result).unwrap();
    for name in ["assert","assertEqual","assertNotEqual","assertStrictEqual","assertDeepEqual","assertThrows","assertRejects","assertType","fail"] {
        let k = v8::String::new(scope, name).unwrap();
        let v = obj.get(scope, k.into()).unwrap();
        let _ = module.set_synthetic_module_export(scope, k, v);
    }
    Some(v8::undefined(scope).into())
}

pub(super) fn log_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let src = v8::String::new(scope, include_str!("../modules/log.js")).unwrap();
    let script = v8::Script::compile(scope, src, None).unwrap();
    let result = script.run(scope).unwrap();
    let obj = v8::Local::<v8::Object>::try_from(result).unwrap();
    for name in ["log", "createLogger"] {
        let k = v8::String::new(scope, name).unwrap();
        let v = obj.get(scope, k.into()).unwrap();
        let _ = module.set_synthetic_module_export(scope, k, v);
    }
    Some(v8::undefined(scope).into())
}

thread_local! {
    static JSX_OBJ: std::cell::RefCell<Option<v8::Global<v8::Object>>> = std::cell::RefCell::new(None);
}

fn get_or_eval_jsx<'a>(scope: &mut v8::CallbackScope<'a>) -> Option<v8::Local<'a, v8::Object>> {
    let cached = JSX_OBJ.with(|c| c.borrow().as_ref().map(|g| v8::Local::new(scope, g)));
    if let Some(obj) = cached { return Some(obj); }
    let src = v8::String::new(scope, include_str!("../modules/jsx.js")).unwrap();
    let script = v8::Script::compile(scope, src, None)?;
    let result = script.run(scope)?;
    let obj = v8::Local::<v8::Object>::try_from(result).ok()?;
    JSX_OBJ.with(|c| *c.borrow_mut() = Some(v8::Global::new(scope, obj)));
    Some(obj)
}

pub(super) fn jsx_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let obj = get_or_eval_jsx(scope)?;
    for name in &["jsx", "jsxs", "Fragment", "registerReact", "Link"] {
        let k = v8::String::new(scope, name).unwrap();
        let v = obj.get(scope, k.into()).unwrap();
        let _ = module.set_synthetic_module_export(scope, k, v);
    }
    Some(v8::undefined(scope).into())
}

fn ssr_get_mimir(
    scope: &mut v8::HandleScope,
    _args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let val = MIMIR_STORE.with(|cell| {
        cell.borrow().as_ref().map(|g| v8::Local::new(scope, g))
    });
    match val {
        Some(v) => rv.set(v),
        None => rv.set(v8::undefined(scope).into()),
    }
}

thread_local! {
    static SSR_OBJ: std::cell::RefCell<Option<v8::Global<v8::Object>>> = std::cell::RefCell::new(None);
}

fn get_or_eval_ssr<'a>(scope: &mut v8::CallbackScope<'a>) -> Option<v8::Local<'a, v8::Object>> {
    let cached = SSR_OBJ.with(|c| c.borrow().as_ref().map(|g| v8::Local::new(scope, g)));
    if let Some(obj) = cached { return Some(obj); }
    let src = v8::String::new(scope, include_str!("../modules/ssr.js")).unwrap();
    let script = v8::Script::compile(scope, src, None)?;
    let result = script.run(scope)?;
    let obj = v8::Local::<v8::Object>::try_from(result).ok()?;
    SSR_OBJ.with(|c| *c.borrow_mut() = Some(v8::Global::new(scope, obj)));
    Some(obj)
}

pub(super) fn ssr_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let obj = get_or_eval_ssr(scope)?;
    for name in &["renderToString", "escapeHtml", "htmlShell", "serializeProps", "registerRenderer", "getRenderer", "__raw"] {
        let k = v8::String::new(scope, name).unwrap();
        let v = obj.get(scope, k.into()).unwrap();
        let _ = module.set_synthetic_module_export(scope, k, v);
    }
    Some(v8::undefined(scope).into())
}

pub(super) fn rune_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let ssr_obj = get_or_eval_ssr(scope)?;
    let src = v8::String::new(scope, include_str!("../modules/rune.js")).unwrap();
    let script = v8::Script::compile(scope, src, None)?;
    let rune_fn = script.run(scope)?;
    let func = v8::Local::<v8::Function>::try_from(rune_fn).ok()?;
    let ops_global = scope.get_slot::<crate::engine::v8_runtime::SsrOps>()?.0.clone();
    let ops_local = v8::Local::new(scope, ops_global);
    let get_mimir_fn = v8::Function::new(scope, ssr_get_mimir).unwrap();
    let undef = v8::undefined(scope).into();
    let result = func.call(scope, undef, &[ops_local.into(), get_mimir_fn.into(), ssr_obj.into()])?;
    let obj = v8::Local::<v8::Object>::try_from(result).ok()?;
    for name in &["createApp", "scanRoutes", "readManifest", "resolvePageAssets", "composeLayouts", "cssModule", "createStyleCollector"] {
        let k = v8::String::new(scope, name).unwrap();
        let v = obj.get(scope, k.into()).unwrap();
        let _ = module.set_synthetic_module_export(scope, k, v);
    }
    Some(v8::undefined(scope).into())
}

fn graphql_parse_schema(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let sdl = args.get(0).to_rust_string_lossy(scope);
    let result = crate::parsers::graphql::parse_schema(&sdl);
    let json_str = serde_json::to_string(&result).unwrap_or_else(|_| "{}".to_string());
    let v8_str = v8::String::new(scope, &json_str).unwrap_or_else(|| v8::String::empty(scope));
    if let Some(parsed) = v8::json::parse(scope, v8_str.into()) {
        rv.set(parsed);
    }
}

fn graphql_parse_query(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let query = args.get(0).to_rust_string_lossy(scope);
    let result = crate::parsers::graphql::parse_query(&query);
    let json_str = serde_json::to_string(&result).unwrap_or_else(|_| "{}".to_string());
    let v8_str = v8::String::new(scope, &json_str).unwrap_or_else(|| v8::String::empty(scope));
    if let Some(parsed) = v8::json::parse(scope, v8_str.into()) {
        rv.set(parsed);
    }
}

fn graphql_validate(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let schema_str = args.get(0).to_rust_string_lossy(scope);
    let query_str = args.get(1).to_rust_string_lossy(scope);
    let schema: serde_json::Value = serde_json::from_str(&schema_str).unwrap_or_default();
    let query: serde_json::Value = serde_json::from_str(&query_str).unwrap_or_default();
    let result = crate::parsers::graphql::validate(&schema, &query);
    let json_str = serde_json::to_string(&result).unwrap_or_else(|_| "{}".to_string());
    let v8_str = v8::String::new(scope, &json_str).unwrap_or_else(|| v8::String::empty(scope));
    if let Some(parsed) = v8::json::parse(scope, v8_str.into()) {
        rv.set(parsed);
    }
}

pub(super) fn graphql_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let ops = v8::Object::new(scope);
    obj_fn!(scope, ops, "parseSchema", graphql_parse_schema);
    obj_fn!(scope, ops, "parseQuery", graphql_parse_query);
    obj_fn!(scope, ops, "validate", graphql_validate);
    let src = v8::String::new(scope, include_str!("../modules/graphql.js")).unwrap();
    let script = v8::Script::compile(scope, src, None)?;
    let gql_fn = script.run(scope)?;
    let func = v8::Local::<v8::Function>::try_from(gql_fn).ok()?;
    let undef = v8::undefined(scope).into();
    let result = func.call(scope, undef, &[ops.into()])?;
    let obj = v8::Local::<v8::Object>::try_from(result).ok()?;
    for name in &["createGraphQL"] {
        let k = v8::String::new(scope, name).unwrap();
        let v = obj.get(scope, k.into()).unwrap();
        let _ = module.set_synthetic_module_export(scope, k, v);
    }
    Some(v8::undefined(scope).into())
}

pub(super) fn realtime_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let src = v8::String::new(scope, include_str!("../modules/realtime.js")).unwrap();
    let script = v8::Script::compile(scope, src, None).unwrap();
    let result = script.run(scope).unwrap();
    let obj = v8::Local::<v8::Object>::try_from(result).unwrap();
    let k = v8::String::new(scope, "createRealtime").unwrap();
    let v = obj.get(scope, k.into()).unwrap();
    let _ = module.set_synthetic_module_export(scope, k, v);
    Some(v8::undefined(scope).into())

}

pub(super) fn cli_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };

    let ops = v8::Object::new(scope);
    let k = v8::String::new(scope, "readKey").unwrap();
    let f = v8::Function::new(scope, cli_read_key).unwrap();
    ops.set(scope, k.into(), f.into());
    let k = v8::String::new(scope, "write").unwrap();
    let f = v8::Function::new(scope, cli_write).unwrap();
    ops.set(scope, k.into(), f.into());
    let k = v8::String::new(scope, "getSize").unwrap();
    let f = v8::Function::new(scope, super::builtin_tui::tui_get_size).unwrap();
    ops.set(scope, k.into(), f.into());
    let k = v8::String::new(scope, "tokenize").unwrap();
    let f = v8::Function::new(scope, cli_tokenize).unwrap();
    ops.set(scope, k.into(), f.into());

    let src = v8::String::new(scope, include_str!("../modules/cli.js")).unwrap();
    let script = v8::Script::compile(scope, src, None)?;
    let iife_fn = script.run(scope)?;
    let func = v8::Local::<v8::Function>::try_from(iife_fn).ok()?;
    let undef = v8::undefined(scope).into();
    let result = func.call(scope, undef, &[ops.into()])?;
    let obj = v8::Local::<v8::Object>::try_from(result).ok()?;
    for name in ["cli", "prompt", "render"] {
        let k = v8::String::new(scope, name).unwrap();
        let v = obj.get(scope, k.into()).unwrap();
        let _ = module.set_synthetic_module_export(scope, k, v);
    }
    Some(v8::undefined(scope).into())
}

fn cli_tokenize(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let language = args.get(0).to_rust_string_lossy(scope);
    let code = args.get(1).to_rust_string_lossy(scope);
    let json = crate::highlight::tokenize_json(&language, &code);
    let s = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope));
    rv.set(s.into());
}

fn cli_read_key(
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

    tokio::task::spawn_blocking(move || {
        let result = (|| -> Result<String, String> {
            crossterm::terminal::enable_raw_mode().map_err(|e| e.to_string())?;
            let evt = if crossterm::event::poll(std::time::Duration::from_secs(120))
                .map_err(|e| e.to_string())? {
                match crossterm::event::read().map_err(|e| e.to_string())? {
                    crossterm::event::Event::Key(k) if k.kind == crossterm::event::KeyEventKind::Press => {
                        let ctrl = k.modifiers.contains(crossterm::event::KeyModifiers::CONTROL);
                        let alt = k.modifiers.contains(crossterm::event::KeyModifiers::ALT);
                        let shift = k.modifiers.contains(crossterm::event::KeyModifiers::SHIFT);
                        let json = match k.code {
                            crossterm::event::KeyCode::Char(c) => {
                                let ch = match c { '"' => "\\\"".to_string(), '\\' => "\\\\".to_string(), _ => c.to_string() };
                                format!(r#"{{"key":"Char","char":"{ch}","ctrl":{ctrl},"alt":{alt},"shift":{shift}}}"#)
                            }
                            crossterm::event::KeyCode::Enter => format!(r#"{{"key":"Enter","ctrl":{ctrl},"alt":{alt},"shift":{shift}}}"#),
                            crossterm::event::KeyCode::Backspace => format!(r#"{{"key":"Backspace","ctrl":{ctrl}}}"#),
                            crossterm::event::KeyCode::Esc => r#"{"key":"Esc"}"#.to_string(),
                            crossterm::event::KeyCode::Up => format!(r#"{{"key":"Up","ctrl":{ctrl},"shift":{shift}}}"#),
                            crossterm::event::KeyCode::Down => format!(r#"{{"key":"Down","ctrl":{ctrl},"shift":{shift}}}"#),
                            crossterm::event::KeyCode::Left => format!(r#"{{"key":"Left","ctrl":{ctrl}}}"#),
                            crossterm::event::KeyCode::Right => format!(r#"{{"key":"Right","ctrl":{ctrl}}}"#),
                            crossterm::event::KeyCode::Tab => r#"{"key":"Tab"}"#.to_string(),
                            crossterm::event::KeyCode::Home => r#"{"key":"Home"}"#.to_string(),
                            crossterm::event::KeyCode::End => r#"{"key":"End"}"#.to_string(),
                            crossterm::event::KeyCode::PageUp => r#"{"key":"PageUp"}"#.to_string(),
                            crossterm::event::KeyCode::PageDown => r#"{"key":"PageDown"}"#.to_string(),
                            crossterm::event::KeyCode::Delete => r#"{"key":"Delete"}"#.to_string(),
                            _ => r#"{"key":"None"}"#.to_string(),
                        };
                        Some(json)
                    }
                    _ => None,
                }
            } else {
                None
            };
            crossterm::terminal::disable_raw_mode().map_err(|e| e.to_string())?;
            Ok(evt.unwrap_or_else(|| r#"{"key":"None"}"#.to_string()))
        })();

        let completion = crate::ops::async_state::AsyncCompletion { id, result };
        let _ = tx.blocking_send(completion);
        notify.notify_one();
    });
}

fn cli_write(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let text = args.get(0).to_rust_string_lossy(scope);
    use std::io::Write;
    print!("{}", text);
    let _ = std::io::stdout().flush();
}

pub(super) fn cron_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let src = v8::String::new(scope, include_str!("../modules/cron.js")).unwrap();
    let script = v8::Script::compile(scope, src, None).unwrap();
    let result = script.run(scope).unwrap();
    let obj = v8::Local::<v8::Object>::try_from(result).unwrap();
    let k = v8::String::new(scope, "cron").unwrap();
    let v = obj.get(scope, k.into()).unwrap();
    let _ = module.set_synthetic_module_export(scope, k, v);
    Some(v8::undefined(scope).into())

}

pub(super) fn queue_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let src = v8::String::new(scope, include_str!("../modules/queue.js")).unwrap();
    let script = v8::Script::compile(scope, src, None).unwrap();
    let result = script.run(scope).unwrap();
    let obj = v8::Local::<v8::Object>::try_from(result).unwrap();
    let k = v8::String::new(scope, "createQueue").unwrap();
    let v = obj.get(scope, k.into()).unwrap();
    let _ = module.set_synthetic_module_export(scope, k, v);
    Some(v8::undefined(scope).into())

}

pub(super) fn auth_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };

    let ops = v8::Object::new(scope);
    let k = v8::String::new(scope, "hmac").unwrap();
    let f = v8::Function::new(scope, super::builtin_crypto::crypto_hmac).unwrap();
    ops.set(scope, k.into(), f.into());
    let k = v8::String::new(scope, "hash").unwrap();
    let f = v8::Function::new(scope, super::builtin_crypto::crypto_hash).unwrap();
    ops.set(scope, k.into(), f.into());
    let k = v8::String::new(scope, "randomBytes").unwrap();
    let f = v8::Function::new(scope, super::builtin_crypto::crypto_random_bytes).unwrap();
    ops.set(scope, k.into(), f.into());
    let k = v8::String::new(scope, "hashHex").unwrap();
    let f = v8::Function::new(scope, super::builtin_crypto::crypto_hash_hex).unwrap();
    ops.set(scope, k.into(), f.into());
    let k = v8::String::new(scope, "pbkdf2").unwrap();
    let f = v8::Function::new(scope, super::builtin_crypto::crypto_pbkdf2).unwrap();
    ops.set(scope, k.into(), f.into());

    let src = v8::String::new(scope, include_str!("../modules/auth.js")).unwrap();
    let script = v8::Script::compile(scope, src, None)?;
    let iife_fn = script.run(scope)?;
    let func = v8::Local::<v8::Function>::try_from(iife_fn).ok()?;
    let undef = v8::undefined(scope).into();
    let result = func.call(scope, undef, &[ops.into()])?;
    let obj = v8::Local::<v8::Object>::try_from(result).ok()?;
    for name in ["createAuth", "totp"] {
        let k = v8::String::new(scope, name).unwrap();
        let v = obj.get(scope, k.into()).unwrap();
        let _ = module.set_synthetic_module_export(scope, k, v);
    }
    Some(v8::undefined(scope).into())

}

pub(super) fn rbac_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let src = v8::String::new(scope, include_str!("../modules/rbac.js")).unwrap();
    let script = v8::Script::compile(scope, src, None).unwrap();
    let result = script.run(scope).unwrap();
    let obj = v8::Local::<v8::Object>::try_from(result).unwrap();
    for name in ["createRBAC", "createRbacHelpers", "matchPerm"] {
        let k = v8::String::new(scope, name).unwrap();
        let v = obj.get(scope, k.into()).unwrap();
        let _ = module.set_synthetic_module_export(scope, k, v);
    }
    Some(v8::undefined(scope).into())

}

pub(super) fn orm_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };

    
    let db_fn = v8::Function::new(scope, super::builtin_db::db_open).unwrap();
    let src = v8::String::new(scope, include_str!("../modules/orm.js")).unwrap();
    let script = v8::Script::compile(scope, src, None).unwrap();
    let func_val = script.run(scope).unwrap();
    let func = v8::Local::<v8::Function>::try_from(func_val).unwrap();
    let undef = v8::undefined(scope).into();
    let result = func.call(scope, undef, &[db_fn.into()])?;
    let obj = v8::Local::<v8::Object>::try_from(result).unwrap();
    for name in ["orm", "defineTable", "connect", "registerDriver", "Dialect", "SqlDialect", "Connection", "Transaction", "Pool", "Query", "col", "idx", "SqliteClient", "SqliteClientTransaction"] {
        let k = v8::String::new(scope, name).unwrap();
        let v = obj.get(scope, k.into()).unwrap();
        let _ = module.set_synthetic_module_export(scope, k, v);
    }

    Some(v8::undefined(scope).into())
}

pub(super) fn validate_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let src = v8::String::new(scope, include_str!("../modules/validate.js")).unwrap();
    let script = v8::Script::compile(scope, src, None).unwrap();
    let result = script.run(scope).unwrap();
    let obj = v8::Local::<v8::Object>::try_from(result).unwrap();
    let z_key = v8::String::new(scope, "z").unwrap();
    let z_val = obj.get(scope, z_key.into()).unwrap();
    let _ = module.set_synthetic_module_export(scope, z_key, z_val);
    Some(v8::undefined(scope).into())

}

pub(super) fn test_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let src = v8::String::new(scope, include_str!("../modules/test.js")).unwrap();
    let script = v8::Script::compile(scope, src, None).unwrap();
    let result = script.run(scope).unwrap();
    let obj = v8::Local::<v8::Object>::try_from(result).unwrap();
    for name in ["describe","test","expect","beforeEach","afterEach","beforeAll","afterAll","mock"] {
        let k = v8::String::new(scope, name).unwrap();
        let v = obj.get(scope, k.into()).unwrap();
        let _ = module.set_synthetic_module_export(scope, k, v);
    }
    Some(v8::undefined(scope).into())

}

pub(super) fn mimir_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope  = &mut unsafe { v8::CallbackScope::new(context) };
    let src    = v8::String::new(scope, include_str!("../modules/mimir.js")).unwrap();
    let script = v8::Script::compile(scope, src, None).unwrap();
    let result = script.run(scope).unwrap();
    let obj    = v8::Local::<v8::Object>::try_from(result).unwrap();

    let mimir_key = v8::String::new(scope, "mimir").unwrap();
    let mimir_val = obj.get(scope, mimir_key.into()).unwrap();
    
    MIMIR_STORE.with(|cell| {
        *cell.borrow_mut() = Some(v8::Global::new(scope, mimir_val));
    });

    for name in &["atom", "selector", "mimir", "createStore", "Mimir", "useAtom", "useAtomValue", "useSetAtom"] {
        let k = v8::String::new(scope, name).unwrap();
        let v = obj.get(scope, k.into()).unwrap();
        let _ = module.set_synthetic_module_export(scope, k, v);
    }
    Some(v8::undefined(scope).into())
}

pub(super) fn router_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope  = &mut unsafe { v8::CallbackScope::new(context) };
    let src    = v8::String::new(scope, include_str!("../modules/router.js")).unwrap();
    let script = v8::Script::compile(scope, src, None).unwrap();
    let result = script.run(scope).unwrap();
    let obj    = v8::Local::<v8::Object>::try_from(result).unwrap();
    for name in &["createRouter", "useRouter", "useParams", "useSearchParams", "navigate", "validateUrl", "matchPath", "extractParams"] {
        let k = v8::String::new(scope, name).unwrap();
        let v = obj.get(scope, k.into()).unwrap();
        let _ = module.set_synthetic_module_export(scope, k, v);
    }

    if let Some(jsx_obj) = get_or_eval_jsx(scope) {
        let k = v8::String::new(scope, "Link").unwrap();
        if let Some(v) = jsx_obj.get(scope, k.into()) {
            let _ = module.set_synthetic_module_export(scope, k, v);
        }
    }
    Some(v8::undefined(scope).into())
}

pub(super) fn seo_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope  = &mut unsafe { v8::CallbackScope::new(context) };
    let src    = v8::String::new(scope, include_str!("../modules/seo.js")).unwrap();
    let script = v8::Script::compile(scope, src, None).unwrap();
    let result = script.run(scope).unwrap();
    let obj    = v8::Local::<v8::Object>::try_from(result).unwrap();
    let k      = v8::String::new(scope, "createSEO").unwrap();
    let v      = obj.get(scope, k.into()).unwrap();
    let _      = module.set_synthetic_module_export(scope, k, v);
    Some(v8::undefined(scope).into())
}

