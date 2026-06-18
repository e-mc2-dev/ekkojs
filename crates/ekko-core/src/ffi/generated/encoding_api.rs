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
        if self.ptr.is_null() || self.len <= 0 {
            return String::new();
        }
        unsafe {
            let slice = std::slice::from_raw_parts(self.ptr, self.len as usize);
            String::from_utf8_lossy(slice).to_string()
        }
    }

    pub fn from_str(s: &str) -> Self {
        let bytes = s.as_bytes();
        let ptr = unsafe {
            let layout = std::alloc::Layout::from_size_align(bytes.len(), 1).unwrap();
            let p = std::alloc::alloc(layout);
            std::ptr::copy_nonoverlapping(bytes.as_ptr(), p, bytes.len());
            p
        };
        Self { ptr, len: bytes.len() as i32 }
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct NativeBuffer {
    pub ptr: *mut u8,
    pub len: i32,
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
    ekko_encoding_base64Encode: unsafe extern "C" fn(NativeBuffer) -> NativeResult,
    ekko_encoding_base64Decode: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_encoding_base64UrlEncode: unsafe extern "C" fn(NativeBuffer) -> NativeResult,
    ekko_encoding_base64UrlDecode: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_encoding_hexEncode: unsafe extern "C" fn(NativeBuffer) -> NativeResult,
    ekko_encoding_hexDecode: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_encoding_utf8Encode: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_encoding_utf8Decode: unsafe extern "C" fn(NativeBuffer) -> NativeResult,
    ekko_encoding_utf16LeEncode: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_encoding_utf16LeDecode: unsafe extern "C" fn(NativeBuffer) -> NativeResult,
    ekko_encoding_utf16BeEncode: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_encoding_utf16BeDecode: unsafe extern "C" fn(NativeBuffer) -> NativeResult,
    free_string: unsafe extern "C" fn(NativeString),
    free_buffer: unsafe extern "C" fn(NativeBuffer),
}

impl Api {
    pub fn load(lib: libloading::Library) -> Result<Self, String> {
        let (
            ekko_encoding_base64Encode,
            ekko_encoding_base64Decode,
            ekko_encoding_base64UrlEncode,
            ekko_encoding_base64UrlDecode,
            ekko_encoding_hexEncode,
            ekko_encoding_hexDecode,
            ekko_encoding_utf8Encode,
            ekko_encoding_utf8Decode,
            ekko_encoding_utf16LeEncode,
            ekko_encoding_utf16LeDecode,
            ekko_encoding_utf16BeEncode,
            ekko_encoding_utf16BeDecode,
            free_string,
            free_buffer,
        ) = unsafe {
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer) -> NativeResult> = lib.get(b"ekko_encoding_base64Encode").map_err(|e| e.to_string())?;
            let ekko_encoding_base64Encode = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_encoding_base64Decode").map_err(|e| e.to_string())?;
            let ekko_encoding_base64Decode = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer) -> NativeResult> = lib.get(b"ekko_encoding_base64UrlEncode").map_err(|e| e.to_string())?;
            let ekko_encoding_base64UrlEncode = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_encoding_base64UrlDecode").map_err(|e| e.to_string())?;
            let ekko_encoding_base64UrlDecode = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer) -> NativeResult> = lib.get(b"ekko_encoding_hexEncode").map_err(|e| e.to_string())?;
            let ekko_encoding_hexEncode = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_encoding_hexDecode").map_err(|e| e.to_string())?;
            let ekko_encoding_hexDecode = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_encoding_utf8Encode").map_err(|e| e.to_string())?;
            let ekko_encoding_utf8Encode = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer) -> NativeResult> = lib.get(b"ekko_encoding_utf8Decode").map_err(|e| e.to_string())?;
            let ekko_encoding_utf8Decode = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_encoding_utf16LeEncode").map_err(|e| e.to_string())?;
            let ekko_encoding_utf16LeEncode = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer) -> NativeResult> = lib.get(b"ekko_encoding_utf16LeDecode").map_err(|e| e.to_string())?;
            let ekko_encoding_utf16LeDecode = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_encoding_utf16BeEncode").map_err(|e| e.to_string())?;
            let ekko_encoding_utf16BeEncode = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer) -> NativeResult> = lib.get(b"ekko_encoding_utf16BeDecode").map_err(|e| e.to_string())?;
            let ekko_encoding_utf16BeDecode = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString)> = lib.get(b"ekko_native_free_string").map_err(|e| e.to_string())?;
            let free_string = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer)> = lib.get(b"ekko_native_free_buffer").map_err(|e| e.to_string())?;
            let free_buffer = *s;
            (
                ekko_encoding_base64Encode,
                ekko_encoding_base64Decode,
                ekko_encoding_base64UrlEncode,
                ekko_encoding_base64UrlDecode,
                ekko_encoding_hexEncode,
                ekko_encoding_hexDecode,
                ekko_encoding_utf8Encode,
                ekko_encoding_utf8Decode,
                ekko_encoding_utf16LeEncode,
                ekko_encoding_utf16LeDecode,
                ekko_encoding_utf16BeEncode,
                ekko_encoding_utf16BeDecode,
                free_string,
                free_buffer,
            )
        };
        Ok(Self {
            _lib: lib,
            ekko_encoding_base64Encode,
            ekko_encoding_base64Decode,
            ekko_encoding_base64UrlEncode,
            ekko_encoding_base64UrlDecode,
            ekko_encoding_hexEncode,
            ekko_encoding_hexDecode,
            ekko_encoding_utf8Encode,
            ekko_encoding_utf8Decode,
            ekko_encoding_utf16LeEncode,
            ekko_encoding_utf16LeDecode,
            ekko_encoding_utf16BeEncode,
            ekko_encoding_utf16BeDecode,
            free_string,
            free_buffer,
        })
    }

    pub fn encoding_base64Encode(&self, data: &[u8]) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_encoding_base64Encode)(NativeBuffer { ptr: data.as_ptr() as *mut u8, len: data.len() as i32 });
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

    pub fn encoding_base64Decode(&self, s: &str) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_encoding_base64Decode)(NativeString::from_str(s));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            if buf.ptr.is_null() || buf.len <= 0 {
                return Ok(Vec::new());
            }
            let data = std::slice::from_raw_parts(buf.ptr, buf.len as usize).to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn encoding_base64UrlEncode(&self, data: &[u8]) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_encoding_base64UrlEncode)(NativeBuffer { ptr: data.as_ptr() as *mut u8, len: data.len() as i32 });
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

    pub fn encoding_base64UrlDecode(&self, s: &str) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_encoding_base64UrlDecode)(NativeString::from_str(s));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            if buf.ptr.is_null() || buf.len <= 0 {
                return Ok(Vec::new());
            }
            let data = std::slice::from_raw_parts(buf.ptr, buf.len as usize).to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn encoding_hexEncode(&self, data: &[u8]) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_encoding_hexEncode)(NativeBuffer { ptr: data.as_ptr() as *mut u8, len: data.len() as i32 });
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

    pub fn encoding_hexDecode(&self, s: &str) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_encoding_hexDecode)(NativeString::from_str(s));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            if buf.ptr.is_null() || buf.len <= 0 {
                return Ok(Vec::new());
            }
            let data = std::slice::from_raw_parts(buf.ptr, buf.len as usize).to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn encoding_utf8Encode(&self, s: &str) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_encoding_utf8Encode)(NativeString::from_str(s));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            if buf.ptr.is_null() || buf.len <= 0 {
                return Ok(Vec::new());
            }
            let data = std::slice::from_raw_parts(buf.ptr, buf.len as usize).to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn encoding_utf8Decode(&self, data: &[u8]) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_encoding_utf8Decode)(NativeBuffer { ptr: data.as_ptr() as *mut u8, len: data.len() as i32 });
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

    pub fn encoding_utf16LeEncode(&self, s: &str) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_encoding_utf16LeEncode)(NativeString::from_str(s));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            if buf.ptr.is_null() || buf.len <= 0 {
                return Ok(Vec::new());
            }
            let data = std::slice::from_raw_parts(buf.ptr, buf.len as usize).to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn encoding_utf16LeDecode(&self, data: &[u8]) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_encoding_utf16LeDecode)(NativeBuffer { ptr: data.as_ptr() as *mut u8, len: data.len() as i32 });
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

    pub fn encoding_utf16BeEncode(&self, s: &str) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_encoding_utf16BeEncode)(NativeString::from_str(s));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            let buf = result.buffer_value;
            if buf.ptr.is_null() || buf.len <= 0 {
                return Ok(Vec::new());
            }
            let data = std::slice::from_raw_parts(buf.ptr, buf.len as usize).to_vec();
            (self.free_buffer)(buf);
            Ok(data)
        }
    }

    pub fn encoding_utf16BeDecode(&self, data: &[u8]) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_encoding_utf16BeDecode)(NativeBuffer { ptr: data.as_ptr() as *mut u8, len: data.len() as i32 });
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

}
