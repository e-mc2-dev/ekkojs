// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



fn main() {

    
    println!("cargo:rerun-if-changed=assets/docs.ekl");

    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        println!("cargo:rustc-link-arg-bins=/STACK:8388608");
        embed_windows_icon();
    }
}

fn embed_windows_icon() {
    let manifest = env!("CARGO_MANIFEST_DIR");
    let assets = format!("{manifest}/assets");
    let rc = format!("{assets}/ekko.rc");
    let res = format!("{}/ekko.res", std::env::var("OUT_DIR").unwrap());
    println!("cargo:rerun-if-changed={rc}");
    println!("cargo:rerun-if-changed={assets}/ekko.ico");
    println!("cargo:rerun-if-env-changed=EKKO_RC");

    let rc_tool = std::env::var("EKKO_RC").unwrap_or_else(|_| "llvm-rc".into());
    
    match std::process::Command::new(&rc_tool).args(["/I", &assets, "/FO", &res, &rc]).status() {
        Ok(s) if s.success() => println!("cargo:rustc-link-arg-bins={res}"),
        Ok(s) => println!("cargo:warning=icon: {rc_tool} exited {s} — ekko.exe will have no icon"),
        Err(e) => println!("cargo:warning=icon: {rc_tool} not runnable ({e}) — ekko.exe will have no icon"),
    }
}
