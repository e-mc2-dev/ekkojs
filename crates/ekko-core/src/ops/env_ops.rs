// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



pub fn env_get(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let key = args.get(0);
    if !key.is_string() {
        rv.set(v8::undefined(scope).into());
        return;
    }
    let key_str = key.to_rust_string_lossy(scope);
    if !crate::engine::v8_runtime::check_permission_path("env", &key_str) {
        let m = v8::String::new(scope, &format!(
            "PermissionError: env access denied for '{}'. Run with --allow=env",
            key_str
        )).unwrap();
        scope.throw_exception(m.into());
        return;
    }
    match std::env::var(&key_str) {
        Ok(val) => {
            let v = v8::String::new(scope, &val).unwrap_or_else(|| v8::String::empty(scope));
            rv.set(v.into());
        }
        Err(_) => {
            rv.set(v8::undefined(scope).into());
        }
    }
}

pub fn env_set(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    if args.length() < 2 || !args.get(0).is_string() {
        return;
    }
    let key = args.get(0).to_rust_string_lossy(scope);
    if !crate::engine::v8_runtime::check_permission_path("env", &key) {
        let m = v8::String::new(scope, &format!(
            "PermissionError: env access denied for '{}'. Run with --allow=env",
            key
        )).unwrap();
        scope.throw_exception(m.into());
        return;
    }
    let val = args.get(1).to_rust_string_lossy(scope);
    unsafe { std::env::set_var(&key, &val) };
}

pub fn env_has(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let key = args.get(0);
    if !key.is_string() {
        rv.set(v8::Boolean::new(scope, false).into());
        return;
    }
    let key_str = key.to_rust_string_lossy(scope);
    if !crate::engine::v8_runtime::check_permission_path("env", &key_str) {
        let m = v8::String::new(scope, &format!(
            "PermissionError: env access denied for '{}'. Run with --allow=env",
            key_str
        )).unwrap();
        scope.throw_exception(m.into());
        return;
    }
    let exists = std::env::var(&key_str).is_ok();
    rv.set(v8::Boolean::new(scope, exists).into());
}

pub fn env_delete(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let key = args.get(0);
    if !key.is_string() {
        return;
    }
    let key_str = key.to_rust_string_lossy(scope);
    if !crate::engine::v8_runtime::check_permission_path("env", &key_str) {
        let m = v8::String::new(scope, &format!(
            "PermissionError: env access denied for '{}'. Run with --allow=env",
            key_str
        )).unwrap();
        scope.throw_exception(m.into());
        return;
    }
    unsafe { std::env::remove_var(&key_str) };
}

pub fn env_entries(
    scope: &mut v8::HandleScope,
    _args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    if !crate::engine::v8_runtime::check_permission("env") {
        let m = v8::String::new(scope, "PermissionError: env access denied in this context. Run with --allow=env").unwrap();
        scope.throw_exception(m.into());
        return;
    }
    let vars: Vec<(String, String)> = std::env::vars().collect();
    let arr = v8::Array::new(scope, vars.len() as i32);
    for (i, (key, val)) in vars.iter().enumerate() {
        let pair = v8::Array::new(scope, 2);
        let k = v8::String::new(scope, key).unwrap();
        let v = v8::String::new(scope, val).unwrap();
        pair.set_index(scope, 0, k.into());
        pair.set_index(scope, 1, v.into());
        arr.set_index(scope, i as u32, pair.into());
    }
    rv.set(arr.into());
}
