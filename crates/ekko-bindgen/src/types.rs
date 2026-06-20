// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


pub fn cs_to_wire_type(cs_type: &str) -> &'static str {
    match cs_type {
        "int" => "int",
        "long" => "long",
        "double" => "double",
        "bool" => "byte",
        "string" => "NativeString",
        "byte[]" => "NativeBuffer",
        "nint" => "nint",
        _ => "NativeString",
    }
}

pub fn cs_to_rust_type(cs_type: &str) -> &'static str {
    match cs_type {
        "int" => "i32",
        "long" => "i64",
        "double" => "f64",
        "bool" => "u8",
        "string" => "NativeString",
        "byte[]" => "NativeBuffer",
        "nint" => "isize",
        _ => "NativeString",
    }
}

pub fn cs_return_to_ok_method(cs_type: &str) -> &'static str {
    match cs_type {
        "int" => "OkInt",
        "long" => "OkInt",
        "double" => "OkFloat",
        "string" => "OkString",
        "byte[]" => "OkBuffer",
        "bool" => "OkInt",
        "void" => "OkVoid",
        _ => "OkString",
    }
}

pub fn cs_return_to_rust_accessor(cs_type: &str) -> &'static str {
    match cs_type {
        "int" | "long" | "bool" => "int_value",
        "double" => "float_value",
        "string" => "string_value",
        "byte[]" => "buffer_value",
        "void" => "",
        _ => "string_value",
    }
}

pub fn export_name_to_c_symbol(export_name: &str) -> String {
    format!("ekko_{}", export_name.replace('.', "_"))
}

pub fn needs_managed_conversion(cs_type: &str) -> bool {
    matches!(cs_type, "string" | "byte[]")
}
