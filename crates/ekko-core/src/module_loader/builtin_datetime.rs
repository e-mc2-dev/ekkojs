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
use std::sync::Arc;
use crate::ffi::generated::date_time_api;

pub(super) fn datetime_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let dt = v8::Object::new(scope);
    obj_fn!(scope, dt, "now", datetime_now);
    obj_fn!(scope, dt, "nowUtc", datetime_now_utc);
    obj_fn!(scope, dt, "parse", datetime_parse);
    obj_fn!(scope, dt, "format", datetime_format);
    obj_fn!(scope, dt, "add", datetime_add);
    obj_fn!(scope, dt, "diff", datetime_diff);
    obj_fn!(scope, dt, "epoch", datetime_epoch);
    obj_fn!(scope, dt, "fromEpoch", datetime_from_epoch);
    export_obj(scope, module, "datetime", dt);
    let tz = v8::Object::new(scope);
    obj_fn!(scope, tz, "list", timezone_list);
    obj_fn!(scope, tz, "convert", timezone_convert);
    obj_fn!(scope, tz, "info", timezone_info);
    export_obj(scope, module, "timezone", tz);
    Some(v8::undefined(scope).into())
}

fn get_datetime_api(scope: &mut v8::HandleScope) -> Option<Arc<date_time_api::Api>> {
    scope.get_slot::<Arc<date_time_api::Api>>().cloned()
}

pub fn datetime_now(scope: &mut v8::HandleScope, _args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let api = match get_datetime_api(scope) { Some(a) => a, None => { fs_throw!(scope, "datetime: .NET library not loaded"); return; } };
    match api.datetime_now() {
        Ok(json) => { let s = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope)); match v8::json::parse(scope, s.into()) { Some(v) => rv.set(v), None => fs_throw!(scope, "datetime.now: parse error") } }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn datetime_now_utc(scope: &mut v8::HandleScope, _args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let api = match get_datetime_api(scope) { Some(a) => a, None => { fs_throw!(scope, "datetime: .NET library not loaded"); return; } };
    match api.datetime_nowUtc() {
        Ok(json) => { let s = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope)); match v8::json::parse(scope, s.into()) { Some(v) => rv.set(v), None => fs_throw!(scope, "datetime.nowUtc: parse error") } }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn datetime_parse(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let input = args.get(0).to_rust_string_lossy(scope);
    let format = if args.length() > 1 && !args.get(1).is_undefined() && !args.get(1).is_null() {
        args.get(1).to_rust_string_lossy(scope)
    } else { String::new() };
    let api = match get_datetime_api(scope) { Some(a) => a, None => { fs_throw!(scope, "datetime: .NET library not loaded"); return; } };
    match api.datetime_parse(&input, &format) {
        Ok(json) => { let s = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope)); match v8::json::parse(scope, s.into()) { Some(v) => rv.set(v), None => fs_throw!(scope, "datetime.parse: parse error") } }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn datetime_format(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let dt = args.get(0);
    
    let iso = if dt.is_object() {
        let obj = v8::Local::<v8::Object>::try_from(dt).unwrap();
        let k = v8::String::new(scope, "iso").unwrap();
        obj.get(scope, k.into()).map(|v| v.to_rust_string_lossy(scope)).unwrap_or_default()
    } else { dt.to_rust_string_lossy(scope) };
    let pattern = args.get(1).to_rust_string_lossy(scope);
    let api = match get_datetime_api(scope) { Some(a) => a, None => { fs_throw!(scope, "datetime: .NET library not loaded"); return; } };
    match api.datetime_format(&iso, &pattern) {
        Ok(s) => rv.set(v8::String::new(scope, &s).unwrap_or_else(|| v8::String::empty(scope)).into()),
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn datetime_add(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let dt = args.get(0);
    let iso = if dt.is_object() {
        let obj = v8::Local::<v8::Object>::try_from(dt).unwrap();
        let k = v8::String::new(scope, "iso").unwrap();
        obj.get(scope, k.into()).map(|v| v.to_rust_string_lossy(scope)).unwrap_or_default()
    } else { dt.to_rust_string_lossy(scope) };
    let (days, hours, mins, secs, ms) = if args.length() > 1 && args.get(1).is_object() {
        let opts = v8::Local::<v8::Object>::try_from(args.get(1)).unwrap();
        let kd = v8::String::new(scope, "days").unwrap();
        let kh = v8::String::new(scope, "hours").unwrap();
        let km = v8::String::new(scope, "minutes").unwrap();
        let ks = v8::String::new(scope, "seconds").unwrap();
        let kms = v8::String::new(scope, "milliseconds").unwrap();
        (
            opts.get(scope, kd.into()).and_then(|v| v.int32_value(scope)).unwrap_or(0),
            opts.get(scope, kh.into()).and_then(|v| v.int32_value(scope)).unwrap_or(0),
            opts.get(scope, km.into()).and_then(|v| v.int32_value(scope)).unwrap_or(0),
            opts.get(scope, ks.into()).and_then(|v| v.int32_value(scope)).unwrap_or(0),
            opts.get(scope, kms.into()).and_then(|v| v.int32_value(scope)).unwrap_or(0),
        )
    } else { (0,0,0,0,0) };
    let api = match get_datetime_api(scope) { Some(a) => a, None => { fs_throw!(scope, "datetime: .NET library not loaded"); return; } };
    match api.datetime_add(&iso, days, hours, mins, secs, ms) {
        Ok(json) => { let s = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope)); match v8::json::parse(scope, s.into()) { Some(v) => rv.set(v), None => fs_throw!(scope, "datetime.add: parse error") } }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn datetime_diff(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    
    let get_iso = |scope: &mut v8::HandleScope, val: v8::Local<v8::Value>| -> String {
        if val.is_object() {
            let obj = v8::Local::<v8::Object>::try_from(val).unwrap();
            let k = v8::String::new(scope, "iso").unwrap();
            obj.get(scope, k.into()).map(|v| v.to_rust_string_lossy(scope)).unwrap_or_default()
        } else { val.to_rust_string_lossy(scope) }
    };
    let a = get_iso(scope, args.get(0));
    let b = get_iso(scope, args.get(1));
    let api = match get_datetime_api(scope) { Some(a) => a, None => { fs_throw!(scope, "datetime: .NET library not loaded"); return; } };
    match api.datetime_diff(&a, &b) {
        Ok(json) => { let s = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope)); match v8::json::parse(scope, s.into()) { Some(v) => rv.set(v), None => fs_throw!(scope, "datetime.diff: parse error") } }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn datetime_epoch(scope: &mut v8::HandleScope, _args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let api = match get_datetime_api(scope) { Some(a) => a, None => { fs_throw!(scope, "datetime: .NET library not loaded"); return; } };
    match api.datetime_epoch() {
        Ok(ms) => rv.set(v8::Number::new(scope, ms as f64).into()),
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn datetime_from_epoch(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let ms = args.get(0).number_value(scope).unwrap_or(0.0) as i64;
    let api = match get_datetime_api(scope) { Some(a) => a, None => { fs_throw!(scope, "datetime: .NET library not loaded"); return; } };
    match api.datetime_fromEpoch(ms) {
        Ok(json) => { let s = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope)); match v8::json::parse(scope, s.into()) { Some(v) => rv.set(v), None => fs_throw!(scope, "datetime.fromEpoch: parse error") } }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn timezone_list(scope: &mut v8::HandleScope, _args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let api = match get_datetime_api(scope) { Some(a) => a, None => { fs_throw!(scope, "datetime: .NET library not loaded"); return; } };
    match api.timezone_list() {
        Ok(json) => { let s = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope)); match v8::json::parse(scope, s.into()) { Some(v) => rv.set(v), None => fs_throw!(scope, "timezone.list: parse error") } }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn timezone_convert(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let dt = args.get(0);
    let iso = if dt.is_object() {
        let obj = v8::Local::<v8::Object>::try_from(dt).unwrap();
        let k = v8::String::new(scope, "iso").unwrap();
        obj.get(scope, k.into()).map(|v| v.to_rust_string_lossy(scope)).unwrap_or_default()
    } else { dt.to_rust_string_lossy(scope) };
    let zone = args.get(1).to_rust_string_lossy(scope);
    let api = match get_datetime_api(scope) { Some(a) => a, None => { fs_throw!(scope, "datetime: .NET library not loaded"); return; } };
    match api.timezone_convert(&iso, &zone) {
        Ok(json) => { let s = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope)); match v8::json::parse(scope, s.into()) { Some(v) => rv.set(v), None => fs_throw!(scope, "timezone.convert: parse error") } }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn timezone_info(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let zone = args.get(0).to_rust_string_lossy(scope);
    let api = match get_datetime_api(scope) { Some(a) => a, None => { fs_throw!(scope, "datetime: .NET library not loaded"); return; } };
    match api.timezone_info(&zone) {
        Ok(json) => { let s = v8::String::new(scope, &json).unwrap_or_else(|| v8::String::empty(scope)); match v8::json::parse(scope, s.into()) { Some(v) => rv.set(v), None => fs_throw!(scope, "timezone.info: parse error") } }
        Err(e) => fs_throw!(scope, e),
    }
}
