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
    ekko_net_tcpWrite: unsafe extern "C" fn(i32, NativeBuffer) -> NativeResult,
    ekko_net_tcpClose: unsafe extern "C" fn(i32) -> NativeResult,
    ekko_net_tcpListen: unsafe extern "C" fn(NativeString, i32, isize, i64) -> NativeResult,
    ekko_net_tcpServerClose: unsafe extern "C" fn(i32) -> NativeResult,
    ekko_net_udpCreate: unsafe extern "C" fn(i32) -> NativeResult,
    ekko_net_udpSend: unsafe extern "C" fn(i32, NativeBuffer, NativeString, i32) -> NativeResult,
    ekko_net_udpClose: unsafe extern "C" fn(i32) -> NativeResult,
    ekko_net_tcpConnect: unsafe extern "C" fn(NativeString, i32, isize, i64),
    ekko_net_tcpRead: unsafe extern "C" fn(i32, i32, isize, i64),
    ekko_net_udpRecv: unsafe extern "C" fn(i32, isize, i64),
    ekko_net_dnsResolve: unsafe extern "C" fn(NativeString, isize, i64),
    free_string: unsafe extern "C" fn(NativeString),
    free_buffer: unsafe extern "C" fn(NativeBuffer),
}

impl Api {
    pub fn load(lib: libloading::Library) -> Result<Self, String> {
        let (
            ekko_net_tcpWrite,
            ekko_net_tcpClose,
            ekko_net_tcpListen,
            ekko_net_tcpServerClose,
            ekko_net_udpCreate,
            ekko_net_udpSend,
            ekko_net_udpClose,
            ekko_net_tcpConnect,
            ekko_net_tcpRead,
            ekko_net_udpRecv,
            ekko_net_dnsResolve,
            free_string,
            free_buffer,
        ) = unsafe {
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeBuffer) -> NativeResult> = lib.get(b"ekko_net_tcpWrite").map_err(|e| e.to_string())?;
            let ekko_net_tcpWrite = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_net_tcpClose").map_err(|e| e.to_string())?;
            let ekko_net_tcpClose = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, i32, isize, i64) -> NativeResult> = lib.get(b"ekko_net_tcpListen").map_err(|e| e.to_string())?;
            let ekko_net_tcpListen = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_net_tcpServerClose").map_err(|e| e.to_string())?;
            let ekko_net_tcpServerClose = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_net_udpCreate").map_err(|e| e.to_string())?;
            let ekko_net_udpCreate = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, NativeBuffer, NativeString, i32) -> NativeResult> = lib.get(b"ekko_net_udpSend").map_err(|e| e.to_string())?;
            let ekko_net_udpSend = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32) -> NativeResult> = lib.get(b"ekko_net_udpClose").map_err(|e| e.to_string())?;
            let ekko_net_udpClose = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, i32, isize, i64)> = lib.get(b"ekko_net_tcpConnect").map_err(|e| e.to_string())?;
            let ekko_net_tcpConnect = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, i32, isize, i64)> = lib.get(b"ekko_net_tcpRead").map_err(|e| e.to_string())?;
            let ekko_net_tcpRead = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(i32, isize, i64)> = lib.get(b"ekko_net_udpRecv").map_err(|e| e.to_string())?;
            let ekko_net_udpRecv = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString, isize, i64)> = lib.get(b"ekko_net_dnsResolve").map_err(|e| e.to_string())?;
            let ekko_net_dnsResolve = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeString)> = lib.get(b"ekko_native_free_string").map_err(|e| e.to_string())?;
            let free_string = *s;
            let s: libloading::Symbol<unsafe extern "C" fn(NativeBuffer)> = lib.get(b"ekko_native_free_buffer").map_err(|e| e.to_string())?;
            let free_buffer = *s;
            (
                ekko_net_tcpWrite,
                ekko_net_tcpClose,
                ekko_net_tcpListen,
                ekko_net_tcpServerClose,
                ekko_net_udpCreate,
                ekko_net_udpSend,
                ekko_net_udpClose,
                ekko_net_tcpConnect,
                ekko_net_tcpRead,
                ekko_net_udpRecv,
                ekko_net_dnsResolve,
                free_string,
                free_buffer,
            )
        };
        Ok(Self {
            _lib: lib,
            ekko_net_tcpWrite,
            ekko_net_tcpClose,
            ekko_net_tcpListen,
            ekko_net_tcpServerClose,
            ekko_net_udpCreate,
            ekko_net_udpSend,
            ekko_net_udpClose,
            ekko_net_tcpConnect,
            ekko_net_tcpRead,
            ekko_net_udpRecv,
            ekko_net_dnsResolve,
            free_string,
            free_buffer,
        })
    }

    pub fn net_tcpWrite(&self, handle: i32, data: &[u8]) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_net_tcpWrite)(handle, NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") });
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn net_tcpClose(&self, handle: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_net_tcpClose)(handle);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn net_tcpListen(&self, host: &str, port: i32, callbackPtr: isize, context: i64) -> Result<String, String> {
        unsafe {
            let result = (self.ekko_net_tcpListen)(NativeString::from_str(host), port, callbackPtr, context);
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

    pub fn net_tcpServerClose(&self, handle: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_net_tcpServerClose)(handle);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn net_udpCreate(&self, port: i32) -> Result<i32, String> {
        unsafe {
            let result = (self.ekko_net_udpCreate)(port);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(result.int_value as i32)
        }
    }

    pub fn net_udpSend(&self, handle: i32, data: &[u8], host: &str, port: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_net_udpSend)(handle, NativeBuffer { ptr: data.as_ptr() as *mut u8, len: i32::try_from(data.len()).expect("buffer too large for i32") }, NativeString::from_str(host), port);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub fn net_udpClose(&self, handle: i32) -> Result<(), String> {
        unsafe {
            let result = (self.ekko_net_udpClose)(handle);
            if result.is_ok == 0 {
                let msg = result.error_message.to_string_lossy();
                (self.free_string)(result.error_message);
                return Err(msg);
            }
            Ok(())
        }
    }

    pub async fn net_tcpConnect(&self, host: &str, port: i32) -> Result<i32, String> {
        let (tx, rx) = oneshot::channel::<NativeResult>();
        let context = register_callback(tx);
        unsafe {
            (self.ekko_net_tcpConnect)(NativeString::from_str(host), port, async_completion as *const () as isize, context);
        }
        let result = rx.await.map_err(|_| "async operation cancelled".to_string())?;
        if result.is_ok == 0 {
            let msg = result.error_message.to_string_lossy();
            unsafe { (self.free_string)(result.error_message); }
            return Err(msg);
        }
        Ok(result.int_value as i32)
    }

    pub async fn net_tcpRead(&self, handle: i32, maxBytes: i32) -> Result<Vec<u8>, String> {
        let (tx, rx) = oneshot::channel::<NativeResult>();
        let context = register_callback(tx);
        unsafe {
            (self.ekko_net_tcpRead)(handle, maxBytes, async_completion as *const () as isize, context);
        }
        let result = rx.await.map_err(|_| "async operation cancelled".to_string())?;
        if result.is_ok == 0 {
            let msg = result.error_message.to_string_lossy();
            unsafe { (self.free_string)(result.error_message); }
            return Err(msg);
        }
        let buf = result.buffer_value;
        let data = buf.to_vec();
        unsafe { (self.free_buffer)(buf); }
        Ok(data)
    }

    pub async fn net_udpRecv(&self, handle: i32) -> Result<String, String> {
        let (tx, rx) = oneshot::channel::<NativeResult>();
        let context = register_callback(tx);
        unsafe {
            (self.ekko_net_udpRecv)(handle, async_completion as *const () as isize, context);
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

    pub async fn net_dnsResolve(&self, hostname: &str) -> Result<String, String> {
        let (tx, rx) = oneshot::channel::<NativeResult>();
        let context = register_callback(tx);
        unsafe {
            (self.ekko_net_dnsResolve)(NativeString::from_str(hostname), async_completion as *const () as isize, context);
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
