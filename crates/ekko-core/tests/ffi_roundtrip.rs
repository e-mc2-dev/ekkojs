// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::path::PathBuf;

#[test]
fn math_api_roundtrip() {
    let so_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../target/debug/EkkoNative.so");
    if !so_path.exists() {
        eprintln!("SKIP: {} not found (build .NET AOT first)", so_path.display());
        return;
    }
    let lib = unsafe { libloading::Library::new(&so_path).unwrap() };
    let api = ekko_core::ffi::generated::math_api::Api::load(lib).unwrap();
    
    assert_eq!(api.math_add(2, 3).unwrap(), 5);
    assert_eq!(api.math_multiply(6, 7).unwrap(), 42);
    assert!((api.math_divide(10.0, 3.0).unwrap() - 3.333333).abs() < 0.001);
    assert_eq!(api.math_greet("EkkoJS").unwrap(), "Hello, EkkoJS!");

    
    std::mem::forget(api);
}

#[tokio::test]
async fn async_math_api_roundtrip() {
    let so_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../target/debug/EkkoNative.so");
    if !so_path.exists() {
        eprintln!("SKIP: {} not found (build .NET AOT first)", so_path.display());
        return;
    }
    let lib = unsafe { libloading::Library::new(&so_path).unwrap() };
    let api = ekko_core::ffi::generated::math_api::Api::load(lib).unwrap();

    let result = api.math_slowAdd(3, 4).await.unwrap();
    assert_eq!(result, 7);

    let result = api.math_slowAdd(100, 200).await.unwrap();
    assert_eq!(result, 300);

    std::mem::forget(api);
}
