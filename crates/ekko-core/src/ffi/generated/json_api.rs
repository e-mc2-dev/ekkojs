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
    ekko_json_createReader: unsafe extern "C" fn(NativeBuffer) -> NativeResult,
    ekko_json_readerRead: unsafe extern "C" fn(i32) -> NativeResult,
    ekko_json_readerClose: unsafe extern "C" fn(i32) -> NativeResult,
    ekko_json_createWriter: unsafe extern "C" fn() -> NativeResult,
    ekko_json_writerWrite: unsafe extern "C" fn(i32, NativeString) -> NativeResult,
    ekko_json_writerFinish: unsafe extern "C" fn(i32) -> NativeResult,
    free_string: unsafe extern "C" fn(NativeString),
    free_buffer: unsafe extern "C" fn(NativeBuffer),
}

impl Api {
    pub fn load(lib: libloading::Library) -> Result<Self, String> {
        let (
            ekko_json_createReader,
            ekko_json_readerRead,
            ekko_json_readerClose,
            ekko_json_createWriter,
            ekko_json_writerWrite,
            ekko_json_writerFinish,
            free_string,
            free_buffer,
        ) = unsafe {
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer) -> NativeResult> = lib.get(b"ekko_json_createReader").map_err(|e| e.to_string())?;
            let ekko_json_createReader = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_json_readerRead").map_err(|e| e.to_string())?;
            let ekko_json_readerRead = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_json_readerClose").map_err(|e| e.to_string())?;
            let ekko_json_readerClose = *s;
            let s: libloading::Symbol<unsafe extern "C" fn() -> NativeResult> = lib.get(b"ekko_json_createWriter").map_err(|e| e.to_string())?;
            let ekko_json_createWriter = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeString) -> NativeResult> = lib.get(b"ekko_json_writerWrite").map_err(|e| e.to_string())?;
            let ekko_json_writerWrite = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_json_writerFinish").map_err(|e| e.to_string())?;
            let ekko_json_writerFinish = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString)> = lib.get(b"ekko_native_free_string").map_err(|e| e.to_string())?;
            let free_string = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer)> = lib.get(b"ekko_native_free_buffer").map_err(|e| e.to_string())?;
            let free_buffer = *s;
            (
                ekko_json_createReader,
                ekko_json_readerRead,
                ekko_json_readerClose,
                ekko_json_createWriter,
                ekko_json_writerWrite,
                ekko_json_writerFinish,
                free_string,
                free_buffer,
            )
        };
        Ok(Self {
            _lib: lib,
            ekko_json_createReader,
            ekko_json_readerRead,
            ekko_json_readerClose,
            ekko_json_createWriter,
            ekko_json_writerWrite,
            ekko_json_writerFinish,
            free_string,
            free_buffer,
        })
    }

    pub fn json_createReader(&self, data: &[u8]) -> Result<i32, String> {
        unsafe {
            let result = (self.ekko_json_createReader)(NativeBuffer { ptr: data.as_ptr() as *mut u8, len: data.len() as i32 });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value as i32)
        }
    }

    pub fn json_readerRead(&self, handle: i32) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_json_readerRead)(handle);
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

    pub fn json_readerClose(&self, handle: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_json_readerClose)(handle);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn json_createWriter(&self, ) -> Result<i32, String> {
        unsafe {
            let result = (self.ekko_json_createWriter)();
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value as i32)
        }
    }

    pub fn json_writerWrite(&self, handle: i32, command: &str) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_json_writerWrite)(handle, NativeString::from_str(command));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn json_writerFinish(&self, handle: i32) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_json_writerFinish)(handle);
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

}
