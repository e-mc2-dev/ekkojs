// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

mod parser;
mod types;
mod gen_csharp;
mod gen_rust;

use std::fs;

fn main() -> anyhow::Result<()> {
    let repo_root = find_repo_root()?;
    let apis_dir = repo_root.join("dotnet/EkkoNative/Apis");
    let cs_out_dir = repo_root.join("dotnet/EkkoNative/Generated");
    let rs_out_dir = repo_root.join("crates/ekko-core/src/ffi/generated");

    if !apis_dir.exists() {
        anyhow::bail!("APIs directory not found: {}", apis_dir.display());
    }

    fs::create_dir_all(&cs_out_dir)?;
    fs::create_dir_all(&rs_out_dir)?;

    println!("ekko-bindgen: scanning {}", apis_dir.display());
    let methods = parser::parse_directory(&apis_dir)?;

    if methods.is_empty() {
        println!("ekko-bindgen: no [EkkoExport] methods found");
        return Ok(());
    }

    println!("ekko-bindgen: found {} exported methods", methods.len());

    let mut by_class: std::collections::HashMap<String, Vec<parser::ExportedMethod>> =
        std::collections::HashMap::new();
    for m in &methods {
        by_class
            .entry(m.class_name.clone())
            .or_default()
            .push(m.clone());
    }

    let mut rs_mod_entries = Vec::new();

    let free_fns_cs = "using System.Runtime.InteropServices;\n\npublic static class NativeFreeExports\n{\n    [UnmanagedCallersOnly(EntryPoint = \"ekko_native_free_string\")]\n    public static void FreeString(NativeString s) => s.Free();\n\n    [UnmanagedCallersOnly(EntryPoint = \"ekko_native_free_buffer\")]\n    public static void FreeBuffer(NativeBuffer b) => b.Free();\n}\n";
    fs::write(cs_out_dir.join("NativeFreeExports.g.cs"), free_fns_cs)?;

    for (class_name, class_methods) in &by_class {
        let cs_code = gen_csharp::generate_exports(class_methods, class_name, false);
        let cs_path = cs_out_dir.join(format!("{}Exports.g.cs", class_name));
        fs::write(&cs_path, &cs_code)?;
        println!("  C# → {}", cs_path.display());

        let mod_name = to_snake_case(class_name);
        let rs_code = gen_rust::generate_module(class_methods, &mod_name);
        let rs_path = rs_out_dir.join(format!("{}.rs", mod_name));
        fs::write(&rs_path, &rs_code)?;
        println!("  Rust → {}", rs_path.display());

        rs_mod_entries.push(mod_name);
    }

    let mod_rs = rs_mod_entries
        .iter()
        .map(|m| format!("pub mod {};", m))
        .collect::<Vec<_>>()
        .join("\n")
        + "\n";
    fs::write(rs_out_dir.join("mod.rs"), mod_rs)?;
    println!("  Rust → {}/mod.rs", rs_out_dir.display());

    println!("ekko-bindgen: done");
    Ok(())
}

fn find_repo_root() -> anyhow::Result<std::path::PathBuf> {
    let mut dir = std::env::current_dir()?;
    loop {
        if dir.join("Cargo.toml").exists() && dir.join("dotnet").exists() {
            return Ok(dir);
        }
        if !dir.pop() {
            anyhow::bail!("could not find repo root (no Cargo.toml + dotnet/ found)");
        }
    }
}

fn to_snake_case(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() {
            if i > 0 {
                result.push('_');
            }
            result.push(c.to_lowercase().next().unwrap());
        } else {
            result.push(c);
        }
    }
    result
}
