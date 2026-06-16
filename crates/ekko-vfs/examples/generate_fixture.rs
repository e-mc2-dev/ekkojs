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

fn main() {
    let metadata = ekko_vfs::PackageMetadata {
        name: "test-vfs-pkg".into(),
        version: "2.0.0".into(),
        platform: "any".into(),
        arch: "any".into(),
        exports: HashMap::from([
            (".".into(), "src/index.js".into()),
            ("./utils".into(), "src/utils.js".into()),
            ("./math".into(), "src/math.js".into()),
        ]),
        bin: HashMap::new(),
        entry: None,
        project_type: None,
        native: HashMap::new(),
        loading: "memory".into(),
        integrity: String::new(),
        signature: String::new(),
        ship: HashMap::new(),
    };

    let mut writer = ekko_vfs::EklWriter::new(metadata);

    writer.add_entry("src/index.js", br#"export const name = "test-vfs-pkg";
export const version = "2.0.0";
export function greet(who) { return "Hello, " + who + "!"; }
export function identity(x) { return x; }
"#.to_vec());

    writer.add_entry("src/utils.js", br#"export function uppercase(s) { return s.toUpperCase(); }
export function lowercase(s) { return s.toLowerCase(); }
export function trim(s) { return s.trim(); }
export function contains(s, sub) { return s.indexOf(sub) !== -1; }
"#.to_vec());

    writer.add_entry("src/math.js", br#"export function square(n) { return n * n; }
export function cube(n) { return n * n * n; }
export function abs(n) { return n < 0 ? -n : n; }
export function max(a, b) { return a > b ? a : b; }
export function min(a, b) { return a < b ? a : b; }
"#.to_vec());

    let ekl_data = writer.build().unwrap();
    let out_path = std::env::args().nth(1)
        .unwrap_or_else(|| "tests/vfs-fixture/test-vfs-pkg.ekl".into());
    std::fs::create_dir_all(std::path::Path::new(&out_path).parent().unwrap()).ok();
    std::fs::write(&out_path, &ekl_data).unwrap();
    println!("Generated {} ({} bytes, 3 entries)", out_path, ekl_data.len());
}
