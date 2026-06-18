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
use ekko_core::db::sqlite_db::{db_open, db_exec, db_query, db_close};

fuzz_target!(|data: &[u8]| {
    if let Ok(s) = std::str::from_utf8(data) {
        if let Ok(h) = db_open(":memory:") {
            let _ = db_exec(h, "CREATE TABLE IF NOT EXISTS t(a)", "[]");
            let _ = db_exec(h, s, "[]");
            let _ = db_query(h, s, "[]");
            let p = serde_json::to_string(&vec![s]).unwrap_or_else(|_| "[]".to_string());
            let _ = db_exec(h, "INSERT INTO t VALUES(?1)", &p);
            let _ = db_query(h, "SELECT a FROM t", "[]");
            db_close(h);
        }
    }
});
