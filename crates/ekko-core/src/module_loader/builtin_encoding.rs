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
use crate::ffi::generated::encoding_api;

pub(super) fn encoding_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let b64 = v8::Object::new(scope);
    obj_fn!(scope, b64, "encode", enc_base64_encode);
    obj_fn!(scope, b64, "decode", enc_base64_decode);
    obj_fn!(scope, b64, "encodeUrl", enc_base64_url_encode);
    obj_fn!(scope, b64, "decodeUrl", enc_base64_url_decode);
    export_obj(scope, module, "base64", b64);
    let hex = v8::Object::new(scope);
    obj_fn!(scope, hex, "encode", enc_hex_encode);
    obj_fn!(scope, hex, "decode", enc_hex_decode);
    export_obj(scope, module, "hex", hex);
    let u8o = v8::Object::new(scope);
    obj_fn!(scope, u8o, "encode", enc_utf8_encode);
    obj_fn!(scope, u8o, "decode", enc_utf8_decode);
    export_obj(scope, module, "utf8", u8o);
    let u16o = v8::Object::new(scope);
    obj_fn!(scope, u16o, "encode", enc_utf16_le_encode);
    obj_fn!(scope, u16o, "decode", enc_utf16_le_decode);
    obj_fn!(scope, u16o, "encodeBE", enc_utf16_be_encode);
    obj_fn!(scope, u16o, "decodeBE", enc_utf16_be_decode);
    export_obj(scope, module, "utf16", u16o);
    Some(v8::undefined(scope).into())
}

fn get_encoding_api(scope: &mut v8::HandleScope) -> Option<Arc<encoding_api::Api>> {
    scope.get_slot::<Arc<encoding_api::Api>>().cloned()
}

pub fn enc_base64_encode(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let data = extract_bytes(scope, args.get(0));
    let api = match get_encoding_api(scope) { Some(a) => a, None => { fs_throw!(scope, "encoding: .NET library not loaded"); return; } };

    match api.encoding_base64Encode(&data) { Ok(s) => match v8::String::new(scope, &s) { Some(v) => rv.set(v.into()), None => fs_throw!(scope, "base64.encode: result exceeds V8 max string length") }, Err(e) => fs_throw!(scope, e) }
}

pub fn enc_base64_decode(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let s = args.get(0).to_rust_string_lossy(scope);
    let api = match get_encoding_api(scope) { Some(a) => a, None => { fs_throw!(scope, "encoding: .NET library not loaded"); return; } };
    match api.encoding_base64Decode(&s) { Ok(b) => { let st = v8::ArrayBuffer::new_backing_store_from_vec(b).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &st); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); } Err(e) => fs_throw!(scope, e) }
}

pub fn enc_base64_url_encode(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let data = extract_bytes(scope, args.get(0));
    let api = match get_encoding_api(scope) { Some(a) => a, None => { fs_throw!(scope, "encoding: .NET library not loaded"); return; } };
    match api.encoding_base64UrlEncode(&data) { Ok(s) => match v8::String::new(scope, &s) { Some(v) => rv.set(v.into()), None => fs_throw!(scope, "base64.encodeUrl: result exceeds V8 max string length") }, Err(e) => fs_throw!(scope, e) }
}

pub fn enc_base64_url_decode(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let s = args.get(0).to_rust_string_lossy(scope);
    let api = match get_encoding_api(scope) { Some(a) => a, None => { fs_throw!(scope, "encoding: .NET library not loaded"); return; } };
    match api.encoding_base64UrlDecode(&s) { Ok(b) => { let st = v8::ArrayBuffer::new_backing_store_from_vec(b).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &st); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); } Err(e) => fs_throw!(scope, e) }
}

pub fn enc_hex_encode(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let data = extract_bytes(scope, args.get(0));
    let api = match get_encoding_api(scope) { Some(a) => a, None => { fs_throw!(scope, "encoding: .NET library not loaded"); return; } };
    match api.encoding_hexEncode(&data) { Ok(s) => match v8::String::new(scope, &s) { Some(v) => rv.set(v.into()), None => fs_throw!(scope, "hex.encode: result exceeds V8 max string length (2x input)") }, Err(e) => fs_throw!(scope, e) }
}

pub fn enc_hex_decode(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let s = args.get(0).to_rust_string_lossy(scope);
    let api = match get_encoding_api(scope) { Some(a) => a, None => { fs_throw!(scope, "encoding: .NET library not loaded"); return; } };
    match api.encoding_hexDecode(&s) { Ok(b) => { let st = v8::ArrayBuffer::new_backing_store_from_vec(b).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &st); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); } Err(e) => fs_throw!(scope, e) }
}

pub fn enc_utf8_encode(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let s = args.get(0).to_rust_string_lossy(scope);
    let api = match get_encoding_api(scope) { Some(a) => a, None => { fs_throw!(scope, "encoding: .NET library not loaded"); return; } };
    match api.encoding_utf8Encode(&s) { Ok(b) => { let st = v8::ArrayBuffer::new_backing_store_from_vec(b).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &st); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); } Err(e) => fs_throw!(scope, e) }
}

pub fn enc_utf8_decode(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let data = extract_bytes(scope, args.get(0));
    let api = match get_encoding_api(scope) { Some(a) => a, None => { fs_throw!(scope, "encoding: .NET library not loaded"); return; } };
    match api.encoding_utf8Decode(&data) { Ok(s) => set_str_or_throw!(scope, rv, s, "ekko:text/encoding decode"), Err(e) => fs_throw!(scope, e) }
}

pub fn enc_utf16_le_encode(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let s = args.get(0).to_rust_string_lossy(scope);
    let api = match get_encoding_api(scope) { Some(a) => a, None => { fs_throw!(scope, "encoding: .NET library not loaded"); return; } };
    match api.encoding_utf16LeEncode(&s) { Ok(b) => { let st = v8::ArrayBuffer::new_backing_store_from_vec(b).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &st); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); } Err(e) => fs_throw!(scope, e) }
}

pub fn enc_utf16_le_decode(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let data = extract_bytes(scope, args.get(0));
    let api = match get_encoding_api(scope) { Some(a) => a, None => { fs_throw!(scope, "encoding: .NET library not loaded"); return; } };
    match api.encoding_utf16LeDecode(&data) { Ok(s) => set_str_or_throw!(scope, rv, s, "ekko:text/encoding decode"), Err(e) => fs_throw!(scope, e) }
}

pub fn enc_utf16_be_encode(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let s = args.get(0).to_rust_string_lossy(scope);
    let api = match get_encoding_api(scope) { Some(a) => a, None => { fs_throw!(scope, "encoding: .NET library not loaded"); return; } };
    match api.encoding_utf16BeEncode(&s) { Ok(b) => { let st = v8::ArrayBuffer::new_backing_store_from_vec(b).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &st); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); } Err(e) => fs_throw!(scope, e) }
}

pub fn enc_utf16_be_decode(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let data = extract_bytes(scope, args.get(0));
    let api = match get_encoding_api(scope) { Some(a) => a, None => { fs_throw!(scope, "encoding: .NET library not loaded"); return; } };
    match api.encoding_utf16BeDecode(&data) { Ok(s) => set_str_or_throw!(scope, rv, s, "ekko:text/encoding decode"), Err(e) => fs_throw!(scope, e) }
}
