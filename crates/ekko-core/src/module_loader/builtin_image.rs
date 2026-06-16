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
use crate::image as engine;
use std::cell::RefCell;
use std::collections::HashMap;

thread_local! {
    
    static IMAGE_STORE: RefCell<(u32, HashMap<u32, engine::DynamicImage>)> = RefCell::new((1, HashMap::new()));
}

fn store_insert(img: engine::DynamicImage) -> u32 {
    IMAGE_STORE.with(|cell| {
        let mut s = cell.borrow_mut();
        let id = s.0;
        s.0 = s.0.wrapping_add(1).max(1);
        s.1.insert(id, img);
        id
    })
}

fn store_dims(id: u32) -> Option<(u32, u32, &'static str)> {
    IMAGE_STORE.with(|cell| cell.borrow().1.get(&id).map(|i| (i.width(), i.height(), engine::color_type_name(i))))
}

fn transform<F>(id: u32, f: F) -> Result<u32, String>
where
    F: FnOnce(&engine::DynamicImage) -> engine::DynamicImage,
{
    let result = IMAGE_STORE.with(|cell| {
        let s = cell.borrow();
        s.1.get(&id).map(|src| f(src)).ok_or_else(|| "invalid image handle".to_string())
    })?;
    Ok(store_insert(result))
}

fn arg_u32(scope: &mut v8::HandleScope, args: &v8::FunctionCallbackArguments, i: i32) -> u32 {
    args.get(i).uint32_value(scope).unwrap_or(0)
}

fn image_decode(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let bytes = extract_bytes(scope, args.get(0));
    let hint = if args.length() > 1 && !args.get(1).is_null_or_undefined() {
        Some(args.get(1).to_rust_string_lossy(scope))
    } else {
        None
    };
    match engine::decode(&bytes, hint.as_deref()) {
        Ok(img) => { let id = store_insert(img); rv.set(v8::Integer::new_from_unsigned(scope, id).into()); }
        Err(e) => fs_throw!(scope, e),
    }
}

fn image_info_bytes(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let bytes = extract_bytes(scope, args.get(0));
    match engine::info(&bytes) {
        Ok((w, h, fmt)) => {
            let obj = v8::Object::new(scope);
            set_u32(scope, obj, "width", w);
            set_u32(scope, obj, "height", h);
            set_str(scope, obj, "format", fmt);
            rv.set(obj.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}

fn image_props(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let id = arg_u32(scope, &args, 0);
    match store_dims(id) {
        Some((w, h, ct)) => {
            let obj = v8::Object::new(scope);
            set_u32(scope, obj, "width", w);
            set_u32(scope, obj, "height", h);
            set_str(scope, obj, "colorType", ct);
            rv.set(obj.into());
        }
        None => fs_throw!(scope, "invalid image handle"),
    }
}

fn image_resize(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let id = arg_u32(scope, &args, 0);
    let (w, h) = (arg_u32(scope, &args, 1), arg_u32(scope, &args, 2));
    let filter = engine::filter_from_name(&args.get(3).to_rust_string_lossy(scope));
    let exact = args.get(4).boolean_value(scope);
    finish(scope, &mut rv, transform(id, |s| if exact { engine::resize_exact(s, w, h, filter) } else { engine::resize_fit(s, w, h, filter) }));
}

fn image_thumbnail(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let id = arg_u32(scope, &args, 0);
    let (w, h) = (arg_u32(scope, &args, 1), arg_u32(scope, &args, 2));
    finish(scope, &mut rv, transform(id, |s| engine::thumbnail(s, w, h)));
}

fn image_crop(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let id = arg_u32(scope, &args, 0);
    let (x, y, w, h) = (arg_u32(scope, &args, 1), arg_u32(scope, &args, 2), arg_u32(scope, &args, 3), arg_u32(scope, &args, 4));
    finish(scope, &mut rv, transform(id, |s| engine::crop(s, x, y, w, h)));
}

fn image_rotate(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let id = arg_u32(scope, &args, 0);
    let deg = arg_u32(scope, &args, 1);
    finish(scope, &mut rv, transform(id, |s| engine::rotate(s, deg)));
}

fn image_flip(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let id = arg_u32(scope, &args, 0);
    let horizontal = args.get(1).boolean_value(scope);
    finish(scope, &mut rv, transform(id, |s| engine::flip(s, horizontal)));
}

fn image_grayscale(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let id = arg_u32(scope, &args, 0);
    finish(scope, &mut rv, transform(id, engine::grayscale));
}

fn image_blur(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let id = arg_u32(scope, &args, 0);
    let sigma = args.get(1).number_value(scope).unwrap_or(1.0) as f32;
    finish(scope, &mut rv, transform(id, |s| engine::blur(s, sigma)));
}

fn image_brighten(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let id = arg_u32(scope, &args, 0);
    let value = args.get(1).int32_value(scope).unwrap_or(0);
    finish(scope, &mut rv, transform(id, |s| engine::brighten(s, value)));
}

fn image_to_bytes(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let id = arg_u32(scope, &args, 0);
    let bytes = IMAGE_STORE.with(|cell| cell.borrow().1.get(&id).map(|i| i.as_bytes().to_vec()));
    match bytes {
        Some(b) => rv.set(bytes_to_uint8array(scope, b)),
        None => fs_throw!(scope, "invalid image handle"),
    }
}

fn image_encode(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let id = arg_u32(scope, &args, 0);
    let fmt_name = args.get(1).to_rust_string_lossy(scope);
    let quality = if args.length() > 2 && !args.get(2).is_null_or_undefined() {
        Some(args.get(2).uint32_value(scope).unwrap_or(80).clamp(1, 100) as u8)
    } else {
        None
    };
    let format = match engine::format_from_name(&fmt_name) { Ok(f) => f, Err(e) => { fs_throw!(scope, e); return; } };
    let encoded = IMAGE_STORE.with(|cell| match cell.borrow().1.get(&id) {
        Some(img) => engine::encode(img, format, quality),
        None => Err("invalid image handle".to_string()),
    });
    match encoded {
        Ok(b) => rv.set(bytes_to_uint8array(scope, b)),
        Err(e) => fs_throw!(scope, e),
    }
}

fn image_free(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, _rv: v8::ReturnValue) {
    let id = arg_u32(scope, &args, 0);
    IMAGE_STORE.with(|cell| { cell.borrow_mut().1.remove(&id); });
}

fn set_u32(scope: &mut v8::HandleScope, obj: v8::Local<v8::Object>, key: &str, val: u32) {
    let k = v8::String::new(scope, key).unwrap();
    let v = v8::Integer::new_from_unsigned(scope, val);
    obj.set(scope, k.into(), v.into());
}
fn set_str(scope: &mut v8::HandleScope, obj: v8::Local<v8::Object>, key: &str, val: &str) {
    let k = v8::String::new(scope, key).unwrap();
    let v = v8::String::new(scope, val).unwrap();
    obj.set(scope, k.into(), v.into());
}
fn bytes_to_uint8array<'a>(scope: &mut v8::HandleScope<'a>, b: Vec<u8>) -> v8::Local<'a, v8::Value> {
    let store = v8::ArrayBuffer::new_backing_store_from_vec(b).make_shared();
    let ab = v8::ArrayBuffer::with_backing_store(scope, &store);
    let len = ab.byte_length();
    v8::Uint8Array::new(scope, ab, 0, len).unwrap().into()
}

fn finish(scope: &mut v8::HandleScope, rv: &mut v8::ReturnValue, r: Result<u32, String>) {
    match r {
        Ok(id) => rv.set(v8::Integer::new_from_unsigned(scope, id).into()),
        Err(e) => fs_throw!(scope, e),
    }
}

pub(super) fn image_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };
    let ops = v8::Object::new(scope);
    obj_fn!(scope, ops, "decode", image_decode);
    obj_fn!(scope, ops, "infoBytes", image_info_bytes);
    obj_fn!(scope, ops, "props", image_props);
    obj_fn!(scope, ops, "resize", image_resize);
    obj_fn!(scope, ops, "thumbnail", image_thumbnail);
    obj_fn!(scope, ops, "crop", image_crop);
    obj_fn!(scope, ops, "rotate", image_rotate);
    obj_fn!(scope, ops, "flip", image_flip);
    obj_fn!(scope, ops, "grayscale", image_grayscale);
    obj_fn!(scope, ops, "blur", image_blur);
    obj_fn!(scope, ops, "brighten", image_brighten);
    obj_fn!(scope, ops, "toBytes", image_to_bytes);
    obj_fn!(scope, ops, "encode", image_encode);
    obj_fn!(scope, ops, "free", image_free);

    let src = v8::String::new(scope, include_str!("../modules/image.js")).unwrap();
    let script = v8::Script::compile(scope, src, None)?;
    let iife_fn = script.run(scope)?;
    let func = v8::Local::<v8::Function>::try_from(iife_fn).ok()?;
    let undef = v8::undefined(scope).into();
    let result = func.call(scope, undef, &[ops.into()])?;
    let obj = v8::Local::<v8::Object>::try_from(result).ok()?;
    for name in ["info", "convert", "decode"] {
        let k = v8::String::new(scope, name).unwrap();
        let v = obj.get(scope, k.into()).unwrap();
        let _ = module.set_synthetic_module_export(scope, k, v);
    }
    Some(v8::undefined(scope).into())
}
