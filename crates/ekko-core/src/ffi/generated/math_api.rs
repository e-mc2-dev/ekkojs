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
    ekko_math_add: unsafe extern "C" fn(i32, i32) -> NativeResult,
    ekko_math_multiply: unsafe extern "C" fn(i64, i64) -> NativeResult,
    ekko_math_divide: unsafe extern "C" fn(f64, f64) -> NativeResult,
    ekko_math_greet: unsafe extern "C" fn(NativeString) -> NativeResult,
    ekko_math_slowAdd: unsafe extern "C" fn(i64, i64, isize, i64),
    free_string: unsafe extern "C" fn(NativeString),
    free_buffer: unsafe extern "C" fn(NativeBuffer),
}

impl Api {
    pub fn load(lib: libloading::Library) -> Result<Self, String> {
        let (
            ekko_math_add,
            ekko_math_multiply,
            ekko_math_divide,
            ekko_math_greet,
            ekko_math_slowAdd,
            free_string,
            free_buffer,
        ) = unsafe {
            let s: libloading::Symbol<unsafe extern "C" fn(i32, i32) -> NativeResult> = lib.get(b"ekko_math_add").map_err(|e| e.to_string())?;
            let ekko_math_add = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i64, i64) -> NativeResult> = lib.get(b"ekko_math_multiply").map_err(|e| e.to_string())?;
            let ekko_math_multiply = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(f64, f64) -> NativeResult> = lib.get(b"ekko_math_divide").map_err(|e| e.to_string())?;
            let ekko_math_divide = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString) -> NativeResult> = lib.get(b"ekko_math_greet").map_err(|e| e.to_string())?;
            let ekko_math_greet = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i64, i64, isize, i64)> = lib.get(b"ekko_math_slowAdd").map_err(|e| e.to_string())?;
            let ekko_math_slowAdd = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString)> = lib.get(b"ekko_native_free_string").map_err(|e| e.to_string())?;
            let free_string = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer)> = lib.get(b"ekko_native_free_buffer").map_err(|e| e.to_string())?;
            let free_buffer = *s;
            (
                ekko_math_add,
                ekko_math_multiply,
                ekko_math_divide,
                ekko_math_greet,
                ekko_math_slowAdd,
                free_string,
                free_buffer,
            )
        };
        Ok(Self {
            _lib: lib,
            ekko_math_add,
            ekko_math_multiply,
            ekko_math_divide,
            ekko_math_greet,
            ekko_math_slowAdd,
            free_string,
            free_buffer,
        })
    }

    pub fn math_add(&self, a: i32, b: i32) -> Result<i32, String> {
        unsafe {
            let result = (self.ekko_math_add)(a, b);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value as i32)
        }
    }

    pub fn math_multiply(&self, a: i64, b: i64) -> Result<i64, String> {
        unsafe {
            let result = (self.ekko_math_multiply)(a, b);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value)
        }
    }

    pub fn math_divide(&self, a: f64, b: f64) -> Result<f64, String> {
        unsafe {
            let result = (self.ekko_math_divide)(a, b);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.float_value)
        }
    }

    pub fn math_greet(&self, name: &str) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_math_greet)(NativeString::from_str(name));
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

    pub async fn math_slowAdd(&self, a: i64, b: i64) -> Result<i64, String> {
        let (tx, rx) = oneshot::channel::<NativeResult>();
        let context = register_callback(tx);
        unsafe {
            (self.ekko_math_slowAdd)(a, b, async_completion as *const () as isize, context);
        }
        let result = rx.await.map_err(|_| "async operation cancelled".to_string())?;
        if result.is_ok == 0 {
            let msg = result.error_message.to_string_lossy();
            unsafe { (self.free_string)(result.error_message); }
            return Err(msg);
        }
        Ok(result.int_value)
    }

}
