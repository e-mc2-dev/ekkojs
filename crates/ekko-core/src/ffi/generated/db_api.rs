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
    ekko_db_openOrCreate: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_db_execute: unsafe extern "C" fn(i32, NativeString, NativeString) -> NativeResult,
    ekko_db_query: unsafe extern "C" fn(i32, NativeString, NativeString) -> NativeResult,
    ekko_db_prepare: unsafe extern "C" fn(i32, NativeString) -> NativeResult,
    ekko_db_stmtExecute: unsafe extern "C" fn(i32, NativeString) -> NativeResult,
    ekko_db_stmtQuery: unsafe extern "C" fn(i32, NativeString) -> NativeResult,
    ekko_db_stmtClose: unsafe extern "C" fn(i32) -> NativeResult,
    ekko_db_close: unsafe extern "C" fn(i32) -> NativeResult,
    free_string: unsafe extern "C" fn(NativeString),
    free_buffer: unsafe extern "C" fn(NativeBuffer),
}

impl Api {
    pub fn load(lib: libloading::Library) -> Result<Self, String> {
        let (
            ekko_db_openOrCreate,
            ekko_db_execute,
            ekko_db_query,
            ekko_db_prepare,
            ekko_db_stmtExecute,
            ekko_db_stmtQuery,
            ekko_db_stmtClose,
            ekko_db_close,
            free_string,
            free_buffer,
        ) = unsafe {
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_db_openOrCreate").map_err(|e| e.to_string())?;
            let ekko_db_openOrCreate = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeString, NativeString) -> NativeResult> = lib.get(b"ekko_db_execute").map_err(|e| e.to_string())?;
            let ekko_db_execute = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeString, NativeString) -> NativeResult> = lib.get(b"ekko_db_query").map_err(|e| e.to_string())?;
            let ekko_db_query = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeString) -> NativeResult> = lib.get(b"ekko_db_prepare").map_err(|e| e.to_string())?;
            let ekko_db_prepare = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeString) -> NativeResult> = lib.get(b"ekko_db_stmtExecute").map_err(|e| e.to_string())?;
            let ekko_db_stmtExecute = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeString) -> NativeResult> = lib.get(b"ekko_db_stmtQuery").map_err(|e| e.to_string())?;
            let ekko_db_stmtQuery = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_db_stmtClose").map_err(|e| e.to_string())?;
            let ekko_db_stmtClose = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_db_close").map_err(|e| e.to_string())?;
            let ekko_db_close = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString)> = lib.get(b"ekko_native_free_string").map_err(|e| e.to_string())?;
            let free_string = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer)> = lib.get(b"ekko_native_free_buffer").map_err(|e| e.to_string())?;
            let free_buffer = *s;
            (
                ekko_db_openOrCreate,
                ekko_db_execute,
                ekko_db_query,
                ekko_db_prepare,
                ekko_db_stmtExecute,
                ekko_db_stmtQuery,
                ekko_db_stmtClose,
                ekko_db_close,
                free_string,
                free_buffer,
            )
        };
        Ok(Self {
            _lib: lib,
            ekko_db_openOrCreate,
            ekko_db_execute,
            ekko_db_query,
            ekko_db_prepare,
            ekko_db_stmtExecute,
            ekko_db_stmtQuery,
            ekko_db_stmtClose,
            ekko_db_close,
            free_string,
            free_buffer,
        })
    }

    pub fn db_openOrCreate(&self, path: &str) -> Result<i32, String> {
        unsafe {
            let result = (self.ekko_db_openOrCreate)(NativeString::from_str(path));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value as i32)
        }
    }

    pub fn db_execute(&self, handle: i32, sql: &str, paramsJson: &str) -> Result<i32, String> {
        unsafe {
            let result = (self.ekko_db_execute)(handle, NativeString::from_str(sql), NativeString::from_str(paramsJson));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value as i32)
        }
    }

    pub fn db_query(&self, handle: i32, sql: &str, paramsJson: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_db_query)(handle, NativeString::from_str(sql), NativeString::from_str(paramsJson));
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

    pub fn db_prepare(&self, handle: i32, sql: &str) -> Result<i32, String> {
        unsafe {
            let result = (self.ekko_db_prepare)(handle, NativeString::from_str(sql));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value as i32)
        }
    }

    pub fn db_stmtExecute(&self, handle: i32, paramsJson: &str) -> Result<i32, String> {
        unsafe {
            let result = (self.ekko_db_stmtExecute)(handle, NativeString::from_str(paramsJson));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value as i32)
        }
    }

    pub fn db_stmtQuery(&self, handle: i32, paramsJson: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_db_stmtQuery)(handle, NativeString::from_str(paramsJson));
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

    pub fn db_stmtClose(&self, handle: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_db_stmtClose)(handle);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn db_close(&self, handle: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_db_close)(handle);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

}
