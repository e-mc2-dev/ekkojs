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
    ekko_regex_create: unsafe extern "C" fn(NativeString, NativeString) -> NativeResult,
    ekko_regex_test: unsafe extern "C" fn(i32, NativeString) -> NativeResult,
    ekko_regex_match: unsafe extern "C" fn(i32, NativeString) -> NativeResult,
    ekko_regex_matchAll: unsafe extern "C" fn(i32, NativeString) -> NativeResult,
    ekko_regex_replace: unsafe extern "C" fn(i32, NativeString, NativeString) -> NativeResult,
    ekko_regex_split: unsafe extern "C" fn(i32, NativeString) -> NativeResult,
    ekko_regex_dispose: unsafe extern "C" fn(i32) -> NativeResult,
    free_string: unsafe extern "C" fn(NativeString),
    free_buffer: unsafe extern "C" fn(NativeBuffer),
}

impl Api {
    pub fn load(lib: libloading::Library) -> Result<Self, String> {
        let (
            ekko_regex_create,
            ekko_regex_test,
            ekko_regex_match,
            ekko_regex_matchAll,
            ekko_regex_replace,
            ekko_regex_split,
            ekko_regex_dispose,
            free_string,
            free_buffer,
        ) = unsafe {
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeString) -> NativeResult> = lib.get(b"ekko_regex_create").map_err(|e| e.to_string())?;
            let ekko_regex_create = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeString) -> NativeResult> = lib.get(b"ekko_regex_test").map_err(|e| e.to_string())?;
            let ekko_regex_test = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeString) -> NativeResult> = lib.get(b"ekko_regex_match").map_err(|e| e.to_string())?;
            let ekko_regex_match = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeString) -> NativeResult> = lib.get(b"ekko_regex_matchAll").map_err(|e| e.to_string())?;
            let ekko_regex_matchAll = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeString, NativeString) -> NativeResult> = lib.get(b"ekko_regex_replace").map_err(|e| e.to_string())?;
            let ekko_regex_replace = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeString) -> NativeResult> = lib.get(b"ekko_regex_split").map_err(|e| e.to_string())?;
            let ekko_regex_split = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_regex_dispose").map_err(|e| e.to_string())?;
            let ekko_regex_dispose = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString)> = lib.get(b"ekko_native_free_string").map_err(|e| e.to_string())?;
            let free_string = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer)> = lib.get(b"ekko_native_free_buffer").map_err(|e| e.to_string())?;
            let free_buffer = *s;
            (
                ekko_regex_create,
                ekko_regex_test,
                ekko_regex_match,
                ekko_regex_matchAll,
                ekko_regex_replace,
                ekko_regex_split,
                ekko_regex_dispose,
                free_string,
                free_buffer,
            )
        };
        Ok(Self {
            _lib: lib,
            ekko_regex_create,
            ekko_regex_test,
            ekko_regex_match,
            ekko_regex_matchAll,
            ekko_regex_replace,
            ekko_regex_split,
            ekko_regex_dispose,
            free_string,
            free_buffer,
        })
    }

    pub fn regex_create(&self, pattern: &str, flags: &str) -> Result<i32, String> {
        unsafe {
            let result = (self.ekko_regex_create)(NativeString::from_str(pattern), NativeString::from_str(flags));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value as i32)
        }
    }

    pub fn regex_test(&self, handle: i32, input: &str) -> Result<i32, String> {
        unsafe {
            let result = (self.ekko_regex_test)(handle, NativeString::from_str(input));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value as i32)
        }
    }

    pub fn regex_match(&self, handle: i32, input: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_regex_match)(handle, NativeString::from_str(input));
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

    pub fn regex_matchAll(&self, handle: i32, input: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_regex_matchAll)(handle, NativeString::from_str(input));
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

    pub fn regex_replace(&self, handle: i32, input: &str, replacement: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_regex_replace)(handle, NativeString::from_str(input), NativeString::from_str(replacement));
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

    pub fn regex_split(&self, handle: i32, input: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_regex_split)(handle, NativeString::from_str(input));
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

    pub fn regex_dispose(&self, handle: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_regex_dispose)(handle);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

}
