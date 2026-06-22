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
    ekko_compress_gzipCompress: unsafe extern "C" fn(NativeBuffer, i32) -> NativeResult,
    ekko_compress_gzipDecompress: unsafe extern "C" fn(NativeBuffer) -> NativeResult,
    ekko_compress_brotliCompress: unsafe extern "C" fn(NativeBuffer, i32) -> NativeResult,
    ekko_compress_brotliDecompress: unsafe extern "C" fn(NativeBuffer) -> NativeResult,
    ekko_compress_deflateCompress: unsafe extern "C" fn(NativeBuffer, i32) -> NativeResult,
    ekko_compress_deflateDecompress: unsafe extern "C" fn(NativeBuffer) -> NativeResult,
    ekko_compress_createStream: unsafe extern "C" fn(NativeString, NativeString, i32) -> NativeResult,
    ekko_compress_streamWrite: unsafe extern "C" fn(i32, NativeBuffer) -> NativeResult,
    ekko_compress_streamFinish: unsafe extern "C" fn(i32) -> NativeResult,
    free_string: unsafe extern "C" fn(NativeString),
    free_buffer: unsafe extern "C" fn(NativeBuffer),
}

impl Api {
    pub fn load(lib: libloading::Library) -> Result<Self, String> {
        let (
            ekko_compress_gzipCompress,
            ekko_compress_gzipDecompress,
            ekko_compress_brotliCompress,
            ekko_compress_brotliDecompress,
            ekko_compress_deflateCompress,
            ekko_compress_deflateDecompress,
            ekko_compress_createStream,
            ekko_compress_streamWrite,
            ekko_compress_streamFinish,
            free_string,
            free_buffer,
        ) = unsafe {
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer, i32) -> NativeResult> = lib.get(b"ekko_compress_gzipCompress").map_err(|e| e.to_string())?;
            let ekko_compress_gzipCompress = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer) -> NativeResult> = lib.get(b"ekko_compress_gzipDecompress").map_err(|e| e.to_string())?;
            let ekko_compress_gzipDecompress = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer, i32) -> NativeResult> = lib.get(b"ekko_compress_brotliCompress").map_err(|e| e.to_string())?;
            let ekko_compress_brotliCompress = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer) -> NativeResult> = lib.get(b"ekko_compress_brotliDecompress").map_err(|e| e.to_string())?;
            let ekko_compress_brotliDecompress = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer, i32) -> NativeResult> = lib.get(b"ekko_compress_deflateCompress").map_err(|e| e.to_string())?;
            let ekko_compress_deflateCompress = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer) -> NativeResult> = lib.get(b"ekko_compress_deflateDecompress").map_err(|e| e.to_string())?;
            let ekko_compress_deflateDecompress = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeString, i32) -> NativeResult> = lib.get(b"ekko_compress_createStream").map_err(|e| e.to_string())?;
            let ekko_compress_createStream = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeBuffer) -> NativeResult> = lib.get(b"ekko_compress_streamWrite").map_err(|e| e.to_string())?;
            let ekko_compress_streamWrite = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_compress_streamFinish").map_err(|e| e.to_string())?;
            let ekko_compress_streamFinish = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString)> = lib.get(b"ekko_native_free_string").map_err(|e| e.to_string())?;
            let free_string = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer)> = lib.get(b"ekko_native_free_buffer").map_err(|e| e.to_string())?;
            let free_buffer = *s;
            (
                ekko_compress_gzipCompress,
                ekko_compress_gzipDecompress,
                ekko_compress_brotliCompress,
                ekko_compress_brotliDecompress,
                ekko_compress_deflateCompress,
                ekko_compress_deflateDecompress,
                ekko_compress_createStream,
                ekko_compress_streamWrite,
                ekko_compress_streamFinish,
                free_string,
                free_buffer,
            )
        };
        Ok(Self {
            _lib: lib,
            ekko_compress_gzipCompress,
            ekko_compress_gzipDecompress,
            ekko_compress_brotliCompress,
            ekko_compress_brotliDecompress,
            ekko_compress_deflateCompress,
            ekko_compress_deflateDecompress,
            ekko_compress_createStream,
            ekko_compress_streamWrite,
            ekko_compress_streamFinish,
            free_string,
            free_buffer,
        })
    }

    pub fn compress_gzipCompress(&self, data: &[u8], level: i32) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_compress_gzipCompress)(NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") }, level);
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

    pub fn compress_gzipDecompress(&self, data: &[u8]) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_compress_gzipDecompress)(NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") });
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

    pub fn compress_brotliCompress(&self, data: &[u8], level: i32) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_compress_brotliCompress)(NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") }, level);
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

    pub fn compress_brotliDecompress(&self, data: &[u8]) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_compress_brotliDecompress)(NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") });
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

    pub fn compress_deflateCompress(&self, data: &[u8], level: i32) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_compress_deflateCompress)(NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") }, level);
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

    pub fn compress_deflateDecompress(&self, data: &[u8]) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_compress_deflateDecompress)(NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") });
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

    pub fn compress_createStream(&self, algorithm: &str, mode: &str, level: i32) -> Result<i32, String> {
        unsafe {
            let result = (self.ekko_compress_createStream)(NativeString::from_str(algorithm), NativeString::from_str(mode), level);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value as i32)
        }
    }

    pub fn compress_streamWrite(&self, handle: i32, chunk: &[u8]) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_compress_streamWrite)(handle, NativeBuffer { ptr: chunk.as_ptr() as *mut u8, len: i32::try_from(chunk.len()).expect("buffer too large for i32") });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn compress_streamFinish(&self, handle: i32) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_compress_streamFinish)(handle);
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

}
