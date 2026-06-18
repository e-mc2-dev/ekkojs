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
    ekko_datetime_now: unsafe extern "C" fn() -> NativeResult,
    ekko_datetime_nowUtc: unsafe extern "C" fn() -> NativeResult,
    ekko_datetime_parse: unsafe extern "C" fn(NativeString, NativeString) -> NativeResult,
    ekko_datetime_format: unsafe extern "C" fn(NativeString, NativeString) -> NativeResult,
    ekko_datetime_add: unsafe extern "C" fn(NativeString, i32, i32, i32, i32, i32) -> NativeResult,
    ekko_datetime_diff: unsafe extern "C" fn(NativeString, NativeString) -> NativeResult,
    ekko_datetime_epoch: unsafe extern "C" fn() -> NativeResult,
    ekko_datetime_fromEpoch: unsafe extern "C" fn(i64) -> NativeResult,
    ekko_timezone_list: unsafe extern "C" fn() -> NativeResult,
    ekko_timezone_convert: unsafe extern "C" fn(NativeString, NativeString) -> NativeResult,
    ekko_timezone_info: unsafe extern "C" fn(NativeString) -> NativeResult,
    free_string: unsafe extern "C" fn(NativeString),
    free_buffer: unsafe extern "C" fn(NativeBuffer),
}

impl Api {
    pub fn load(lib: libloading::Library) -> Result<Self, String> {
        let (
            ekko_datetime_now,
            ekko_datetime_nowUtc,
            ekko_datetime_parse,
            ekko_datetime_format,
            ekko_datetime_add,
            ekko_datetime_diff,
            ekko_datetime_epoch,
            ekko_datetime_fromEpoch,
            ekko_timezone_list,
            ekko_timezone_convert,
            ekko_timezone_info,
            free_string,
            free_buffer,
        ) = unsafe {
            let s: libloading::Symbol<unsafe extern "C" fn() -> NativeResult> = lib.get(b"ekko_datetime_now").map_err(|e| e.to_string())?;
            let ekko_datetime_now = *s;
            let s: libloading::Symbol<unsafe extern "C" fn() -> NativeResult> = lib.get(b"ekko_datetime_nowUtc").map_err(|e| e.to_string())?;
            let ekko_datetime_nowUtc = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeString) -> NativeResult> = lib.get(b"ekko_datetime_parse").map_err(|e| e.to_string())?;
            let ekko_datetime_parse = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeString) -> NativeResult> = lib.get(b"ekko_datetime_format").map_err(|e| e.to_string())?;
            let ekko_datetime_format = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, i32, i32, i32, i32, i32) -> NativeResult> = lib.get(b"ekko_datetime_add").map_err(|e| e.to_string())?;
            let ekko_datetime_add = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeString) -> NativeResult> = lib.get(b"ekko_datetime_diff").map_err(|e| e.to_string())?;
            let ekko_datetime_diff = *s;
            let s: libloading::Symbol<unsafe extern "C" fn() -> NativeResult> = lib.get(b"ekko_datetime_epoch").map_err(|e| e.to_string())?;
            let ekko_datetime_epoch = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i64) -> NativeResult> = lib.get(b"ekko_datetime_fromEpoch").map_err(|e| e.to_string())?;
            let ekko_datetime_fromEpoch = *s;
            let s: libloading::Symbol<unsafe extern "C" fn() -> NativeResult> = lib.get(b"ekko_timezone_list").map_err(|e| e.to_string())?;
            let ekko_timezone_list = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeString) -> NativeResult> = lib.get(b"ekko_timezone_convert").map_err(|e| e.to_string())?;
            let ekko_timezone_convert = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_timezone_info").map_err(|e| e.to_string())?;
            let ekko_timezone_info = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString)> = lib.get(b"ekko_native_free_string").map_err(|e| e.to_string())?;
            let free_string = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer)> = lib.get(b"ekko_native_free_buffer").map_err(|e| e.to_string())?;
            let free_buffer = *s;
            (
                ekko_datetime_now,
                ekko_datetime_nowUtc,
                ekko_datetime_parse,
                ekko_datetime_format,
                ekko_datetime_add,
                ekko_datetime_diff,
                ekko_datetime_epoch,
                ekko_datetime_fromEpoch,
                ekko_timezone_list,
                ekko_timezone_convert,
                ekko_timezone_info,
                free_string,
                free_buffer,
            )
        };
        Ok(Self {
            _lib: lib,
            ekko_datetime_now,
            ekko_datetime_nowUtc,
            ekko_datetime_parse,
            ekko_datetime_format,
            ekko_datetime_add,
            ekko_datetime_diff,
            ekko_datetime_epoch,
            ekko_datetime_fromEpoch,
            ekko_timezone_list,
            ekko_timezone_convert,
            ekko_timezone_info,
            free_string,
            free_buffer,
        })
    }

    pub fn datetime_now(&self, ) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_datetime_now)();
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

    pub fn datetime_nowUtc(&self, ) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_datetime_nowUtc)();
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

    pub fn datetime_parse(&self, input: &str, format: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_datetime_parse)(NativeString::from_str(input), NativeString::from_str(format));
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

    pub fn datetime_format(&self, isoInput: &str, pattern: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_datetime_format)(NativeString::from_str(isoInput), NativeString::from_str(pattern));
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

    pub fn datetime_add(&self, isoInput: &str, days: i32, hours: i32, minutes: i32, seconds: i32, milliseconds: i32) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_datetime_add)(NativeString::from_str(isoInput), days, hours, minutes, seconds, milliseconds);
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

    pub fn datetime_diff(&self, isoA: &str, isoB: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_datetime_diff)(NativeString::from_str(isoA), NativeString::from_str(isoB));
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

    pub fn datetime_epoch(&self, ) -> Result<i64, String> {
        unsafe {
            let result = (self.ekko_datetime_epoch)();
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value)
        }
    }

    pub fn datetime_fromEpoch(&self, epochMs: i64) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_datetime_fromEpoch)(epochMs);
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

    pub fn timezone_list(&self, ) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_timezone_list)();
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

    pub fn timezone_convert(&self, isoInput: &str, zoneId: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_timezone_convert)(NativeString::from_str(isoInput), NativeString::from_str(zoneId));
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

    pub fn timezone_info(&self, zoneId: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_timezone_info)(NativeString::from_str(zoneId));
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
