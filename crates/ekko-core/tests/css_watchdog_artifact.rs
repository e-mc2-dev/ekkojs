// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


use ekko_core::parsers::css::{compile_sass, SassSyntax};
use std::time::{Duration, Instant};
#[test]
fn artifact_bounded() {
    let Ok(p) = std::env::var("EKKO_CSS_ART") else { return; };
    let s = std::fs::read_to_string(&p).unwrap_or_default();
    let t = Instant::now();
    let _ = compile_sass(&s, SassSyntax::Sass);
    let el = t.elapsed();
    eprintln!("WATCHDOG artifact {} bytes returned in {:?}", s.len(), el);
    assert!(el < Duration::from_secs(8), "watchdog did not bound the compile: {:?}", el);
}
