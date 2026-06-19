// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



pub(super) fn db_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    set_export_fn!(scope, module, "Database", db_open);
    Some(v8::undefined(scope).into())
}

pub fn db_open(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let path = args.get(0).to_rust_string_lossy(scope);

    

    if path != ":memory:" {
        check_perm!(scope, "fs", &path);
    }
    match crate::db::sqlite_db::db_open(&path) {
        Ok(handle) => {
            let obj = v8::Object::new(scope);
            let h = v8::Integer::new(scope, handle);
            let key = v8::String::new(scope, "_handle").unwrap();
            obj.set(scope, key.into(), h.into());
            let f = v8::Function::new(scope, db_exec).unwrap();
            let k = v8::String::new(scope, "exec").unwrap();
            obj.set(scope, k.into(), f.into());
            let f = v8::Function::new(scope, db_query).unwrap();
            let k = v8::String::new(scope, "query").unwrap();
            obj.set(scope, k.into(), f.into());
            let f = v8::Function::new(scope, db_prepare).unwrap();
            let k = v8::String::new(scope, "prepare").unwrap();
            obj.set(scope, k.into(), f.into());
            let f = v8::Function::new(scope, db_close).unwrap();
            let k = v8::String::new(scope, "close").unwrap();
            obj.set(scope, k.into(), f.into());
            rv.set(obj.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn db_exec(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    let sql = args.get(0).to_rust_string_lossy(scope);
    
    let params = if args.length() > 1 && args.get(1).is_object() && !args.get(1).is_null() && !args.get(1).is_undefined() {
        v8::json::stringify(scope, args.get(1)).map(|s| s.to_rust_string_lossy(scope)).unwrap_or_else(|| "{}".to_string())
    } else { "{}".to_string() };
    match crate::db::sqlite_db::db_exec(handle, &sql, &params) {
        Ok(rows) => rv.set(v8::Integer::new(scope, rows).into()),
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn db_query(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    let sql = args.get(0).to_rust_string_lossy(scope);
    let params = if args.length() > 1 && args.get(1).is_object() && !args.get(1).is_null() && !args.get(1).is_undefined() {
        v8::json::stringify(scope, args.get(1)).map(|s| s.to_rust_string_lossy(scope)).unwrap_or_else(|| "{}".to_string())
    } else { "{}".to_string() };
    match crate::db::sqlite_db::db_query(handle, &sql, &params) {
        Ok(json) => {
            let v8_str = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope));
            match v8::json::parse(scope, v8_str.into()) {
                Some(val) => rv.set(val),
                None => fs_throw!(scope, "db.query: invalid result"),
            }
        }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn db_prepare(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let db_handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    let sql = args.get(0).to_rust_string_lossy(scope);
    match crate::db::sqlite_db::db_prepare(db_handle, &sql) {
        Ok(stmt_handle) => {
            let obj = v8::Object::new(scope);
            let h = v8::Integer::new(scope, stmt_handle);
            let key = v8::String::new(scope, "_handle").unwrap();
            obj.set(scope, key.into(), h.into());
            let f = v8::Function::new(scope, db_stmt_exec).unwrap();
            let k = v8::String::new(scope, "exec").unwrap();
            obj.set(scope, k.into(), f.into());
            let f = v8::Function::new(scope, db_stmt_query).unwrap();
            let k = v8::String::new(scope, "query").unwrap();
            obj.set(scope, k.into(), f.into());
            let f = v8::Function::new(scope, db_stmt_close).unwrap();
            let k = v8::String::new(scope, "close").unwrap();
            obj.set(scope, k.into(), f.into());
            rv.set(obj.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn db_stmt_exec(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    let params = if args.length() > 0 && args.get(0).is_object() && !args.get(0).is_null() && !args.get(0).is_undefined() {
        v8::json::stringify(scope, args.get(0)).map(|s| s.to_rust_string_lossy(scope)).unwrap_or_else(|| "{}".to_string())
    } else { "{}".to_string() };
    match crate::db::sqlite_db::db_stmt_exec(handle, &params) {
        Ok(rows) => rv.set(v8::Integer::new(scope, rows).into()),
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn db_stmt_query(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    let params = if args.length() > 0 && args.get(0).is_object() && !args.get(0).is_null() && !args.get(0).is_undefined() {
        v8::json::stringify(scope, args.get(0)).map(|s| s.to_rust_string_lossy(scope)).unwrap_or_else(|| "{}".to_string())
    } else { "{}".to_string() };
    match crate::db::sqlite_db::db_stmt_query(handle, &params) {
        Ok(json) => {
            let v8_str = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope));
            match v8::json::parse(scope, v8_str.into()) {
                Some(val) => rv.set(val),
                None => fs_throw!(scope, "db.stmtQuery: invalid result"),
            }
        }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn db_stmt_close(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    crate::db::sqlite_db::db_stmt_close(handle);
}

pub fn db_close(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    crate::db::sqlite_db::db_close(handle);
}
