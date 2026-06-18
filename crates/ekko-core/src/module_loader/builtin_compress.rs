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
use crate::ffi::generated::compress_api;

pub(super) fn compress_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let gz = v8::Object::new(scope);
    obj_fn!(scope, gz, "compress", compress_gzip);
    obj_fn!(scope, gz, "decompress", decompress_gzip);
    obj_fn!(scope, gz, "createCompressStream", compress_gzip_create_stream);
    obj_fn!(scope, gz, "createDecompressStream", decompress_gzip_create_stream);
    export_obj(scope, module, "gzip", gz);
    let br = v8::Object::new(scope);
    obj_fn!(scope, br, "compress", compress_brotli);
    obj_fn!(scope, br, "decompress", decompress_brotli);
    obj_fn!(scope, br, "createCompressStream", compress_brotli_create_stream);
    obj_fn!(scope, br, "createDecompressStream", decompress_brotli_create_stream);
    export_obj(scope, module, "brotli", br);
    let df = v8::Object::new(scope);
    obj_fn!(scope, df, "compress", compress_deflate);
    obj_fn!(scope, df, "decompress", decompress_deflate);
    obj_fn!(scope, df, "createCompressStream", compress_deflate_create_stream);
    obj_fn!(scope, df, "createDecompressStream", decompress_deflate_create_stream);
    export_obj(scope, module, "deflate", df);
    Some(v8::undefined(scope).into())
}

fn get_compress_api(scope: &mut v8::HandleScope) -> Option<Arc<compress_api::Api>> {
    scope.get_slot::<Arc<compress_api::Api>>().cloned()
}

fn compress_map_level(scope: &mut v8::HandleScope, args: &v8::FunctionCallbackArguments, idx: i32) -> i32 {
    if args.length() > idx {
        let val = args.get(idx);
        if let Ok(obj) = v8::Local::<v8::Object>::try_from(val) {
            let key = v8::String::new(scope, "level").unwrap();
            if let Some(lv) = obj.get(scope, key.into()) {
                let s = lv.to_rust_string_lossy(scope);
                return match s.as_str() {
                    "fastest" => 1,
                    "optimal" => 2,
                    "smallest" => 3,
                    _ => 2,
                };
            }
        }
    }
    2
}

pub fn compress_gzip(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let data = extract_bytes(scope, args.get(0));
    let level = compress_map_level(scope, &args, 1);
    let api = match get_compress_api(scope) { Some(a) => a, None => { fs_throw!(scope, "compress: .NET library not loaded"); return; } };
    match api.compress_gzipCompress(&data, level) {
        Ok(b) => { let st = v8::ArrayBuffer::new_backing_store_from_vec(b).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &st); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn decompress_gzip(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let data = extract_bytes(scope, args.get(0));
    let api = match get_compress_api(scope) { Some(a) => a, None => { fs_throw!(scope, "compress: .NET library not loaded"); return; } };
    match api.compress_gzipDecompress(&data) {
        Ok(b) => { let st = v8::ArrayBuffer::new_backing_store_from_vec(b).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &st); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn compress_brotli(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let data = extract_bytes(scope, args.get(0));
    let level = compress_map_level(scope, &args, 1);
    let api = match get_compress_api(scope) { Some(a) => a, None => { fs_throw!(scope, "compress: .NET library not loaded"); return; } };
    match api.compress_brotliCompress(&data, level) {
        Ok(b) => { let st = v8::ArrayBuffer::new_backing_store_from_vec(b).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &st); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn decompress_brotli(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let data = extract_bytes(scope, args.get(0));
    let api = match get_compress_api(scope) { Some(a) => a, None => { fs_throw!(scope, "compress: .NET library not loaded"); return; } };
    match api.compress_brotliDecompress(&data) {
        Ok(b) => { let st = v8::ArrayBuffer::new_backing_store_from_vec(b).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &st); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn compress_deflate(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let data = extract_bytes(scope, args.get(0));
    let level = compress_map_level(scope, &args, 1);
    let api = match get_compress_api(scope) { Some(a) => a, None => { fs_throw!(scope, "compress: .NET library not loaded"); return; } };
    match api.compress_deflateCompress(&data, level) {
        Ok(b) => { let st = v8::ArrayBuffer::new_backing_store_from_vec(b).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &st); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn decompress_deflate(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let data = extract_bytes(scope, args.get(0));
    let api = match get_compress_api(scope) { Some(a) => a, None => { fs_throw!(scope, "compress: .NET library not loaded"); return; } };
    match api.compress_deflateDecompress(&data) {
        Ok(b) => { let st = v8::ArrayBuffer::new_backing_store_from_vec(b).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &st); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); }
        Err(e) => fs_throw!(scope, e),
    }
}

fn compress_create_stream_impl(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue, algorithm: &str, mode: &str) {
    let level = compress_map_level(scope, &args, 0);
    let api = match get_compress_api(scope) { Some(a) => a, None => { fs_throw!(scope, "compress: .NET library not loaded"); return; } };
    match api.compress_createStream(algorithm, mode, level) {
        Ok(handle) => {
            let obj = v8::Object::new(scope);
            let h = v8::Integer::new(scope, handle);
            let key = v8::String::new(scope, "_handle").unwrap();
            obj.set(scope, key.into(), h.into());
            let write_fn = v8::Function::new(scope, compress_stream_write).unwrap();
            let key = v8::String::new(scope, "write").unwrap();
            obj.set(scope, key.into(), write_fn.into());
            let finish_fn = v8::Function::new(scope, compress_stream_finish).unwrap();
            let key = v8::String::new(scope, "finish").unwrap();
            obj.set(scope, key.into(), finish_fn.into());
            rv.set(obj.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn compress_gzip_create_stream(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, rv: v8::ReturnValue) {
    compress_create_stream_impl(scope, args, rv, "gzip", "compress");
}

pub fn decompress_gzip_create_stream(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, rv: v8::ReturnValue) {
    compress_create_stream_impl(scope, args, rv, "gzip", "decompress");
}

pub fn compress_brotli_create_stream(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, rv: v8::ReturnValue) {
    compress_create_stream_impl(scope, args, rv, "brotli", "compress");
}

pub fn decompress_brotli_create_stream(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, rv: v8::ReturnValue) {
    compress_create_stream_impl(scope, args, rv, "brotli", "decompress");
}

pub fn compress_deflate_create_stream(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, rv: v8::ReturnValue) {
    compress_create_stream_impl(scope, args, rv, "deflate", "compress");
}

pub fn decompress_deflate_create_stream(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, rv: v8::ReturnValue) {
    compress_create_stream_impl(scope, args, rv, "deflate", "decompress");
}

fn compress_stream_write(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    let chunk = extract_bytes(scope, args.get(0));
    let api = match get_compress_api(scope) { Some(a) => a, None => { fs_throw!(scope, "compress: .NET library not loaded"); return; } };
    if let Err(e) = api.compress_streamWrite(handle, &chunk) { fs_throw!(scope, e); }
}

fn compress_stream_finish(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let this = args.this();
    let key = v8::String::new(scope, "_handle").unwrap();
    let handle = this.get(scope, key.into()).and_then(|v| v.int32_value(scope)).unwrap_or(-1);
    let api = match get_compress_api(scope) { Some(a) => a, None => { fs_throw!(scope, "compress: .NET library not loaded"); return; } };
    match api.compress_streamFinish(handle) {
        Ok(b) => { let st = v8::ArrayBuffer::new_backing_store_from_vec(b).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &st); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); }
        Err(e) => fs_throw!(scope, e),
    }
}
