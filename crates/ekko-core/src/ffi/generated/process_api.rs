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
use tokio::sync::oneshot;
use std::sync::Mutex;
use std::sync::atomic::{AtomicI64, Ordering};
use std::collections::HashMap;

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

static NEXT_CB_ID: AtomicI64 = AtomicI64::new(1);
static CB_REGISTRY: Mutex<Option<HashMap<i64, oneshot::Sender<NativeResult>>>> = Mutex::new(None);

fn register_callback(tx: oneshot::Sender<NativeResult>) -> i64 {
    let id = NEXT_CB_ID.fetch_add(1, Ordering::Relaxed);
    let mut guard = CB_REGISTRY.lock().unwrap();
    guard.get_or_insert_with(HashMap::new).insert(id, tx);
    id
}

extern "C" fn async_completion(result: NativeResult, context: i64) {
    let tx = {
        let mut guard = CB_REGISTRY.lock().unwrap();
        guard.as_mut().and_then(|m| m.remove(&context))
    };
    if let Some(tx) = tx {
        let _ = tx.send(result);
    }
}

pub struct Api {
    _lib: libloading::Library,
    ekko_process_registerCallback: unsafe extern "C" fn(isize, i64) -> NativeResult,
    ekko_process_spawn: unsafe extern "C" fn(NativeString, NativeString, NativeString, NativeString) -> NativeResult,
    ekko_process_spawnWrite: unsafe extern "C" fn(i32, NativeBuffer) -> NativeResult,
    ekko_process_spawnCloseStdin: unsafe extern "C" fn(i32) -> NativeResult,
    ekko_process_spawnPid: unsafe extern "C" fn(i32) -> NativeResult,
    ekko_process_spawnKill: unsafe extern "C" fn(i32) -> NativeResult,
    ekko_process_spawnDispose: unsafe extern "C" fn(i32) -> NativeResult,
    ekko_process_exec: unsafe extern "C" fn(NativeString, NativeString, NativeString, NativeString, i32, isize, i64),
    free_string: unsafe extern "C" fn(NativeString),
    free_buffer: unsafe extern "C" fn(NativeBuffer),
}

impl Api {
    pub fn load(lib: libloading::Library) -> Result<Self, String> {
        let (
            ekko_process_registerCallback,
            ekko_process_spawn,
            ekko_process_spawnWrite,
            ekko_process_spawnCloseStdin,
            ekko_process_spawnPid,
            ekko_process_spawnKill,
            ekko_process_spawnDispose,
            ekko_process_exec,
            free_string,
            free_buffer,
        ) = unsafe {
            let s: libloading::Symbol<unsafe extern "C" fn(isize, i64) -> NativeResult> = lib.get(b"ekko_process_registerCallback").map_err(|e| e.to_string())?;
            let ekko_process_registerCallback = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeString, NativeString, NativeString) -> NativeResult> = lib.get(b"ekko_process_spawn").map_err(|e| e.to_string())?;
            let ekko_process_spawn = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeBuffer) -> NativeResult> = lib.get(b"ekko_process_spawnWrite").map_err(|e| e.to_string())?;
            let ekko_process_spawnWrite = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_process_spawnCloseStdin").map_err(|e| e.to_string())?;
            let ekko_process_spawnCloseStdin = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_process_spawnPid").map_err(|e| e.to_string())?;
            let ekko_process_spawnPid = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_process_spawnKill").map_err(|e| e.to_string())?;
            let ekko_process_spawnKill = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_process_spawnDispose").map_err(|e| e.to_string())?;
            let ekko_process_spawnDispose = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, NativeString, NativeString, NativeString, i32, isize, i64)> = lib.get(b"ekko_process_exec").map_err(|e| e.to_string())?;
            let ekko_process_exec = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString)> = lib.get(b"ekko_native_free_string").map_err(|e| e.to_string())?;
            let free_string = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer)> = lib.get(b"ekko_native_free_buffer").map_err(|e| e.to_string())?;
            let free_buffer = *s;
            (
                ekko_process_registerCallback,
                ekko_process_spawn,
                ekko_process_spawnWrite,
                ekko_process_spawnCloseStdin,
                ekko_process_spawnPid,
                ekko_process_spawnKill,
                ekko_process_spawnDispose,
                ekko_process_exec,
                free_string,
                free_buffer,
            )
        };
        Ok(Self {
            _lib: lib,
            ekko_process_registerCallback,
            ekko_process_spawn,
            ekko_process_spawnWrite,
            ekko_process_spawnCloseStdin,
            ekko_process_spawnPid,
            ekko_process_spawnKill,
            ekko_process_spawnDispose,
            ekko_process_exec,
            free_string,
            free_buffer,
        })
    }

    pub fn process_registerCallback(&self, callbackPtr: isize, context: i64) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_process_registerCallback)(callbackPtr, context);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn process_spawn(&self, cmd: &str, argsJson: &str, cwd: &str, envJson: &str) -> Result<i32, String> {
        unsafe {
            let result = (self.ekko_process_spawn)(NativeString::from_str(cmd), NativeString::from_str(argsJson), NativeString::from_str(cwd), NativeString::from_str(envJson));
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value as i32)
        }
    }

    pub fn process_spawnWrite(&self, handle: i32, data: &[u8]) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_process_spawnWrite)(handle, NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn process_spawnCloseStdin(&self, handle: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_process_spawnCloseStdin)(handle);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn process_spawnPid(&self, handle: i32) -> Result<i32, String> {
        unsafe {
            let result = (self.ekko_process_spawnPid)(handle);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value as i32)
        }
    }

    pub fn process_spawnKill(&self, handle: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_process_spawnKill)(handle);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn process_spawnDispose(&self, handle: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_process_spawnDispose)(handle);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub async fn process_exec(&self, cmd: &str, argsJson: &str, cwd: &str, envJson: &str, timeoutMs: i32) -> Result<String, String> {
        let (tx, rx) = oneshot::channel::<NativeResult>();
        let context = register_callback(tx);
        unsafe {
            (self.ekko_process_exec)(NativeString::from_str(cmd), NativeString::from_str(argsJson), NativeString::from_str(cwd), NativeString::from_str(envJson), timeoutMs, async_completion as *const () as isize, context);
        }
        let result = rx.await.map_err(|_| "async operation cancelled".to_string())?;
        if result.is_ok == 0 {
            let msg = result.error_message.to_string_lossy();
            unsafe { (self.free_string)(result.error_message); }
            return Err(msg);
        }
        let s = result.string_value.to_string_lossy();
        unsafe { (self.free_string)(result.string_value); }
        Ok(s)
    }

}
