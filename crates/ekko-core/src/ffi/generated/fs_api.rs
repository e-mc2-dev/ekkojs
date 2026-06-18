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
    ekko_fs_read: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_fs_readText: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_fs_readLines: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_fs_write: unsafe extern "C" fn(NativeString, NativeBuffer) -> NativeResult,
    ekko_fs_writeText: unsafe extern "C" fn(NativeString, NativeString) -> NativeResult,
    ekko_fs_append: unsafe extern "C" fn(NativeString, NativeString) -> NativeResult,
    ekko_fs_appendBytes: unsafe extern "C" fn(NativeString, NativeBuffer) -> NativeResult,
    ekko_fs_copy: unsafe extern "C" fn(NativeString, NativeString, i32) -> NativeResult,
    ekko_fs_rename: unsafe extern "C" fn(NativeString, NativeString) -> NativeResult,
    ekko_fs_remove: unsafe extern "C" fn(NativeString, i32) -> NativeResult,
    ekko_fs_exists: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_fs_stat: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_fs_chmod: unsafe extern "C" fn(NativeString, i32) -> NativeResult,
    ekko_fs_symlink: unsafe extern "C" fn(NativeString, NativeString) -> NativeResult,
    ekko_fs_readlink: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_fs_mkdir: unsafe extern "C" fn(NativeString, i32) -> NativeResult,
    ekko_fs_readDir: unsafe extern "C" fn(NativeString, i32) -> NativeResult,
    ekko_fs_tempDir: unsafe extern "C" fn() -> NativeResult,
    ekko_fs_tempFile: unsafe extern "C" fn() -> NativeResult,
    ekko_fs_tempSubdir: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_fs_openFile: unsafe extern "C" fn(NativeString, i32) -> NativeResult,
    ekko_fs_handleRead: unsafe extern "C" fn(i32, i32) -> NativeResult,
    ekko_fs_handleWrite: unsafe extern "C" fn(i32, NativeBuffer) -> NativeResult,
    ekko_fs_handleClose: unsafe extern "C" fn(i32) -> NativeResult,
    free_string: unsafe extern "C" fn(NativeString),
    free_buffer: unsafe extern "C" fn(NativeBuffer),
}

impl Api {
    pub fn load(lib: libloading::Library) -> Result<Self, String> {
        let (
            ekko_fs_read,
            ekko_fs_readText,
            ekko_fs_readLines,
            ekko_fs_write,
            ekko_fs_writeText,
            ekko_fs_append,
            ekko_fs_appendBytes,
            ekko_fs_copy,
            ekko_fs_rename,
            ekko_fs_remove,
            ekko_fs_exists,
            ekko_fs_stat,
            ekko_fs_chmod,
            ekko_fs_symlink,
            ekko_fs_readlink,
            ekko_fs_mkdir,
            ekko_fs_readDir,
            ekko_fs_tempDir,
            ekko_fs_tempFile,
            ekko_fs_tempSubdir,
            ekko_fs_openFile,
            ekko_fs_handleRead,
            ekko_fs_handleWrite,
            ekko_fs_handleClose,
            free_string,
            free_buffer,
        ) = unsafe {
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_fs_read").map_err(|e| e.to_string())?;
            let ekko_fs_read = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_fs_readText").map_err(|e| e.to_string())?;
            let ekko_fs_readText = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_fs_readLines").map_err(|e| e.to_string())?;
            let ekko_fs_readLines = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeBuffer) -> NativeResult> = lib.get(b"ekko_fs_write").map_err(|e| e.to_string())?;
            let ekko_fs_write = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeString) -> NativeResult> = lib.get(b"ekko_fs_writeText").map_err(|e| e.to_string())?;
            let ekko_fs_writeText = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeString) -> NativeResult> = lib.get(b"ekko_fs_append").map_err(|e| e.to_string())?;
            let ekko_fs_append = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeBuffer) -> NativeResult> = lib.get(b"ekko_fs_appendBytes").map_err(|e| e.to_string())?;
            let ekko_fs_appendBytes = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeString, i32) -> NativeResult> = lib.get(b"ekko_fs_copy").map_err(|e| e.to_string())?;
            let ekko_fs_copy = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeString) -> NativeResult> = lib.get(b"ekko_fs_rename").map_err(|e| e.to_string())?;
            let ekko_fs_rename = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, i32) -> NativeResult> = lib.get(b"ekko_fs_remove").map_err(|e| e.to_string())?;
            let ekko_fs_remove = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_fs_exists").map_err(|e| e.to_string())?;
            let ekko_fs_exists = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_fs_stat").map_err(|e| e.to_string())?;
            let ekko_fs_stat = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, i32) -> NativeResult> = lib.get(b"ekko_fs_chmod").map_err(|e| e.to_string())?;
            let ekko_fs_chmod = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeString) -> NativeResult> = lib.get(b"ekko_fs_symlink").map_err(|e| e.to_string())?;
            let ekko_fs_symlink = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_fs_readlink").map_err(|e| e.to_string())?;
            let ekko_fs_readlink = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, i32) -> NativeResult> = lib.get(b"ekko_fs_mkdir").map_err(|e| e.to_string())?;
            let ekko_fs_mkdir = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, i32) -> NativeResult> = lib.get(b"ekko_fs_readDir").map_err(|e| e.to_string())?;
            let ekko_fs_readDir = *s;
            let s: libloading::Symbol<unsafe extern "C" fn() -> NativeResult> = lib.get(b"ekko_fs_tempDir").map_err(|e| e.to_string())?;
            let ekko_fs_tempDir = *s;
            let s: libloading::Symbol<unsafe extern "C" fn() -> NativeResult> = lib.get(b"ekko_fs_tempFile").map_err(|e| e.to_string())?;
            let ekko_fs_tempFile = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_fs_tempSubdir").map_err(|e| e.to_string())?;
            let ekko_fs_tempSubdir = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, i32) -> NativeResult> = lib.get(b"ekko_fs_openFile").map_err(|e| e.to_string())?;
            let ekko_fs_openFile = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, i32) -> NativeResult> = lib.get(b"ekko_fs_handleRead").map_err(|e| e.to_string())?;
            let ekko_fs_handleRead = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeBuffer) -> NativeResult> = lib.get(b"ekko_fs_handleWrite").map_err(|e| e.to_string())?;
            let ekko_fs_handleWrite = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_fs_handleClose").map_err(|e| e.to_string())?;
            let ekko_fs_handleClose = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString)> = lib.get(b"ekko_native_free_string").map_err(|e| e.to_string())?;
            let free_string = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer)> = lib.get(b"ekko_native_free_buffer").map_err(|e| e.to_string())?;
            let free_buffer = *s;
            (
                ekko_fs_read,
                ekko_fs_readText,
                ekko_fs_readLines,
                ekko_fs_write,
                ekko_fs_writeText,
                ekko_fs_append,
                ekko_fs_appendBytes,
                ekko_fs_copy,
                ekko_fs_rename,
                ekko_fs_remove,
                ekko_fs_exists,
                ekko_fs_stat,
                ekko_fs_chmod,
                ekko_fs_symlink,
                ekko_fs_readlink,
                ekko_fs_mkdir,
                ekko_fs_readDir,
                ekko_fs_tempDir,
                ekko_fs_tempFile,
                ekko_fs_tempSubdir,
                ekko_fs_openFile,
                ekko_fs_handleRead,
                ekko_fs_handleWrite,
                ekko_fs_handleClose,
                free_string,
                free_buffer,
            )
        };
        Ok(Self {
            _lib: lib,
            ekko_fs_read,
            ekko_fs_readText,
            ekko_fs_readLines,
            ekko_fs_write,
            ekko_fs_writeText,
            ekko_fs_append,
            ekko_fs_appendBytes,
            ekko_fs_copy,
            ekko_fs_rename,
            ekko_fs_remove,
            ekko_fs_exists,
            ekko_fs_stat,
            ekko_fs_chmod,
            ekko_fs_symlink,
            ekko_fs_readlink,
            ekko_fs_mkdir,
            ekko_fs_readDir,
            ekko_fs_tempDir,
            ekko_fs_tempFile,
            ekko_fs_tempSubdir,
            ekko_fs_openFile,
            ekko_fs_handleRead,
            ekko_fs_handleWrite,
            ekko_fs_handleClose,
            free_string,
            free_buffer,
        })
    }

    pub fn fs_read(&self, path: &str) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_fs_read)(NativeString::from_str(path));
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

    pub fn fs_readText(&self, path: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_fs_readText)(NativeString::from_str(path));
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

    pub fn fs_readLines(&self, path: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_fs_readLines)(NativeString::from_str(path));
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

    pub fn fs_write(&self, path: &str, data: &[u8]) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_fs_write)(NativeString::from_str(path), NativeBuffer { ptr: data.as_ptr() as *mut u8, len: data.len() as i32 });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn fs_writeText(&self, path: &str, text: &str) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_fs_writeText)(NativeString::from_str(path), NativeString::from_str(text));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn fs_append(&self, path: &str, text: &str) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_fs_append)(NativeString::from_str(path), NativeString::from_str(text));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn fs_appendBytes(&self, path: &str, data: &[u8]) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_fs_appendBytes)(NativeString::from_str(path), NativeBuffer { ptr: data.as_ptr() as *mut u8, len: data.len() as i32 });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn fs_copy(&self, src: &str, dst: &str, overwrite: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_fs_copy)(NativeString::from_str(src), NativeString::from_str(dst), overwrite);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn fs_rename(&self, from: &str, to: &str) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_fs_rename)(NativeString::from_str(from), NativeString::from_str(to));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn fs_remove(&self, path: &str, recursive: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_fs_remove)(NativeString::from_str(path), recursive);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn fs_exists(&self, path: &str) -> Result<bool, String> {
        unsafe {
            let result = (self.ekko_fs_exists)(NativeString::from_str(path));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value != 0)
        }
    }

    pub fn fs_stat(&self, path: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_fs_stat)(NativeString::from_str(path));
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

    pub fn fs_chmod(&self, path: &str, mode: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_fs_chmod)(NativeString::from_str(path), mode);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn fs_symlink(&self, target: &str, link: &str) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_fs_symlink)(NativeString::from_str(target), NativeString::from_str(link));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn fs_readlink(&self, path: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_fs_readlink)(NativeString::from_str(path));
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

    pub fn fs_mkdir(&self, path: &str, recursive: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_fs_mkdir)(NativeString::from_str(path), recursive);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn fs_readDir(&self, path: &str, recursive: i32) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_fs_readDir)(NativeString::from_str(path), recursive);
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

    pub fn fs_tempDir(&self, ) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_fs_tempDir)();
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

    pub fn fs_tempFile(&self, ) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_fs_tempFile)();
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

    pub fn fs_tempSubdir(&self, prefix: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_fs_tempSubdir)(NativeString::from_str(prefix));
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

    pub fn fs_openFile(&self, path: &str, flags: i32) -> Result<i32, String> {
        unsafe {
            let result = (self.ekko_fs_openFile)(NativeString::from_str(path), flags);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value as i32)
        }
    }

    pub fn fs_handleRead(&self, handle: i32, count: i32) -> Result<Vec<u8>, String> {
        unsafe {
            let result = (self.ekko_fs_handleRead)(handle, count);
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

    pub fn fs_handleWrite(&self, handle: i32, data: &[u8]) -> Result<i32, String> {
        unsafe {
            let result = (self.ekko_fs_handleWrite)(handle, NativeBuffer { ptr: data.as_ptr() as *mut u8, len: data.len() as i32 });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value as i32)
        }
    }

    pub fn fs_handleClose(&self, handle: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_fs_handleClose)(handle);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

}
