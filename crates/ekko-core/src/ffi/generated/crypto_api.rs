// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


#![allow(non_snake_case, unused_imports)]
#![allow(dead_code)]

use std::ffi::CStr;

#[repr(C)]
#[derive(Clone, Copy)]
pub struct NativeString {
    pub ptr: *mut u8,
    pub len: i32,
}

impl NativeString {
    pub fn to_string_lossy(&self) -> String {
        if self.ptr.is_null() || self.len <= 0 || self.len > 0x7FFF_0000 {
            return String::new();
        }
        unsafe {
            let slice = std::slice::from_raw_parts(self.ptr, self.len as usize);
            String::from_utf8_lossy(slice).to_string()
        }
    }

    pub fn from_str(s: &str) -> Self {
        let bytes = s.as_bytes();
        if bytes.is_empty() {
            return Self { ptr: std::ptr::null_mut(), len: 0 };
        }
        let len = i32::try_from(bytes.len()).expect("NativeString: string too large for i32 len");
        let ptr = unsafe {
            let layout = std::alloc::Layout::from_size_align(bytes.len(), 1).unwrap();
            let p = std::alloc::alloc(layout);
            if p.is_null() { std::alloc::handle_alloc_error(layout); }
            std::ptr::copy_nonoverlapping(bytes.as_ptr(), p, bytes.len());
            p
        };
        Self { ptr, len }
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct NativeBuffer {
    pub ptr: *mut u8,
    pub len: i32,
}

impl NativeBuffer {
    pub fn to_vec(&self) -> Vec<u8> {
        if self.ptr.is_null() || self.len <= 0 || self.len > 0x7FFF_0000 {
            return Vec::new();
        }
        unsafe { std::slice::from_raw_parts(self.ptr, self.len as usize).to_vec() }
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct NativeResult {
    pub is_ok: u8,
    pub int_value: i64,
    pub float_value: f64,
    pub string_value: NativeString,
    pub buffer_value: NativeBuffer,
    pub error_code: NativeString,
    pub error_message: NativeString,
    pub handle_value: i32,
}

unsafe impl Send for NativeString {}
unsafe impl Send for NativeBuffer {}
unsafe impl Send for NativeResult {}

pub struct Api {
    _lib: libloading::Library,
    ekko_crypto_hash: unsafe extern "C" fn(NativeString, NativeBuffer) -> NativeResult,
    ekko_crypto_hmac: unsafe extern "C" fn(NativeString, NativeBuffer, NativeBuffer) -> NativeResult,
    ekko_crypto_randomBytes: unsafe extern "C" fn(i32) -> NativeResult,
    ekko_crypto_randomUUID: unsafe extern "C" fn() -> NativeResult,
    ekko_crypto_hashHex: unsafe extern "C" fn(NativeString, NativeBuffer) -> NativeResult,
    ekko_crypto_generateKey: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_crypto_encrypt: unsafe extern "C" fn(NativeString, NativeBuffer, NativeBuffer) -> NativeResult,
    ekko_crypto_decrypt: unsafe extern "C" fn(NativeString, NativeBuffer, NativeBuffer) -> NativeResult,
    ekko_crypto_pbkdf2: unsafe extern "C" fn(NativeBuffer, NativeBuffer, i32, NativeString, i32) -> NativeResult,
    ekko_crypto_hkdf: unsafe extern "C" fn(NativeBuffer, NativeBuffer, NativeBuffer, NativeString, i32) -> NativeResult,
    ekko_crypto_rsaGenerateKeyPem: unsafe extern "C" fn(i32) -> NativeResult,
    ekko_crypto_rsaSign: unsafe extern "C" fn(NativeString, NativeBuffer) -> NativeResult,
    ekko_crypto_rsaVerify: unsafe extern "C" fn(NativeString, NativeBuffer, NativeBuffer) -> NativeResult,
    ekko_crypto_ecdsaGenerateKeyPem: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_crypto_ecdsaSign: unsafe extern "C" fn(NativeString, NativeBuffer) -> NativeResult,
    ekko_crypto_ecdsaVerify: unsafe extern "C" fn(NativeString, NativeBuffer, NativeBuffer) -> NativeResult,
    free_string: unsafe extern "C" fn(NativeString),
    free_buffer: unsafe extern "C" fn(NativeBuffer),
}

impl Api {
    pub fn load(lib: libloading::Library) -> Result<Self, String> {
        let (
            ekko_crypto_hash,
            ekko_crypto_hmac,
            ekko_crypto_randomBytes,
            ekko_crypto_randomUUID,
            ekko_crypto_hashHex,
            ekko_crypto_generateKey,
            ekko_crypto_encrypt,
            ekko_crypto_decrypt,
            ekko_crypto_pbkdf2,
            ekko_crypto_hkdf,
            ekko_crypto_rsaGenerateKeyPem,
            ekko_crypto_rsaSign,
            ekko_crypto_rsaVerify,
            ekko_crypto_ecdsaGenerateKeyPem,
            ekko_crypto_ecdsaSign,
            ekko_crypto_ecdsaVerify,
            free_string,
            free_buffer,
        ) = unsafe {
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeBuffer) -> NativeResult> = lib.get(b"ekko_crypto_hash").map_err(|e| e.to_string())?;
            let ekko_crypto_hash = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeBuffer, NativeBuffer) -> NativeResult> = lib.get(b"ekko_crypto_hmac").map_err(|e| e.to_string())?;
            let ekko_crypto_hmac = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_crypto_randomBytes").map_err(|e| e.to_string())?;
            let ekko_crypto_randomBytes = *s;
            let s: libloading::Symbol<unsafe extern "C" fn() -> NativeResult> = lib.get(b"ekko_crypto_randomUUID").map_err(|e| e.to_string())?;
            let ekko_crypto_randomUUID = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeBuffer) -> NativeResult> = lib.get(b"ekko_crypto_hashHex").map_err(|e| e.to_string())?;
            let ekko_crypto_hashHex = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_crypto_generateKey").map_err(|e| e.to_string())?;
            let ekko_crypto_generateKey = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeBuffer, NativeBuffer) -> NativeResult> = lib.get(b"ekko_crypto_encrypt").map_err(|e| e.to_string())?;
            let ekko_crypto_encrypt = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeBuffer, NativeBuffer) -> NativeResult> = lib.get(b"ekko_crypto_decrypt").map_err(|e| e.to_string())?;
            let ekko_crypto_decrypt = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer, NativeBuffer, i32, NativeString, i32) -> NativeResult> = lib.get(b"ekko_crypto_pbkdf2").map_err(|e| e.to_string())?;
            let ekko_crypto_pbkdf2 = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer, NativeBuffer, NativeBuffer, NativeString, i32) -> NativeResult> = lib.get(b"ekko_crypto_hkdf").map_err(|e| e.to_string())?;
            let ekko_crypto_hkdf = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_crypto_rsaGenerateKeyPem").map_err(|e| e.to_string())?;
            let ekko_crypto_rsaGenerateKeyPem = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeBuffer) -> NativeResult> = lib.get(b"ekko_crypto_rsaSign").map_err(|e| e.to_string())?;
            let ekko_crypto_rsaSign = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeBuffer, NativeBuffer) -> NativeResult> = lib.get(b"ekko_crypto_rsaVerify").map_err(|e| e.to_string())?;
            let ekko_crypto_rsaVerify = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_crypto_ecdsaGenerateKeyPem").map_err(|e| e.to_string())?;
            let ekko_crypto_ecdsaGenerateKeyPem = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeBuffer) -> NativeResult> = lib.get(b"ekko_crypto_ecdsaSign").map_err(|e| e.to_string())?;
            let ekko_crypto_ecdsaSign = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeBuffer, NativeBuffer) -> NativeResult> = lib.get(b"ekko_crypto_ecdsaVerify").map_err(|e| e.to_string())?;
            let ekko_crypto_ecdsaVerify = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString)> = lib.get(b"ekko_native_free_string").map_err(|e| e.to_string())?;
            let free_string = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer)> = lib.get(b"ekko_native_free_buffer").map_err(|e| e.to_string())?;
            let free_buffer = *s;
            (
                ekko_crypto_hash,
                ekko_crypto_hmac,
                ekko_crypto_randomBytes,
                ekko_crypto_randomUUID,
                ekko_crypto_hashHex,
                ekko_crypto_generateKey,
                ekko_crypto_encrypt,
                ekko_crypto_decrypt,
                ekko_crypto_pbkdf2,
                ekko_crypto_hkdf,
                ekko_crypto_rsaGenerateKeyPem,
                ekko_crypto_rsaSign,
                ekko_crypto_rsaVerify,
                ekko_crypto_ecdsaGenerateKeyPem,
                ekko_crypto_ecdsaSign,
                ekko_crypto_ecdsaVerify,
                free_string,
                free_buffer,
            )
        };
        Ok(Self {
            _lib: lib,
            ekko_crypto_hash,
            ekko_crypto_hmac,
            ekko_crypto_randomBytes,
            ekko_crypto_randomUUID,
            ekko_crypto_hashHex,
            ekko_crypto_generateKey,
            ekko_crypto_encrypt,
            ekko_crypto_decrypt,
            ekko_crypto_pbkdf2,
            ekko_crypto_hkdf,
            ekko_crypto_rsaGenerateKeyPem,
            ekko_crypto_rsaSign,
            ekko_crypto_rsaVerify,
            ekko_crypto_ecdsaGenerateKeyPem,
            ekko_crypto_ecdsaSign,
            ekko_crypto_ecdsaVerify,
            free_string,
            free_buffer,
        })
    }

    pub fn crypto_hash(&self, algorithm: &str, data: &[u8]) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_crypto_hash)(NativeString::from_str(algorithm), NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            let data = buf.to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn crypto_hmac(&self, algorithm: &str, key: &[u8], data: &[u8]) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_crypto_hmac)(NativeString::from_str(algorithm), NativeBuffer { ptr: key.as_ptr() as *mut u8, len: i32::try_from(key.len()).expect("buffer too large for i32") }, NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            let data = buf.to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn crypto_randomBytes(&self, count: i32) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_crypto_randomBytes)(count);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            let data = buf.to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn crypto_randomUUID(&self, ) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_crypto_randomUUID)();
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let s = result.string_value.to_string_lossy();
            (self.free_string)(result.string_value);
            Ok(s)
        }
    }

    pub fn crypto_hashHex(&self, algorithm: &str, data: &[u8]) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_crypto_hashHex)(NativeString::from_str(algorithm), NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let s = result.string_value.to_string_lossy();
            (self.free_string)(result.string_value);
            Ok(s)
        }
    }

    pub fn crypto_generateKey(&self, algorithm: &str) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_crypto_generateKey)(NativeString::from_str(algorithm));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            let data = buf.to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn crypto_encrypt(&self, algorithm: &str, key: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_crypto_encrypt)(NativeString::from_str(algorithm), NativeBuffer { ptr: key.as_ptr() as *mut u8, len: i32::try_from(key.len()).expect("buffer too large for i32") }, NativeBuffer { ptr: plaintext.as_ptr() as *mut u8, len: i32::try_from(plaintext.len()).expect("buffer too large for i32") });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            let data = buf.to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn crypto_decrypt(&self, algorithm: &str, key: &[u8], data: &[u8]) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_crypto_decrypt)(NativeString::from_str(algorithm), NativeBuffer { ptr: key.as_ptr() as *mut u8, len: i32::try_from(key.len()).expect("buffer too large for i32") }, NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            let data = buf.to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn crypto_pbkdf2(&self, password: &[u8], salt: &[u8], iterations: i32, hash: &str, length: i32) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_crypto_pbkdf2)(NativeBuffer { ptr: password.as_ptr() as *mut u8, len: i32::try_from(password.len()).expect("buffer too large for i32") }, NativeBuffer { ptr: salt.as_ptr() as *mut u8, len: i32::try_from(salt.len()).expect("buffer too large for i32") }, iterations, NativeString::from_str(hash), length);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            let data = buf.to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn crypto_hkdf(&self, ikm: &[u8], salt: &[u8], info: &[u8], hash: &str, length: i32) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_crypto_hkdf)(NativeBuffer { ptr: ikm.as_ptr() as *mut u8, len: i32::try_from(ikm.len()).expect("buffer too large for i32") }, NativeBuffer { ptr: salt.as_ptr() as *mut u8, len: i32::try_from(salt.len()).expect("buffer too large for i32") }, NativeBuffer { ptr: info.as_ptr() as *mut u8, len: i32::try_from(info.len()).expect("buffer too large for i32") }, NativeString::from_str(hash), length);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            let data = buf.to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn crypto_rsaGenerateKeyPem(&self, bits: i32) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_crypto_rsaGenerateKeyPem)(bits);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let s = result.string_value.to_string_lossy();
            (self.free_string)(result.string_value);
            Ok(s)
        }
    }

    pub fn crypto_rsaSign(&self, privatePem: &str, data: &[u8]) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_crypto_rsaSign)(NativeString::from_str(privatePem), NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            let data = buf.to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn crypto_rsaVerify(&self, publicPem: &str, data: &[u8], signature: &[u8]) -> Result<bool, String> {
        unsafe {
            let result = (self.ekko_crypto_rsaVerify)(NativeString::from_str(publicPem), NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") }, NativeBuffer { ptr: signature.as_ptr() as *mut u8, len: i32::try_from(signature.len()).expect("buffer too large for i32") });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value != 0)
        }
    }

    pub fn crypto_ecdsaGenerateKeyPem(&self, curve: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_crypto_ecdsaGenerateKeyPem)(NativeString::from_str(curve));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let s = result.string_value.to_string_lossy();
            (self.free_string)(result.string_value);
            Ok(s)
        }
    }

    pub fn crypto_ecdsaSign(&self, privatePem: &str, data: &[u8]) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_crypto_ecdsaSign)(NativeString::from_str(privatePem), NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            let data = buf.to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn crypto_ecdsaVerify(&self, publicPem: &str, data: &[u8], signature: &[u8]) -> Result<bool, String> {
        unsafe {
            let result = (self.ekko_crypto_ecdsaVerify)(NativeString::from_str(publicPem), NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") }, NativeBuffer { ptr: signature.as_ptr() as *mut u8, len: i32::try_from(signature.len()).expect("buffer too large for i32") });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value != 0)
        }
    }

}
