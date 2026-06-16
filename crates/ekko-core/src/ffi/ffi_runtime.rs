// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::collections::HashMap;
use std::ffi::{c_void, CString, CStr};
use std::sync::Arc;
use std::cell::{RefCell, Cell};

#[derive(Clone, Debug, PartialEq)]
pub enum FfiType {
    Void,
    I8, I16, I32, I64,
    U8, U16, U32, U64,
    F32, F64,
    Bool,
    Pointer,
    CString,
    Buffer,
    Struct(FfiStruct),
}

#[derive(Clone, Debug, PartialEq)]
pub struct FfiStruct {
    pub name: String,
    pub fields: Vec<(String, FfiType)>,
    pub size: usize,
    pub alignment: usize,
    pub offsets: Vec<usize>,
}

pub enum FfiValue {
    Void,
    I8(i8), I16(i16), I32(i32), I64(i64),
    U8(u8), U16(u16), U32(u32), U64(u64),
    F32(f32), F64(f64),
    Bool(bool),
    Pointer(*mut c_void),
    CString(CString),
    Buffer(Vec<u8>),
    Struct(Vec<u8>),
}

unsafe impl Send for FfiValue {}

pub struct DynSymbol {
    pub ptr: *const c_void,
    pub arg_types: Vec<FfiType>,
    pub return_type: FfiType,
    pub is_async: bool,
}

unsafe impl Send for DynSymbol {}
unsafe impl Sync for DynSymbol {}

pub struct DynLibrary {
    _lib: libloading::Library,
    pub symbols: HashMap<String, DynSymbol>,
    pub path: String,
}

unsafe impl Send for DynLibrary {}
unsafe impl Sync for DynLibrary {}

pub struct FfiCallContext {
    pub lib: Arc<DynLibrary>,
    pub symbol_name: String,
}

pub struct FnDeclaration {
    pub args: Vec<FfiType>,
    pub returns: FfiType,
    pub is_async: bool,
}

impl FfiStruct {
    
    pub fn new(name: String, fields: Vec<(String, FfiType)>) -> Self {
        let (size, alignment, offsets) = compute_struct_layout(&fields);
        Self { name, fields, size, alignment, offsets }
    }
}

pub fn type_size(t: &FfiType) -> usize {
    match t {
        FfiType::Void => 0,
        FfiType::I8 | FfiType::U8 | FfiType::Bool => 1,
        FfiType::I16 | FfiType::U16 => 2,
        FfiType::I32 | FfiType::U32 | FfiType::F32 => 4,
        FfiType::I64 | FfiType::U64 | FfiType::F64 => 8,
        FfiType::Pointer | FfiType::CString | FfiType::Buffer => std::mem::size_of::<*const c_void>(),
        FfiType::Struct(s) => s.size,
    }
}

pub fn type_alignment(t: &FfiType) -> usize {
    match t {
        FfiType::Void => 1,
        FfiType::I8 | FfiType::U8 | FfiType::Bool => 1,
        FfiType::I16 | FfiType::U16 => 2,
        FfiType::I32 | FfiType::U32 | FfiType::F32 => 4,
        FfiType::I64 | FfiType::U64 | FfiType::F64 => 8,
        FfiType::Pointer | FfiType::CString | FfiType::Buffer => std::mem::size_of::<*const c_void>(),
        FfiType::Struct(s) => s.alignment,
    }
}

pub fn compute_struct_layout(fields: &[(String, FfiType)]) -> (usize, usize, Vec<usize>) {
    let mut offset = 0usize;
    let mut max_align = 1usize;
    let mut offsets = Vec::with_capacity(fields.len());

    for (_, ft) in fields {
        let align = type_alignment(ft);
        let size = type_size(ft);
        max_align = max_align.max(align);
        let rem = offset % align;
        if rem != 0 {
            offset += align - rem;
        }
        offsets.push(offset);
        offset += size;
    }

    let rem = offset % max_align;
    if rem != 0 {
        offset += max_align - rem;
    }

    (offset, max_align, offsets)
}

impl DynLibrary {

    pub fn open(path: &str, declarations: &HashMap<String, FnDeclaration>) -> Result<Self, String> {
        let lib = unsafe {
            libloading::Library::new(path)
                .map_err(|e| format!("dlopen failed for '{}': {}", path, e))?
        };
        let mut symbols = HashMap::new();
        for (name, decl) in declarations {
            let ptr = unsafe {
                let sym: libloading::Symbol<*const c_void> = lib.get(name.as_bytes())
                    .map_err(|e| format!("symbol '{}' not found in '{}': {}", name, path, e))?;
                *sym
            };
            symbols.insert(name.clone(), DynSymbol {
                ptr,
                arg_types: decl.args.clone(),
                return_type: decl.returns.clone(),
                is_async: decl.is_async,
            });
        }
        Ok(Self { _lib: lib, symbols, path: path.to_string() })
    }

    pub fn call(&self, name: &str, args: &[FfiValue]) -> Result<FfiValue, String> {
        let sym = self.symbols.get(name)
            .ok_or_else(|| format!("symbol '{}' not registered", name))?;
        unsafe { ffi_call(sym.ptr, &sym.arg_types, &sym.return_type, args) }
    }
}

fn val_to_raw(val: &FfiValue, typ: &FfiType, c_strings: &mut Vec<CString>) -> Result<usize, String> {
    match (val, typ) {
        (FfiValue::I8(v), FfiType::I8) => Ok(*v as u8 as usize),
        (FfiValue::I16(v), FfiType::I16) => Ok(*v as u16 as usize),
        (FfiValue::I32(v), FfiType::I32) => Ok(*v as u32 as usize),
        (FfiValue::I64(v), FfiType::I64) => Ok(*v as u64 as usize),
        (FfiValue::U8(v), FfiType::U8) => Ok(*v as usize),
        (FfiValue::U16(v), FfiType::U16) => Ok(*v as usize),
        (FfiValue::U32(v), FfiType::U32) => Ok(*v as usize),
        (FfiValue::U64(v), FfiType::U64) => Ok(*v as usize),
        (FfiValue::F32(v), FfiType::F32) => Ok(v.to_bits() as usize),
        (FfiValue::F64(v), FfiType::F64) => Ok(v.to_bits() as usize),
        (FfiValue::Bool(v), FfiType::Bool) => Ok(if *v { 1 } else { 0 }),
        (FfiValue::Pointer(v), FfiType::Pointer) => Ok(*v as usize),

        (FfiValue::Pointer(v), FfiType::CString) => Ok(*v as usize),
        (FfiValue::CString(s), FfiType::CString) => {
            let cs = CString::new(s.to_bytes()).map_err(|_| "null byte in string".to_string())?;
            let ptr = cs.as_ptr() as usize;
            c_strings.push(cs);
            Ok(ptr)
        }
        (FfiValue::Buffer(buf), FfiType::Buffer) => Ok(buf.as_ptr() as usize),
        _ => Err("type mismatch".to_string()),
    }
}

unsafe fn raw_to_val(raw: usize, return_type: &FfiType) -> Result<FfiValue, String> {
    match return_type {
        FfiType::Void => Ok(FfiValue::Void),
        FfiType::I8 => Ok(FfiValue::I8(raw as i8)),
        FfiType::I16 => Ok(FfiValue::I16(raw as i16)),
        FfiType::I32 => Ok(FfiValue::I32(raw as i32)),
        FfiType::I64 => Ok(FfiValue::I64(raw as i64)),
        FfiType::U8 => Ok(FfiValue::U8(raw as u8)),
        FfiType::U16 => Ok(FfiValue::U16(raw as u16)),
        FfiType::U32 => Ok(FfiValue::U32(raw as u32)),
        FfiType::U64 => Ok(FfiValue::U64(raw as u64)),
        FfiType::F32 => Ok(FfiValue::F32(f32::from_bits(raw as u32))),
        FfiType::F64 => Ok(FfiValue::F64(f64::from_bits(raw as u64))),
        FfiType::Bool => Ok(FfiValue::Bool(raw != 0)),
        FfiType::Pointer | FfiType::Buffer => Ok(FfiValue::Pointer(raw as *mut c_void)),
        FfiType::CString => {
            let ptr = raw as *const std::os::raw::c_char;
            if ptr.is_null() {
                Ok(FfiValue::CString(CString::default()))
            } else {
                let s = CStr::from_ptr(ptr).to_string_lossy().into_owned();
                Ok(FfiValue::CString(CString::new(s).map_err(|e| e.to_string())?))
            }
        }
        FfiType::Struct(_) => Err("struct return not supported in pure-Rust FFI dispatch".to_string()),
    }
}

pub(crate) const FFI_FLOAT_MAX_ARITY_RT: usize = 4;

#[derive(Clone, Copy)]
pub(crate) enum Slot { I(i64), F32(f32), F64(f64) }
impl Slot {
    #[inline] pub(crate) fn i(self) -> i64 { match self { Slot::I(v) => v, Slot::F32(v) => v as i64, Slot::F64(v) => v as i64 } }
    #[inline] pub(crate) fn s(self) -> f32 { match self { Slot::F32(v) => v, Slot::F64(v) => v as f32, Slot::I(v) => v as f32 } }
    #[inline] pub(crate) fn d(self) -> f64 { match self { Slot::F64(v) => v, Slot::F32(v) => v as f64, Slot::I(v) => v as f64 } }
}

pub(crate) enum RawRet { Void, I(i64), F32(f32), F64(f64) }

include!(concat!(env!("OUT_DIR"), "/ffi_dispatch.rs"));

fn val_to_slot(val: &FfiValue, typ: &FfiType, keep: &mut Vec<CString>) -> Result<(Slot, u32), String> {
    Ok(match (val, typ) {
        (FfiValue::F32(v), FfiType::F32) => (Slot::F32(*v), 1),
        (FfiValue::F64(v), FfiType::F64) => (Slot::F64(*v), 2),
        _ => (Slot::I(val_to_raw(val, typ, keep)? as i64), 0),
    })
}

fn ret_class(t: &FfiType) -> u8 {
    match t { FfiType::Void => 0, FfiType::F32 => 2, FfiType::F64 => 3, _ => 1 }
}

#[allow(unsafe_op_in_unsafe_fn)]
unsafe fn raw_to_val_typed(raw: RawRet, return_type: &FfiType) -> Result<FfiValue, String> {
    match (raw, return_type) {
        (RawRet::Void, _) => Ok(FfiValue::Void),
        (RawRet::F32(v), FfiType::F32) => Ok(FfiValue::F32(v)),
        (RawRet::F64(v), FfiType::F64) => Ok(FfiValue::F64(v)),
        
        (RawRet::I(v), t) => raw_to_val(v as usize, t),
        _ => Err("ffi: internal return-class mismatch".to_string()),
    }
}

#[allow(unsafe_op_in_unsafe_fn)]
pub unsafe fn ffi_call(
    fn_ptr: *const c_void,
    arg_types: &[FfiType],
    return_type: &FfiType,
    args: &[FfiValue],
) -> Result<FfiValue, String> {
    if args.len() != arg_types.len() {
        return Err(format!("expected {} arguments, got {}", arg_types.len(), args.len()));
    }
    if arg_types.iter().any(|t| matches!(t, FfiType::Struct(_))) || matches!(return_type, FfiType::Struct(_)) {
        return Err("struct-by-value arguments/returns are not supported — pass a pointer (types.ptr) or buffer instead".to_string());
    }

    let has_float = arg_types.iter().any(|t| matches!(t, FfiType::F32 | FfiType::F64))
        || matches!(return_type, FfiType::F32 | FfiType::F64);
    if has_float {
        if args.len() > FFI_FLOAT_MAX_ARITY_RT {
            return Err(format!(
                "ffi: signatures with float args/returns support up to {} arguments (got {})",
                FFI_FLOAT_MAX_ARITY_RT, args.len()
            ));
        }
        let mut keep: Vec<CString> = Vec::new();
        let mut slots = Vec::with_capacity(args.len());
        let mut key = 0u32;
        let mut mul = 1u32;
        for (i, (val, typ)) in args.iter().zip(arg_types.iter()).enumerate() {
            let (slot, cls) = val_to_slot(val, typ, &mut keep).map_err(|e| format!("arg {}: {}", i, e))?;
            slots.push(slot);
            key += cls * mul;
            mul = mul.saturating_mul(3);
        }
        let raw = ffi_dispatch_float(fn_ptr, args.len(), key, ret_class(return_type), &slots)
            .ok_or_else(|| format!("ffi: unsupported float signature (arity {})", args.len()))?;
        let result = raw_to_val_typed(raw, return_type);
        drop(keep); 
        return result;
    }

    if args.len() > 16 {
        return Err("ffi: max 16 arguments supported".to_string());
    }
    
    let mut c_strings: Vec<CString> = Vec::new();
    let mut raw_args = Vec::with_capacity(args.len());
    for (i, (val, typ)) in args.iter().zip(arg_types.iter()).enumerate() {
        raw_args.push(val_to_raw(val, typ, &mut c_strings).map_err(|e| format!("arg {}: {}", i, e))?);
    }

    while raw_args.len() < 16 { raw_args.push(0); }
    let a = &raw_args;

    type F0  = unsafe extern "C" fn() -> usize;
    type F1  = unsafe extern "C" fn(usize) -> usize;
    type F2  = unsafe extern "C" fn(usize,usize) -> usize;
    type F3  = unsafe extern "C" fn(usize,usize,usize) -> usize;
    type F4  = unsafe extern "C" fn(usize,usize,usize,usize) -> usize;
    type F5  = unsafe extern "C" fn(usize,usize,usize,usize,usize) -> usize;
    type F6  = unsafe extern "C" fn(usize,usize,usize,usize,usize,usize) -> usize;
    type F7  = unsafe extern "C" fn(usize,usize,usize,usize,usize,usize,usize) -> usize;
    type F8  = unsafe extern "C" fn(usize,usize,usize,usize,usize,usize,usize,usize) -> usize;
    type F9  = unsafe extern "C" fn(usize,usize,usize,usize,usize,usize,usize,usize,usize) -> usize;
    type F10 = unsafe extern "C" fn(usize,usize,usize,usize,usize,usize,usize,usize,usize,usize) -> usize;
    type F11 = unsafe extern "C" fn(usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize) -> usize;
    type F12 = unsafe extern "C" fn(usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize) -> usize;
    type F13 = unsafe extern "C" fn(usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize) -> usize;
    type F14 = unsafe extern "C" fn(usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize) -> usize;
    type F15 = unsafe extern "C" fn(usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize) -> usize;
    type F16 = unsafe extern "C" fn(usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize,usize) -> usize;

    let raw_ret = match args.len() {
        0  => { let f: F0  = std::mem::transmute(fn_ptr); f() }
        1  => { let f: F1  = std::mem::transmute(fn_ptr); f(a[0]) }
        2  => { let f: F2  = std::mem::transmute(fn_ptr); f(a[0],a[1]) }
        3  => { let f: F3  = std::mem::transmute(fn_ptr); f(a[0],a[1],a[2]) }
        4  => { let f: F4  = std::mem::transmute(fn_ptr); f(a[0],a[1],a[2],a[3]) }
        5  => { let f: F5  = std::mem::transmute(fn_ptr); f(a[0],a[1],a[2],a[3],a[4]) }
        6  => { let f: F6  = std::mem::transmute(fn_ptr); f(a[0],a[1],a[2],a[3],a[4],a[5]) }
        7  => { let f: F7  = std::mem::transmute(fn_ptr); f(a[0],a[1],a[2],a[3],a[4],a[5],a[6]) }
        8  => { let f: F8  = std::mem::transmute(fn_ptr); f(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]) }
        9  => { let f: F9  = std::mem::transmute(fn_ptr); f(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8]) }
        10 => { let f: F10 = std::mem::transmute(fn_ptr); f(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8],a[9]) }
        11 => { let f: F11 = std::mem::transmute(fn_ptr); f(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8],a[9],a[10]) }
        12 => { let f: F12 = std::mem::transmute(fn_ptr); f(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8],a[9],a[10],a[11]) }
        13 => { let f: F13 = std::mem::transmute(fn_ptr); f(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8],a[9],a[10],a[11],a[12]) }
        14 => { let f: F14 = std::mem::transmute(fn_ptr); f(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8],a[9],a[10],a[11],a[12],a[13]) }
        15 => { let f: F15 = std::mem::transmute(fn_ptr); f(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8],a[9],a[10],a[11],a[12],a[13],a[14]) }
        16 => { let f: F16 = std::mem::transmute(fn_ptr); f(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8],a[9],a[10],a[11],a[12],a[13],a[14],a[15]) }
        _ => unreachable!(),
    };

    if matches!(return_type, FfiType::Void) {
        return Ok(FfiValue::Void);
    }
    raw_to_val(raw_ret, return_type)
}

pub fn unmarshal_struct(bytes: &[u8], st: &FfiStruct) -> Vec<(String, FfiValue)> {
    let mut result = Vec::with_capacity(st.fields.len());
    for (i, (name, ft)) in st.fields.iter().enumerate() {
        let offset = st.offsets[i];
        let val = read_value_from_bytes(bytes, offset, ft);
        result.push((name.clone(), val));
    }
    result
}

pub fn marshal_struct(fields: &[(String, FfiValue)], st: &FfiStruct) -> Result<Vec<u8>, String> {
    let mut buf = vec![0u8; st.size];
    for (i, (name, ft)) in st.fields.iter().enumerate() {
        let offset = st.offsets[i];
        let val = fields.iter().find(|(n, _)| n == name)
            .ok_or_else(|| format!("missing struct field '{}'", name))?;
        write_value_to_bytes(&mut buf, offset, &val.1, ft)?;
    }
    Ok(buf)
}

fn read_value_from_bytes(bytes: &[u8], offset: usize, ft: &FfiType) -> FfiValue {
    let b = &bytes[offset..];
    match ft {
        FfiType::I8 => FfiValue::I8(b[0] as i8),
        FfiType::I16 => FfiValue::I16(i16::from_ne_bytes([b[0], b[1]])),
        FfiType::I32 => FfiValue::I32(i32::from_ne_bytes([b[0], b[1], b[2], b[3]])),
        FfiType::I64 => FfiValue::I64(i64::from_ne_bytes(b[..8].try_into().unwrap())),
        FfiType::U8 | FfiType::Bool => FfiValue::U8(b[0]),
        FfiType::U16 => FfiValue::U16(u16::from_ne_bytes([b[0], b[1]])),
        FfiType::U32 => FfiValue::U32(u32::from_ne_bytes([b[0], b[1], b[2], b[3]])),
        FfiType::U64 => FfiValue::U64(u64::from_ne_bytes(b[..8].try_into().unwrap())),
        FfiType::F32 => FfiValue::F32(f32::from_ne_bytes([b[0], b[1], b[2], b[3]])),
        FfiType::F64 => FfiValue::F64(f64::from_ne_bytes(b[..8].try_into().unwrap())),
        FfiType::Pointer | FfiType::CString | FfiType::Buffer => {
            let sz = std::mem::size_of::<*const c_void>();
            let mut ptr_bytes = [0u8; 8];
            ptr_bytes[..sz].copy_from_slice(&b[..sz]);
            FfiValue::Pointer(usize::from_ne_bytes(ptr_bytes) as *mut c_void)
        }
        FfiType::Struct(s) => FfiValue::Struct(b[..s.size].to_vec()),
        FfiType::Void => FfiValue::Void,
    }
}

fn write_value_to_bytes(buf: &mut [u8], offset: usize, val: &FfiValue, ft: &FfiType) -> Result<(), String> {
    let b = &mut buf[offset..];
    match (val, ft) {
        (FfiValue::I8(v), FfiType::I8) => b[0] = *v as u8,
        (FfiValue::I16(v), FfiType::I16) => b[..2].copy_from_slice(&v.to_ne_bytes()),
        (FfiValue::I32(v), FfiType::I32) => b[..4].copy_from_slice(&v.to_ne_bytes()),
        (FfiValue::I64(v), FfiType::I64) => b[..8].copy_from_slice(&v.to_ne_bytes()),
        (FfiValue::U8(v), FfiType::U8) => b[0] = *v,
        (FfiValue::Bool(v), FfiType::Bool) => b[0] = if *v { 1 } else { 0 },
        (FfiValue::U16(v), FfiType::U16) => b[..2].copy_from_slice(&v.to_ne_bytes()),
        (FfiValue::U32(v), FfiType::U32) => b[..4].copy_from_slice(&v.to_ne_bytes()),
        (FfiValue::U64(v), FfiType::U64) => b[..8].copy_from_slice(&v.to_ne_bytes()),
        (FfiValue::F32(v), FfiType::F32) => b[..4].copy_from_slice(&v.to_ne_bytes()),
        (FfiValue::F64(v), FfiType::F64) => b[..8].copy_from_slice(&v.to_ne_bytes()),
        (FfiValue::Pointer(v), FfiType::Pointer) => {
            let sz = std::mem::size_of::<*const c_void>();
            b[..sz].copy_from_slice(&(*v as usize).to_ne_bytes()[..sz]);
        }
        (FfiValue::Struct(bytes), FfiType::Struct(s)) => b[..s.size].copy_from_slice(&bytes[..s.size]),
        _ => return Err("type mismatch in struct field".to_string()),
    }
    Ok(())
}

pub fn ffi_value_to_json(val: &FfiValue, ft: &FfiType) -> String {
    match val {
        FfiValue::Void => "null".to_string(),
        FfiValue::I8(v) => v.to_string(),
        FfiValue::I16(v) => v.to_string(),
        FfiValue::I32(v) => v.to_string(),
        FfiValue::I64(v) => v.to_string(),
        FfiValue::U8(v) => v.to_string(),
        FfiValue::U16(v) => v.to_string(),
        FfiValue::U32(v) => v.to_string(),
        FfiValue::U64(v) => v.to_string(),
        FfiValue::F32(v) => {
            if v.is_nan() { "null".to_string() }
            else if v.is_infinite() { "null".to_string() }
            else { format!("{}", v) }
        }
        FfiValue::F64(v) => {
            if v.is_nan() { "null".to_string() }
            else if v.is_infinite() { "null".to_string() }
            else { format!("{}", v) }
        }
        FfiValue::Bool(v) => if *v { "true" } else { "false" }.to_string(),
        FfiValue::Pointer(v) => format!("{}", *v as usize),
        FfiValue::CString(s) => {
            let raw = s.to_str().unwrap_or("");
            format!("\"{}\"", raw.replace('\\', "\\\\").replace('"', "\\\""))
        }
        FfiValue::Buffer(b) => {
            let nums: Vec<String> = b.iter().map(|x| x.to_string()).collect();
            format!("[{}]", nums.join(","))
        }
        FfiValue::Struct(bytes) => {
            if let FfiType::Struct(st) = ft {
                let fields = unmarshal_struct(bytes, st);
                let pairs: Vec<String> = fields.iter().map(|(name, fv)| {
                    let field_type = st.fields.iter().find(|(n, _)| n == name).map(|(_, t)| t).unwrap();
                    format!("\"{}\":{}", name, ffi_value_to_json(fv, field_type))
                }).collect();
                format!("{{{}}}", pairs.join(","))
            } else {
                "null".to_string()
            }
        }
    }
}

thread_local! {
    pub static FFI_LIBS: RefCell<Vec<Arc<DynLibrary>>> = RefCell::new(Vec::new());
    static FFI_CTX_NEXT: Cell<u32> = Cell::new(1);
    pub static FFI_CONTEXTS: RefCell<HashMap<u32, FfiCallContext>> = RefCell::new(HashMap::new());
}

pub fn register_ffi_lib(lib: Arc<DynLibrary>) {
    FFI_LIBS.with(|libs| libs.borrow_mut().push(lib));
}

pub fn unregister_ffi_lib(path: &str) {
    FFI_LIBS.with(|libs| libs.borrow_mut().retain(|l| l.path != path));
}

pub fn register_ffi_context(ctx: FfiCallContext) -> u32 {
    FFI_CTX_NEXT.with(|next| {
        let id = next.get();
        next.set(id + 1);
        FFI_CONTEXTS.with(|ctxs| ctxs.borrow_mut().insert(id, ctx));
        id
    })
}

pub fn unregister_ffi_contexts_for_lib(lib_path: &str) {
    FFI_CONTEXTS.with(|ctxs| {
        ctxs.borrow_mut().retain(|_, ctx| ctx.lib.path != lib_path);
    });
}

pub fn ekko_home() -> std::path::PathBuf {
    let home = if cfg!(target_os = "windows") {
        std::env::var("USERPROFILE").unwrap_or_else(|_| ".".to_string())
    } else {
        std::env::var("HOME").unwrap_or_else(|_| ".".to_string())
    };
    std::path::PathBuf::from(home).join(".ekko")
}

use std::collections::HashSet;

#[derive(Clone, Debug)]
pub struct PermissionSet {
    allowed: HashSet<String>,
    path_patterns: HashMap<String, Vec<String>>,
}

impl PermissionSet {
    
    pub fn new() -> Self {
        Self { allowed: HashSet::new(), path_patterns: HashMap::new() }
    }

    pub fn allow_all() -> Self {
        let mut s = Self::new();
        s.allowed.insert("all".to_string());
        s
    }

    
    pub fn from_flags(flags: &[String]) -> Self {
        let mut set = Self::new();
        for flag in flags {

            let cat = flag.split_once(':').map(|(c, _)| c).unwrap_or(flag.as_str());
            if !cat.is_empty() && !Self::VALID_CATEGORIES.contains(&cat) {
                eprintln!("\x1b[33mwarning:\x1b[0m unknown permission '{}' in --allow — did you mean one of: {}?", cat, Self::VALID_CATEGORIES.join(", "));
            }
            if let Some((cat, pattern)) = flag.split_once(':') {
                set.allowed.insert(cat.to_string());
                let patterns = set.path_patterns.entry(cat.to_string()).or_default();
                for part in pattern.split('+') {
                    if !part.is_empty() {
                        patterns.push(part.to_string());
                    }
                }
            } else {
                set.allowed.insert(flag.clone());
            }
        }
        set
    }

    const VALID_CATEGORIES: &'static [&'static str] = &["fs", "net", "crypto", "process", "env", "ffi", "all"];

    
    pub fn from_json(value: &serde_json::Value) -> Self {
        let mut flags = Vec::new();
        if let Some(obj) = value.as_object() {
            for (cat, val) in obj {
                if !Self::VALID_CATEGORIES.contains(&cat.as_str()) {
                    eprintln!("\x1b[33mwarning:\x1b[0m unknown permission category '{}' in ekko.json — did you mean one of: {}?", cat, Self::VALID_CATEGORIES.join(", "));
                }
                if let Some(arr) = val.as_array() {
                    for item in arr {
                        if let Some(s) = item.as_str() {
                            flags.push(format!("{}:{}", cat, s));
                        }
                    }
                } else if val.as_bool() == Some(true) {
                    flags.push(cat.clone());
                } else if let Some(s) = val.as_str() {
                    flags.push(format!("{}:{}", cat, s));
                }
            }
        }
        Self::from_flags(&flags)
    }

    pub fn merge(&self, other: &PermissionSet) -> PermissionSet {
        let mut result = self.clone();
        for cat in &other.allowed {
            result.allowed.insert(cat.clone());
        }
        for (cat, patterns) in &other.path_patterns {
            result.path_patterns.entry(cat.clone()).or_default().extend(patterns.clone());
        }
        result
    }

    pub fn check(&self, category: &str) -> bool {
        self.allowed.contains("all") || self.allowed.contains(category)
    }

    pub fn check_path(&self, category: &str, path: &str) -> bool {
        if self.allowed.contains("all") { return true; }
        if !self.allowed.contains(category) { return false; }
        match self.path_patterns.get(category) {
            Some(patterns) => patterns.iter().any(|p| glob_match_simple(p, path)),
            None => true,
        }
    }

    pub fn check_path_canonical(&self, category: &str, canonical_path: &str) -> bool {
        if self.allowed.contains("all") { return true; }
        if !self.allowed.contains(category) { return false; }
        match self.path_patterns.get(category) {
            Some(patterns) => patterns.iter().any(|p| {
                let resolved = resolve_pattern_to_canonical(p);

                
                
                glob_match_simple(&comparable_path(&resolved), &comparable_path(canonical_path))
            }),
            None => true,
        }
    }

    pub fn has_path_patterns(&self, category: &str) -> bool {
        self.path_patterns.get(category).map_or(false, |p| !p.is_empty())
    }

    pub fn check_ffi_allowlist(&self, lib_name: &str) -> bool {
        match self.path_patterns.get("ffi") {
            Some(patterns) => patterns.iter().any(|p| p == "unsafe" || p == lib_name),
            None => false,
        }
    }

    pub fn is_empty(&self) -> bool {
        self.allowed.is_empty()
    }

    pub fn is_full_trust(&self) -> bool {
        self.allowed.contains("all")
    }

    
    pub fn intersect(&self, child_request: &PermissionSet) -> Result<PermissionSet, String> {
        if child_request.allowed.contains("all") {
            return Ok(self.clone());
        }
        let mut result = PermissionSet::new();
        for cat in &child_request.allowed {
            if !self.check(cat) {
                return Err(format!(
                    "PermissionError: cannot grant '{}' — parent context does not have this permission",
                    cat
                ));
            }
            result.allowed.insert(cat.clone());
            if let Some(child_patterns) = child_request.path_patterns.get(cat.as_str()) {
                if let Some(parent_patterns) = self.path_patterns.get(cat.as_str()) {
                    let valid: Vec<String> = child_patterns.iter().filter(|cp| {
                        parent_patterns.iter().any(|pp| glob_match_simple(pp, cp) || glob_match_simple(cp, pp))
                    }).cloned().collect();
                    if !valid.is_empty() {
                        result.path_patterns.insert(cat.clone(), valid);
                    } else {
                        result.path_patterns.insert(cat.clone(), child_patterns.clone());
                    }
                } else {
                    result.path_patterns.insert(cat.clone(), child_patterns.clone());
                }
            } else if let Some(parent_patterns) = self.path_patterns.get(cat.as_str()) {
                result.path_patterns.insert(cat.clone(), parent_patterns.clone());
            }
        }
        Ok(result)
    }
}

fn resolve_pattern_to_canonical(pattern: &str) -> String {
    if pattern == "*" || pattern == "**" { return pattern.to_string(); }
    if pattern.ends_with("/**") {
        let prefix = &pattern[..pattern.len() - 3];
        if let Ok(canon) = std::fs::canonicalize(prefix) {
            return format!("{}{}{}", canon.to_string_lossy(), std::path::MAIN_SEPARATOR, "**");
        }
        if let Ok(cwd) = std::env::current_dir() {
            let p = std::path::Path::new(prefix);
            if p.is_relative() {
                let abs = cwd.join(p);
                return format!("{}{}{}", abs.to_string_lossy(), std::path::MAIN_SEPARATOR, "**");
            }
        }
        return pattern.to_string();
    }
    if pattern.contains('*') {
        if let Some(last_sep) = pattern.rfind(|c: char| c == '/' || c == '\\') {
            let dir = &pattern[..last_sep];
            let rest = &pattern[last_sep..];
            if let Ok(canon) = std::fs::canonicalize(dir) {
                return format!("{}{}", canon.to_string_lossy(), rest);
            }
        }
        return pattern.to_string();
    }
    if let Ok(canon) = std::fs::canonicalize(pattern) {
        return canon.to_string_lossy().to_string();
    }
    pattern.to_string()
}

#[cfg(windows)]
fn comparable_path(p: &str) -> String {
    let s = p.strip_prefix(r"\\?\UNC\").map(|r| format!(r"\\{}", r))
        .or_else(|| p.strip_prefix(r"\\?\").map(|r| r.to_string()))
        .unwrap_or_else(|| p.to_string());
    s.replace('\\', "/")
}
#[cfg(not(windows))]
fn comparable_path(p: &str) -> String { p.to_string() }

fn glob_match_simple(pattern: &str, path: &str) -> bool {
    if pattern == "*" || pattern == "**" || pattern == "unsafe" { return true; }
    if pattern.ends_with("/**") || pattern.ends_with("\\**") {
        let prefix = &pattern[..pattern.len() - 3];
        return path == prefix || (path.starts_with(prefix) && matches!(path.as_bytes().get(prefix.len()), Some(b'/' | b'\\')));
    }
    if pattern.contains('*') {
        let parts: Vec<&str> = pattern.split('*').collect();
        if parts.len() == 2 {
            if !path.starts_with(parts[0]) || !path.ends_with(parts[1]) { return false; }
            let middle = &path[parts[0].len()..path.len() - parts[1].len()];
            return !middle.contains('/') && !middle.contains('\\');
        }
    }
    pattern == path
}

#[cfg(test)]
mod tests {
    use super::*;

    
    #[test]
    fn ffi_call_floats_and_mixed() {
        unsafe extern "C" {
            fn sqrt(x: f64) -> f64;
            fn pow(x: f64, y: f64) -> f64;
            fn ldexp(x: f64, n: i32) -> f64; 
        }
        let f64_eq = |v: f64, want: f64| assert!((v - want).abs() < 1e-9, "got {v}, want {want}");

        let r = unsafe { ffi_call(sqrt as *const c_void, &[FfiType::F64], &FfiType::F64, &[FfiValue::F64(144.0)]) }.unwrap();
        match r { FfiValue::F64(v) => f64_eq(v, 12.0), _ => panic!("expected F64") }

        let r = unsafe { ffi_call(pow as *const c_void, &[FfiType::F64, FfiType::F64], &FfiType::F64, &[FfiValue::F64(2.0), FfiValue::F64(10.0)]) }.unwrap();
        match r { FfiValue::F64(v) => f64_eq(v, 1024.0), _ => panic!("expected F64") }

        let r = unsafe { ffi_call(ldexp as *const c_void, &[FfiType::F64, FfiType::I32], &FfiType::F64, &[FfiValue::F64(1.5), FfiValue::I32(3)]) }.unwrap();
        match r { FfiValue::F64(v) => f64_eq(v, 12.0), _ => panic!("expected F64") }
    }

    #[test]
    fn ffi_call_integers_still_work() {
        unsafe extern "C" { fn abs(n: i32) -> i32; }
        let r = unsafe { ffi_call(abs as *const c_void, &[FfiType::I32], &FfiType::I32, &[FfiValue::I32(-7)]) }.unwrap();
        match r { FfiValue::I32(v) => assert_eq!(v, 7), _ => panic!("expected I32") }
    }

    #[test]
    fn struct_layout_single_i32() {
        let (size, align, offsets) = compute_struct_layout(&[("x".into(), FfiType::I32)]);
        assert_eq!((size, align), (4, 4));
        assert_eq!(offsets, [0]);
    }

    #[test]
    fn struct_layout_two_f64() {
        let fields = vec![("x".into(), FfiType::F64), ("y".into(), FfiType::F64)];
        let (size, align, offsets) = compute_struct_layout(&fields);
        assert_eq!((size, align), (16, 8));
        assert_eq!(offsets, [0, 8]);
    }

    #[test]
    fn struct_layout_padding_i8_i32() {
        let fields = vec![("a".into(), FfiType::I8), ("b".into(), FfiType::I32)];
        let (size, align, offsets) = compute_struct_layout(&fields);
        assert_eq!(offsets, [0, 4]);
        assert_eq!((size, align), (8, 4));
    }

    #[test]
    fn struct_layout_trailing_padding() {
        let fields = vec![("a".into(), FfiType::I32), ("b".into(), FfiType::I8)];
        let (size, align, offsets) = compute_struct_layout(&fields);
        assert_eq!(offsets, [0, 4]);
        assert_eq!(size, 8);
    }

    #[test]
    fn struct_layout_mixed() {
        let fields = vec![
            ("a".into(), FfiType::I8), ("b".into(), FfiType::I16),
            ("c".into(), FfiType::I32), ("d".into(), FfiType::I64),
        ];
        let (size, align, offsets) = compute_struct_layout(&fields);
        assert_eq!(offsets, [0, 2, 4, 8]);
        assert_eq!((size, align), (16, 8));
    }

    #[test]
    fn struct_layout_nested() {
        let point = FfiStruct::new("Point".into(), vec![("x".into(), FfiType::F64), ("y".into(), FfiType::F64)]);
        let fields = vec![
            ("origin".into(), FfiType::Struct(point)),
            ("w".into(), FfiType::F64), ("h".into(), FfiType::F64),
        ];
        let (size, align, offsets) = compute_struct_layout(&fields);
        assert_eq!(offsets, [0, 16, 24]);
        assert_eq!((size, align), (32, 8));
    }

    #[test]
    fn struct_layout_all_u8() {
        let fields = vec![("a".into(), FfiType::U8), ("b".into(), FfiType::U8), ("c".into(), FfiType::U8)];
        let (size, align, offsets) = compute_struct_layout(&fields);
        assert_eq!(offsets, [0, 1, 2]);
        assert_eq!((size, align), (3, 1));
    }

    #[test]
    fn struct_layout_empty() {
        let (size, align, offsets) = compute_struct_layout(&[]);
        assert_eq!((size, align), (0, 1));
        assert!(offsets.is_empty());
    }

    #[test]
    fn struct_layout_pointer_field() {
        let psz = std::mem::size_of::<*const c_void>();
        let fields = vec![("data".into(), FfiType::Pointer), ("len".into(), FfiType::U32)];
        let (size, align, offsets) = compute_struct_layout(&fields);
        assert_eq!(offsets[0], 0);
        assert_eq!(offsets[1], psz);
        assert_eq!(align, psz);
    }

    #[test]
    fn type_sizes_correct() {
        assert_eq!(type_size(&FfiType::Void), 0);
        assert_eq!(type_size(&FfiType::I8), 1);
        assert_eq!(type_size(&FfiType::I16), 2);
        assert_eq!(type_size(&FfiType::I32), 4);
        assert_eq!(type_size(&FfiType::I64), 8);
        assert_eq!(type_size(&FfiType::F32), 4);
        assert_eq!(type_size(&FfiType::F64), 8);
        assert_eq!(type_size(&FfiType::Bool), 1);
    }

    #[test]
    fn type_alignments_correct() {
        assert_eq!(type_alignment(&FfiType::I8), 1);
        assert_eq!(type_alignment(&FfiType::I16), 2);
        assert_eq!(type_alignment(&FfiType::I32), 4);
        assert_eq!(type_alignment(&FfiType::I64), 8);
        assert_eq!(type_alignment(&FfiType::F64), 8);
        assert_eq!(type_alignment(&FfiType::Bool), 1);
    }

    #[test]
    fn struct_marshal_roundtrip() {
        let st = FfiStruct::new("T".into(), vec![("a".into(), FfiType::I32), ("b".into(), FfiType::F64)]);
        let fields = vec![("a".into(), FfiValue::I32(42)), ("b".into(), FfiValue::F64(3.14))];
        let bytes = marshal_struct(&fields, &st).unwrap();
        assert_eq!(bytes.len(), st.size);
        let out = unmarshal_struct(&bytes, &st);
        match &out[0].1 { FfiValue::I32(v) => assert_eq!(*v, 42), _ => panic!("expected I32") }
        match &out[1].1 { FfiValue::F64(v) => assert!((v - 3.14).abs() < f64::EPSILON), _ => panic!("expected F64") }
    }

    #[test]
    fn struct_marshal_with_padding() {
        let st = FfiStruct::new("P".into(), vec![("flag".into(), FfiType::U8), ("val".into(), FfiType::I32)]);
        let fields = vec![("flag".into(), FfiValue::U8(1)), ("val".into(), FfiValue::I32(0x12345678))];
        let bytes = marshal_struct(&fields, &st).unwrap();
        assert_eq!(bytes.len(), 8);
        assert_eq!(bytes[0], 1);
        assert_eq!(i32::from_ne_bytes([bytes[4], bytes[5], bytes[6], bytes[7]]), 0x12345678);
    }

    #[test]
    fn json_primitives() {
        assert_eq!(ffi_value_to_json(&FfiValue::I32(42), &FfiType::I32), "42");
        assert_eq!(ffi_value_to_json(&FfiValue::Bool(true), &FfiType::Bool), "true");
        assert_eq!(ffi_value_to_json(&FfiValue::Void, &FfiType::Void), "null");
    }

    #[test]
    fn json_buffer() {
        assert_eq!(ffi_value_to_json(&FfiValue::Buffer(vec![72, 101, 108]), &FfiType::Buffer), "[72,101,108]");
    }

    #[test]
    fn json_struct() {
        let st = FfiStruct::new("P".into(), vec![("x".into(), FfiType::I32), ("y".into(), FfiType::I32)]);
        let fields = vec![("x".into(), FfiValue::I32(10)), ("y".into(), FfiValue::I32(20))];
        let bytes = marshal_struct(&fields, &st).unwrap();
        let json = ffi_value_to_json(&FfiValue::Struct(bytes), &FfiType::Struct(st));
        assert!(json.contains("\"x\":10"));
        assert!(json.contains("\"y\":20"));
    }

    #[test]
    fn context_registry() {
        let sys_lib = if cfg!(windows) { "kernel32.dll" } else if cfg!(target_os = "macos") { "libSystem.B.dylib" } else { "libc.so.6" };
        let lib = Arc::new(DynLibrary { _lib: unsafe { libloading::Library::new(sys_lib).unwrap() }, symbols: HashMap::new(), path: "test".into() });
        let id = register_ffi_context(FfiCallContext { lib: lib.clone(), symbol_name: "test_fn".into() });
        assert!(id > 0);
        FFI_CONTEXTS.with(|ctxs| {
            let ctxs = ctxs.borrow();
            assert!(ctxs.contains_key(&id));
            assert_eq!(ctxs[&id].symbol_name, "test_fn");
        });
        unregister_ffi_contexts_for_lib("test");
        FFI_CONTEXTS.with(|ctxs| assert!(!ctxs.borrow().contains_key(&id)));
    }

    #[test]
    fn permission_empty_denies() {
        let p = PermissionSet::new();
        assert!(!p.check("ffi"));
        assert!(!p.check("fs"));
    }

    #[test]
    fn permission_allow_all() {
        let p = PermissionSet::allow_all();
        assert!(p.check("ffi"));
        assert!(p.check("fs"));
        assert!(p.check_path("ffi", "/any/path"));
    }

    #[test]
    fn permission_allow_specific() {
        let p = PermissionSet::from_flags(&["ffi".into(), "fs".into()]);
        assert!(p.check("ffi"));
        assert!(p.check("fs"));
        assert!(!p.check("net"));
    }

    #[test]
    fn permission_path_pattern() {
        let p = PermissionSet::from_flags(&["ffi:./native/**".into()]);
        assert!(p.check("ffi"));
        assert!(p.check_path("ffi", "./native/libfoo.so"));
        assert!(p.check_path("ffi", "./native/sub/libbar.so"));
        assert!(!p.check_path("ffi", "/usr/lib/libsys.so"));
    }

    #[test]
    fn permission_no_path_allows_all_paths() {
        let p = PermissionSet::from_flags(&["ffi".into()]);
        assert!(p.check_path("ffi", "/any/path/libfoo.so"));
    }

    #[test]
    fn glob_match_simple_cases() {
        assert!(glob_match_simple("*", "anything"));
        assert!(glob_match_simple("**", "anything"));
        assert!(glob_match_simple("./native/**", "./native/lib.so"));
        assert!(glob_match_simple("./native/**", "./native/sub/lib.so"));
        assert!(!glob_match_simple("./native/**", "./other/lib.so"));
        assert!(glob_match_simple("*.so", "libfoo.so"));
        assert!(!glob_match_simple("*.so", "libfoo.dll"));
        assert!(glob_match_simple("/exact/path", "/exact/path"));
        assert!(!glob_match_simple("/exact/path", "/other/path"));
    }

    
    
    #[test]
    fn comparable_path_matches_across_canonical_forms() {
        #[cfg(windows)]
        {
            assert_eq!(comparable_path(r"\\?\D:\a\b"), "D:/a/b");
            assert_eq!(comparable_path(r"D:\git\app\e2e/_x\**"), "D:/git/app/e2e/_x/**");
            assert!(glob_match_simple(
                &comparable_path(r"D:\git\app\e2e/_x\**"),                 
                &comparable_path(r"\\?\D:\git\app\e2e\_x\a.txt")));        
            assert!(!glob_match_simple(
                &comparable_path(r"D:\git\app\e2e/_x\**"),
                &comparable_path(r"\\?\D:\git\app\e2e\_y\a.txt")));        
        }
        #[cfg(not(windows))]
        {
            assert_eq!(comparable_path("/a/b"), "/a/b");                    
            assert!(glob_match_simple(
                &comparable_path("/app/data/**"), &comparable_path("/app/data/a.txt")));
        }
    }

    #[test]
    fn permission_is_full_trust() {
        assert!(PermissionSet::allow_all().is_full_trust());
        assert!(!PermissionSet::new().is_full_trust());
        assert!(!PermissionSet::from_flags(&["fs".into()]).is_full_trust());
    }

    #[test]
    fn permission_intersect_child_subset() {
        let parent = PermissionSet::from_flags(&["fs".into(), "net".into(), "crypto".into()]);
        let child = PermissionSet::from_flags(&["fs".into(), "net".into()]);
        let result = parent.intersect(&child).unwrap();
        assert!(result.check("fs"));
        assert!(result.check("net"));
        assert!(!result.check("crypto"));
    }

    #[test]
    fn permission_intersect_child_exceeds_parent() {
        let parent = PermissionSet::from_flags(&["fs".into()]);
        let child = PermissionSet::from_flags(&["fs".into(), "net".into()]);
        let result = parent.intersect(&child);
        assert!(result.is_err());
    }

    #[test]
    fn permission_intersect_child_all_constrained_to_parent() {
        let parent = PermissionSet::from_flags(&["fs".into(), "net".into()]);
        let child = PermissionSet::allow_all();
        let result = parent.intersect(&child).unwrap();
        assert!(result.check("fs"));
        assert!(result.check("net"));
        assert!(!result.check("crypto"));
    }

    #[test]
    fn permission_intersect_parent_all_grants_child() {
        let parent = PermissionSet::allow_all();
        let child = PermissionSet::from_flags(&["fs".into(), "net".into()]);
        let result = parent.intersect(&child).unwrap();
        assert!(result.check("fs"));
        assert!(result.check("net"));
        assert!(!result.check("crypto"));
    }

    #[test]
    fn permission_intersect_path_patterns_inherited() {
        let parent = PermissionSet::from_flags(&["fs:./data/**".into()]);
        let child = PermissionSet::from_flags(&["fs".into()]);
        let result = parent.intersect(&child).unwrap();
        assert!(result.check("fs"));
        assert!(result.check_path("fs", "./data/file.txt"));
        assert!(!result.check_path("fs", "./secrets/key.pem"));
    }

    #[test]
    fn permission_default_deny_for_empty() {
        let empty = PermissionSet::new();
        assert!(!empty.check("fs"));
        assert!(!empty.check("net"));
        assert!(!empty.check("env"));
        assert!(!empty.check("crypto"));
        assert!(!empty.check("process"));
        assert!(!empty.check_path("fs", "./anything"));
    }

    #[test]
    fn permission_env_with_specific_keys() {
        let p = PermissionSet::from_flags(&["env:DATABASE_URL".into(), "env:API_KEY".into()]);
        assert!(p.check("env"));
        assert!(p.check_path("env", "DATABASE_URL"));
        assert!(p.check_path("env", "API_KEY"));
        assert!(!p.check_path("env", "SECRET_TOKEN"));
    }

    #[test]
    fn permission_from_json_object() {
        let json: serde_json::Value = serde_json::json!({
            "fs": ["./data/**", "./config/**"],
            "net": ["api.example.com"],
            "env": ["DATABASE_URL"],
            "crypto": true
        });
        let p = PermissionSet::from_json(&json);
        assert!(p.check("fs"));
        assert!(p.check("net"));
        assert!(p.check("env"));
        assert!(p.check("crypto"));
        assert!(!p.check("process"));
        assert!(p.check_path("fs", "./data/file.txt"));
        assert!(!p.check_path("fs", "./secrets/key.pem"));
        assert!(p.check_path("net", "api.example.com"));
        assert!(!p.check_path("net", "evil.com"));
    }

    #[test]
    fn permission_merge_combines() {
        let a = PermissionSet::from_flags(&["fs".into()]);
        let b = PermissionSet::from_flags(&["net".into()]);
        let merged = a.merge(&b);
        assert!(merged.check("fs"));
        assert!(merged.check("net"));
    }
}
