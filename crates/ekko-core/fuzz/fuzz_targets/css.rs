#![no_main]
// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


use libfuzzer_sys::fuzz_target;
use ekko_core::parsers::css::{compile_sass, SassSyntax};

fuzz_target!(|data: &[u8]| {
    if let Ok(s) = std::str::from_utf8(data) {
        let _ = compile_sass(s, SassSyntax::Scss);
        let _ = compile_sass(s, SassSyntax::Sass);
    }
});
