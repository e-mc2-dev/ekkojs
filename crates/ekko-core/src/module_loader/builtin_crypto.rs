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
use crate::ffi::generated::crypto_api;

pub(super) fn crypto_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };

    set_export_fn!(scope, module, "hash", crypto_hash);
    set_export_fn!(scope, module, "hmac", crypto_hmac);
    set_export_fn!(scope, module, "randomBytes", crypto_random_bytes);
    set_export_fn!(scope, module, "randomUUID", crypto_random_uuid);
    set_export_fn!(scope, module, "hashHex", crypto_hash_hex);
    set_export_fn!(scope, module, "generateKey", crypto_generate_key);
    set_export_fn!(scope, module, "encrypt", crypto_encrypt);
    set_export_fn!(scope, module, "decrypt", crypto_decrypt);
    set_export_fn!(scope, module, "pbkdf2", crypto_pbkdf2);
    set_export_fn!(scope, module, "hkdf", crypto_hkdf);
    set_export_fn!(scope, module, "rsaGenerateKeyPem", crypto_rsa_generate);
    set_export_fn!(scope, module, "rsaSign", crypto_rsa_sign);
    set_export_fn!(scope, module, "rsaVerify", crypto_rsa_verify);
    set_export_fn!(scope, module, "ecdsaGenerateKeyPem", crypto_ecdsa_generate);
    set_export_fn!(scope, module, "ecdsaSign", crypto_ecdsa_sign);
    set_export_fn!(scope, module, "ecdsaVerify", crypto_ecdsa_verify);

    Some(v8::undefined(scope).into())
}

fn get_crypto_api(scope: &mut v8::HandleScope) -> Option<Arc<crypto_api::Api>> {
    scope.get_slot::<Arc<crypto_api::Api>>().cloned()
}

pub(super) fn crypto_hash(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let algo = args.get(0).to_rust_string_lossy(scope);
    let data = extract_bytes(scope, args.get(1));
    let api = match get_crypto_api(scope) {
        Some(a) => a,
        None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; }
    };
    match api.crypto_hash(&algo, &data) {
        Ok(bytes) => {
            let store = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared();
            let ab = v8::ArrayBuffer::with_backing_store(scope, &store);
            let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap();
            rv.set(ua.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}

pub(super) fn crypto_hmac(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let algo = args.get(0).to_rust_string_lossy(scope);
    let key = extract_bytes(scope, args.get(1));
    let data = extract_bytes(scope, args.get(2));
    let api = match get_crypto_api(scope) {
        Some(a) => a,
        None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; }
    };
    match api.crypto_hmac(&algo, &key, &data) {
        Ok(bytes) => {
            let store = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared();
            let ab = v8::ArrayBuffer::with_backing_store(scope, &store);
            let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap();
            rv.set(ua.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}

pub(super) fn crypto_random_bytes(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let count = args.get(0).int32_value(scope).unwrap_or(0);
    let api = match get_crypto_api(scope) {
        Some(a) => a,
        None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; }
    };
    match api.crypto_randomBytes(count) {
        Ok(bytes) => {
            let store = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared();
            let ab = v8::ArrayBuffer::with_backing_store(scope, &store);
            let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap();
            rv.set(ua.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}

pub fn crypto_random_uuid(scope: &mut v8::HandleScope, _args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let api = match get_crypto_api(scope) {
        Some(a) => a,
        None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; }
    };
    match api.crypto_randomUUID() {
        Ok(s) => rv.set(v8::String::new(scope, &s).unwrap_or_else(|| v8::String::empty(scope)).into()),
        Err(e) => fs_throw!(scope, e),
    }
}

pub(super) fn crypto_hash_hex(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let algo = args.get(0).to_rust_string_lossy(scope);
    let data = extract_bytes(scope, args.get(1));
    let api = match get_crypto_api(scope) {
        Some(a) => a,
        None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; }
    };
    match api.crypto_hashHex(&algo, &data) {
        Ok(s) => rv.set(v8::String::new(scope, &s).unwrap_or_else(|| v8::String::empty(scope)).into()),
        Err(e) => fs_throw!(scope, e),
    }
}

pub(super) fn crypto_pbkdf2(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let password = extract_bytes(scope, args.get(0));
    let salt = extract_bytes(scope, args.get(1));
    let iterations = args.get(2).int32_value(scope).unwrap_or(100000);
    let hash = if args.length() > 3 && args.get(3).is_string() { args.get(3).to_rust_string_lossy(scope) } else { "sha256".to_string() };
    let length = if args.length() > 4 { args.get(4).int32_value(scope).unwrap_or(32) } else { 32 };
    let api = match get_crypto_api(scope) { Some(a) => a, None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; } };
    match api.crypto_pbkdf2(&password, &salt, iterations, &hash, length) {
        Ok(bytes) => { let s = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &s); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); }
        Err(e) => fs_throw!(scope, e),
    }
}

fn crypto_hkdf(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let ikm = extract_bytes(scope, args.get(0));
    let salt = extract_bytes(scope, args.get(1));
    let info = if args.length() > 2 && !args.get(2).is_undefined() { extract_bytes(scope, args.get(2)) } else { vec![] };
    let hash = if args.length() > 3 && args.get(3).is_string() { args.get(3).to_rust_string_lossy(scope) } else { "sha256".to_string() };
    let length = if args.length() > 4 { args.get(4).int32_value(scope).unwrap_or(32) } else { 32 };
    let api = match get_crypto_api(scope) { Some(a) => a, None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; } };
    match api.crypto_hkdf(&ikm, &salt, &info, &hash, length) {
        Ok(bytes) => { let s = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &s); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); }
        Err(e) => fs_throw!(scope, e),
    }
}

fn crypto_rsa_generate(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let bits = args.get(0).int32_value(scope).unwrap_or(2048);
    let api = match get_crypto_api(scope) { Some(a) => a, None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; } };
    match api.crypto_rsaGenerateKeyPem(bits) {
        Ok(pem) => {
            let parts: Vec<&str> = pem.split("\n---SPLIT---\n").collect();
            let obj = v8::Object::new(scope);
            let pk = v8::String::new(scope, "publicKey").unwrap();
            let pv = v8::String::new(scope, parts.get(0).unwrap_or(&"")).unwrap();
            obj.set(scope, pk.into(), pv.into());
            let sk = v8::String::new(scope, "privateKey").unwrap();
            let sv = v8::String::new(scope, parts.get(1).unwrap_or(&"")).unwrap();
            obj.set(scope, sk.into(), sv.into());
            rv.set(obj.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}

fn crypto_rsa_sign(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let pem = args.get(0).to_rust_string_lossy(scope);
    let data = extract_bytes(scope, args.get(1));
    let api = match get_crypto_api(scope) { Some(a) => a, None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; } };
    match api.crypto_rsaSign(&pem, &data) {
        Ok(bytes) => { let s = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &s); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); }
        Err(e) => fs_throw!(scope, e),
    }
}

fn crypto_rsa_verify(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let pem = args.get(0).to_rust_string_lossy(scope);
    let data = extract_bytes(scope, args.get(1));
    let sig = extract_bytes(scope, args.get(2));
    let api = match get_crypto_api(scope) { Some(a) => a, None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; } };
    match api.crypto_rsaVerify(&pem, &data, &sig) {
        Ok(valid) => rv.set(v8::Boolean::new(scope, valid).into()),
        Err(e) => fs_throw!(scope, e),
    }
}

fn crypto_ecdsa_generate(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let curve = if args.length() > 0 && args.get(0).is_string() { args.get(0).to_rust_string_lossy(scope) } else { "P-256".to_string() };
    let api = match get_crypto_api(scope) { Some(a) => a, None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; } };
    match api.crypto_ecdsaGenerateKeyPem(&curve) {
        Ok(pem) => {
            let parts: Vec<&str> = pem.split("\n---SPLIT---\n").collect();
            let obj = v8::Object::new(scope);
            let pk = v8::String::new(scope, "publicKey").unwrap();
            let pv = v8::String::new(scope, parts.get(0).unwrap_or(&"")).unwrap();
            obj.set(scope, pk.into(), pv.into());
            let sk = v8::String::new(scope, "privateKey").unwrap();
            let sv = v8::String::new(scope, parts.get(1).unwrap_or(&"")).unwrap();
            obj.set(scope, sk.into(), sv.into());
            rv.set(obj.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}

fn crypto_ecdsa_sign(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let pem = args.get(0).to_rust_string_lossy(scope);
    let data = extract_bytes(scope, args.get(1));
    let api = match get_crypto_api(scope) { Some(a) => a, None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; } };
    match api.crypto_ecdsaSign(&pem, &data) {
        Ok(bytes) => { let s = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared(); let ab = v8::ArrayBuffer::with_backing_store(scope, &s); let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap(); rv.set(ua.into()); }
        Err(e) => fs_throw!(scope, e),
    }
}

fn crypto_ecdsa_verify(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let pem = args.get(0).to_rust_string_lossy(scope);
    let data = extract_bytes(scope, args.get(1));
    let sig = extract_bytes(scope, args.get(2));
    let api = match get_crypto_api(scope) { Some(a) => a, None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; } };
    match api.crypto_ecdsaVerify(&pem, &data, &sig) {
        Ok(valid) => rv.set(v8::Boolean::new(scope, valid).into()),
        Err(e) => fs_throw!(scope, e),
    }
}

fn crypto_generate_key(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let algo = args.get(0).to_rust_string_lossy(scope);
    let api = match get_crypto_api(scope) {
        Some(a) => a,
        None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; }
    };
    match api.crypto_generateKey(&algo) {
        Ok(bytes) => {
            let store = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared();
            let ab = v8::ArrayBuffer::with_backing_store(scope, &store);
            let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap();
            rv.set(ua.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}

fn crypto_encrypt(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let algo = args.get(0).to_rust_string_lossy(scope);
    let key = extract_bytes(scope, args.get(1));
    let plaintext = extract_bytes(scope, args.get(2));
    let api = match get_crypto_api(scope) {
        Some(a) => a,
        None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; }
    };
    match api.crypto_encrypt(&algo, &key, &plaintext) {
        Ok(bytes) => {
            let store = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared();
            let ab = v8::ArrayBuffer::with_backing_store(scope, &store);
            let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap();
            rv.set(ua.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}

fn crypto_decrypt(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    check_perm!(scope, "crypto");
    let algo = args.get(0).to_rust_string_lossy(scope);
    let key = extract_bytes(scope, args.get(1));
    let data = extract_bytes(scope, args.get(2));
    let api = match get_crypto_api(scope) {
        Some(a) => a,
        None => { fs_throw!(scope, "crypto: .NET library not loaded"); return; }
    };
    match api.crypto_decrypt(&algo, &key, &data) {
        Ok(bytes) => {
            let store = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared();
            let ab = v8::ArrayBuffer::with_backing_store(scope, &store);
            let ua = v8::Uint8Array::new(scope, ab, 0, ab.byte_length()).unwrap();
            rv.set(ua.into());
        }
        Err(e) => fs_throw!(scope, e),
    }
}
