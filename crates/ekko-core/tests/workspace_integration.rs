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
use std::path::{Path, PathBuf};

fn create_fixture(base: &Path) {
    let root = base;
    std::fs::create_dir_all(root.join("apps/main/src")).unwrap();
    std::fs::create_dir_all(root.join("libs/core/src")).unwrap();
    std::fs::create_dir_all(root.join("libs/utils/src")).unwrap();

    std::fs::write(root.join("ekko.json"), r#"{
  "workspace": {
    "members": ["apps/*", "libs/*"],
    "map": {
      "@test/app": "apps/main",
      "@test/lib-core": "libs/core",
      "@test/lib-utils": "libs/utils"
    }
  }
}"#).unwrap();

    std::fs::write(root.join("apps/main/ekko.json"), r#"{
  "name": "@test/app",
  "version": "1.0.0",
  "type": "run",
  "entry": "src/main.ts",
  "ship": { "@test/lib-core": "1.0.0", "@test/lib-utils": "1.0.0" }
}"#).unwrap();

    std::fs::write(root.join("apps/main/src/main.ts"), r#"
export const appName = "test-app";
export const appVersion = "1.0.0";
"#).unwrap();

    std::fs::write(root.join("libs/core/ekko.json"), r#"{
  "name": "@test/lib-core",
  "version": "1.0.0",
  "type": "lib",
  "exports": {
    ".": "./src/index.ts",
    "./utils": "./src/utils.ts",
    "./models": "./src/models.ts"
  },
  "ship": { "@test/lib-utils": "1.0.0" }
}"#).unwrap();

    std::fs::write(root.join("libs/core/src/index.ts"), r#"
export const coreName: string = "core";
export function add(a: number, b: number): number { return a + b; }
"#).unwrap();

    std::fs::write(root.join("libs/core/src/utils.ts"), r#"
export function formatName(name: string): string { return `[${name}]`; }
"#).unwrap();

    std::fs::write(root.join("libs/core/src/models.ts"), r#"
export interface Model { id: number; name: string; }
export function createModel(id: number, name: string): Model { return { id, name }; }
"#).unwrap();

    std::fs::write(root.join("libs/utils/ekko.json"), r#"{
  "name": "@test/lib-utils",
  "version": "1.0.0",
  "type": "lib",
  "exports": { ".": "./src/index.ts" }
}"#).unwrap();

    std::fs::write(root.join("libs/utils/src/index.ts"), r#"
export function capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
export const VERSION: string = "1.0.0";
"#).unwrap();
}

fn unique_dir(name: &str) -> PathBuf {
    let id = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
    std::env::temp_dir().join(format!("ekko-integ-{}-{}", name, id))
}

#[test]
fn workspace_discovery_from_nested_file() {
    let base = unique_dir("discovery");
    create_fixture(&base);

    let nested = base.join("apps/main/src/main.ts");
    let ws = ekko_core::packages::workspace::discover_workspace(&nested);
    assert!(ws.is_some(), "workspace should be found from nested file");

    let ws = ws.unwrap();
    let root_canon = std::fs::canonicalize(&base).unwrap_or(base.clone());
    assert_eq!(std::fs::canonicalize(&ws.root).unwrap_or(ws.root.clone()), root_canon);
    assert!(ws.members.len() >= 3, "should have at least 3 members, got {}", ws.members.len());
    assert!(ws.members.contains_key("@test/app"));
    assert!(ws.members.contains_key("@test/lib-core"));
    assert!(ws.members.contains_key("@test/lib-utils"));

    let _ = std::fs::remove_dir_all(&base);
}

#[test]
fn member_resolution_via_workspace_map() {
    let base = unique_dir("member-res");
    create_fixture(&base);

    let ws = ekko_core::packages::workspace::discover_workspace(&base.join("apps/main/src/main.ts")).unwrap();
    let core = ws.members.get("@test/lib-core").unwrap();
    assert_eq!(core.name, "@test/lib-core");
    assert_eq!(core.version, "1.0.0");
    assert!(core.exports.contains_key("."));
    assert_eq!(core.exports["."], "./src/index.ts");

    let _ = std::fs::remove_dir_all(&base);
}

#[test]
fn subpath_exports_resolve() {
    let base = unique_dir("subpath");
    create_fixture(&base);

    let ws = ekko_core::packages::workspace::discover_workspace(&base.join("apps/main/src/main.ts")).unwrap();
    let core = ws.members.get("@test/lib-core").unwrap();
    assert_eq!(core.exports.get("./utils").unwrap(), "./src/utils.ts");
    assert_eq!(core.exports.get("./models").unwrap(), "./src/models.ts");

    let utils_file = core.root_dir.join("src/utils.ts");
    assert!(utils_file.exists(), "subpath export target should exist");

    let _ = std::fs::remove_dir_all(&base);
}

#[test]
fn ship_vs_build_deps() {
    let base = unique_dir("ship-build");
    create_fixture(&base);

    std::fs::write(base.join("apps/main/ekko.json"), r#"{
  "name": "@test/app",
  "version": "1.0.0",
  "type": "run",
  "entry": "src/main.ts",
  "ship": { "@test/lib-core": "1.0.0" },
  "build": { "test-helpers": "1.0.0" }
}"#).unwrap();

    let ws = ekko_core::packages::workspace::discover_workspace(&base.join("apps/main/src/main.ts")).unwrap();
    let app = ws.members.get("@test/app").unwrap();
    assert!(app.ship.contains_key("@test/lib-core"), "ship should have lib-core");
    assert!(app.build.contains_key("test-helpers"), "build should have test-helpers");
    assert!(!app.ship.contains_key("test-helpers"), "ship should NOT have test-helpers");

    let _ = std::fs::remove_dir_all(&base);
}

#[test]
fn build_transpiles_member() {
    let base = unique_dir("build");
    create_fixture(&base);

    let ws = ekko_core::packages::workspace::discover_workspace(&base.join("libs/utils/src/index.ts")).unwrap();
    let utils = ws.members.get("@test/lib-utils").unwrap();
    let result = ekko_core::packages::build::build_member(utils).unwrap();

    assert!(!result.files.is_empty(), "build should produce files");
    let index = result.files.iter().find(|f| f.relative_path.contains("index")).unwrap();
    let content = String::from_utf8_lossy(&index.content);
    assert!(!content.contains(": string"), "TypeScript annotations should be stripped");
    assert!(content.contains("capitalize") || content.contains("VERSION"), "JS content should be preserved");

    let _ = std::fs::remove_dir_all(&base);
}

#[test]
fn pack_creates_valid_ekl() {
    let base = unique_dir("pack");
    create_fixture(&base);

    let ws = ekko_core::packages::workspace::discover_workspace(&base.join("libs/utils/src/index.ts")).unwrap();
    let utils = ws.members.get("@test/lib-utils").unwrap();
    let ekl_bytes = ekko_core::packages::build::pack_member(utils, "any", "any").unwrap();

    assert!(ekl_bytes.len() > 4, "ekl should have content");
    assert_eq!(&ekl_bytes[0..4], b"EKKO", "ekl should have EKKO magic header");

    let pkg = ekko_vfs::EklPackage::from_bytes(ekl_bytes).unwrap();
    assert_eq!(pkg.metadata.name, "@test/lib-utils");
    assert_eq!(pkg.metadata.version, "1.0.0");
    assert!(pkg.metadata.exports.contains_key("."));
    assert!(pkg.entry_count() > 0, "should have at least one entry");

    let _ = std::fs::remove_dir_all(&base);
}

#[test]
fn vfs_load_and_resolve() {
    let base = unique_dir("vfs");
    create_fixture(&base);

    let ws = ekko_core::packages::workspace::discover_workspace(&base.join("libs/utils/src/index.ts")).unwrap();
    let utils = ws.members.get("@test/lib-utils").unwrap();
    let ekl_bytes = ekko_core::packages::build::pack_member(utils, "any", "any").unwrap();

    let registry = ekko_vfs::VfsRegistry::new();
    registry.load_package_from_bytes(ekl_bytes).unwrap();

    assert!(registry.has_package("@test/lib-utils"));
    let pkg = registry.get_package("@test/lib-utils").unwrap();
    assert_eq!(pkg.metadata.name, "@test/lib-utils");

    let entry_path = pkg.entries().first().map(|e| e.path.clone())
        .expect("package should have at least one entry");
    let source = registry.read_module("@test/lib-utils", &entry_path).unwrap();
    assert!(source.contains("capitalize") || source.contains("VERSION"),
        "VFS should serve transpiled source");

    let _ = std::fs::remove_dir_all(&base);
}

#[test]
fn lockfile_roundtrip() {
    let base = unique_dir("lockfile");
    std::fs::create_dir_all(&base).unwrap();
    std::fs::write(base.join("ekko.json"), r#"{"name":"test"}"#).unwrap();

    ekko_core::packages::store::install_lockfile_entry(&base, "my-pkg", "1.0.0", "sha256-abc", 512,
        ekko_core::packages::workspace::DepCategory::Ship, &HashMap::from([(".".into(), "src/index.js".into())])).unwrap();

    let content = std::fs::read_to_string(base.join("ekko.lock")).unwrap();
    let lock: serde_json::Value = serde_json::from_str(&content).unwrap();
    assert_eq!(lock["packages"]["my-pkg"]["version"], "1.0.0");
    assert_eq!(lock["packages"]["my-pkg"]["integrity"], "sha256-abc");
    assert_eq!(lock["packages"]["my-pkg"]["category"], "ship");

    let cfg_content = std::fs::read_to_string(base.join("ekko.json")).unwrap();
    let cfg: serde_json::Value = serde_json::from_str(&cfg_content).unwrap();
    assert_eq!(cfg["ship"]["my-pkg"], "1.0.0");

    let _ = std::fs::remove_dir_all(&base);
}

#[test]
fn ekl_extract_creates_manifest() {
    let base = unique_dir("extract");
    create_fixture(&base);

    let ws = ekko_core::packages::workspace::discover_workspace(&base.join("libs/utils/src/index.ts")).unwrap();
    let utils = ws.members.get("@test/lib-utils").unwrap();
    let ekl_bytes = ekko_core::packages::build::pack_member(utils, "any", "any").unwrap();

    let ekl_path = base.join("test.ekl");
    std::fs::write(&ekl_path, &ekl_bytes).unwrap();

    let dest = base.join("store/test-lib-utils/1.0.0");
    ekko_core::packages::store::extract_to_store(&ekl_path, &dest).unwrap();

    assert!(dest.join("manifest.json").exists(), "manifest.json should be created");
    let manifest: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(dest.join("manifest.json")).unwrap()
    ).unwrap();
    assert_eq!(manifest["name"], "@test/lib-utils");
    assert_eq!(manifest["version"], "1.0.0");

    let _ = std::fs::remove_dir_all(&base);
}

#[test]
fn vendor_copies_store_to_local() {
    let base = unique_dir("vendor");
    std::fs::create_dir_all(&base).unwrap();
    std::fs::write(base.join("ekko.json"), r#"{"name":"test"}"#).unwrap();
    std::fs::write(base.join("ekko.lock"), r#"{"version":2,"packages":{}}"#).unwrap();

    let store_pkg = ekko_core::packages::store::store_path().join("__test-vendor-pkg").join("1.0.0");
    std::fs::create_dir_all(&store_pkg).unwrap();
    std::fs::write(store_pkg.join("manifest.json"), r#"{"name":"__test-vendor-pkg","version":"1.0.0"}"#).unwrap();
    std::fs::create_dir_all(store_pkg.join("src")).unwrap();
    std::fs::write(store_pkg.join("src/index.js"), "export const x = 42;").unwrap();

    std::fs::write(base.join("ekko.lock"), r#"{"version":2,"packages":{"__test-vendor-pkg":{"version":"1.0.0","integrity":"sha256-test","source":"registry:pkg.ekko.dev","category":"ship"}}}"#).unwrap();

    let vendored = ekko_core::packages::store::vendor_dependencies(&base).unwrap();
    assert!(vendored.len() >= 1);

    let vendor_path = base.join("vendor/__test-vendor-pkg/1.0.0/manifest.json");
    assert!(vendor_path.exists(), "vendored manifest should exist");

    let lock_content = std::fs::read_to_string(base.join("ekko.lock")).unwrap();
    let lock: serde_json::Value = serde_json::from_str(&lock_content).unwrap();
    let source = lock["packages"]["__test-vendor-pkg"]["source"].as_str().unwrap();
    assert!(source.starts_with("vendor:"), "source should be updated to vendor");

    let _ = std::fs::remove_dir_all(&base);
    let _ = std::fs::remove_dir_all(&store_pkg);
}

#[test]
fn permission_set_ffi_enforcement() {
    let empty = ekko_core::ffi::ffi_runtime::PermissionSet::new();
    assert!(!empty.check("ffi"), "empty permissions should deny ffi");

    let with_ffi = ekko_core::ffi::ffi_runtime::PermissionSet::from_flags(&["ffi".into()]);
    assert!(with_ffi.check("ffi"), "ffi flag should allow ffi");
    assert!(!with_ffi.check("net"), "ffi flag should not allow net");

    let with_path = ekko_core::ffi::ffi_runtime::PermissionSet::from_flags(&["ffi:./native/**".into()]);
    assert!(with_path.check_path("ffi", "./native/lib.so"));
    assert!(!with_path.check_path("ffi", "/usr/lib/libc.so"));

    let all = ekko_core::ffi::ffi_runtime::PermissionSet::allow_all();
    assert!(all.check("anything"));
    assert!(all.check_path("ffi", "/any/path"));
}

#[test]
fn script_mode_no_workspace() {
    let base = unique_dir("script-mode");
    std::fs::create_dir_all(&base).unwrap();
    std::fs::write(base.join("script.ts"), "export const x = 42;").unwrap();

    let ws = ekko_core::packages::workspace::discover_workspace(&base.join("script.ts"));
    assert!(ws.is_none() || ws.as_ref().map_or(true, |w| w.members.is_empty()),
        "script mode should work without workspace members");

    let _ = std::fs::remove_dir_all(&base);
}

#[test]
fn cross_member_ship_deps_visible() {
    let base = unique_dir("cross-member");
    create_fixture(&base);

    let ws = ekko_core::packages::workspace::discover_workspace(&base.join("apps/main/src/main.ts")).unwrap();
    let app = ws.members.get("@test/app").unwrap();
    assert!(app.ship.contains_key("@test/lib-core"), "app should depend on lib-core");

    let core = ws.members.get("@test/lib-core").unwrap();
    assert!(core.ship.contains_key("@test/lib-utils"), "lib-core should depend on lib-utils");

    let utils = ws.members.get("@test/lib-utils").unwrap();
    assert!(utils.ship.is_empty(), "lib-utils should have no deps");

    let _ = std::fs::remove_dir_all(&base);
}

#[test]
fn platform_detection_valid() {
    let (os, arch) = ekko_core::packages::build::current_platform();
    assert!(!os.is_empty());
    assert!(!arch.is_empty());
    let key = ekko_core::packages::build::current_platform_key();
    assert!(key.contains('-'), "platform key should be os-arch format");
}

#[test]
fn pack_vfs_roundtrip_integrity() {
    let base = unique_dir("roundtrip");
    create_fixture(&base);

    let ws = ekko_core::packages::workspace::discover_workspace(&base.join("libs/core/src/index.ts")).unwrap();
    let core = ws.members.get("@test/lib-core").unwrap();
    let ekl_bytes = ekko_core::packages::build::pack_member(core, "any", "any").unwrap();

    let pkg = ekko_vfs::EklPackage::from_bytes(ekl_bytes).unwrap();
    assert_eq!(pkg.metadata.name, "@test/lib-core");
    assert!(pkg.metadata.exports.contains_key("."));
    assert!(pkg.metadata.exports.contains_key("./utils"));
    assert!(pkg.metadata.exports.contains_key("./models"));

    for entry in pkg.entries() {
        let data = pkg.read_verified(&entry.path);
        assert!(data.is_ok(), "entry '{}' should pass integrity check", entry.path);
    }

    let _ = std::fs::remove_dir_all(&base);
}

#[test]
fn sha256_integrity_verification() {
    let base = unique_dir("sha256");
    create_fixture(&base);

    let ws = ekko_core::packages::workspace::discover_workspace(&base.join("libs/utils/src/index.ts")).unwrap();
    let utils = ws.members.get("@test/lib-utils").unwrap();
    let ekl_bytes = ekko_core::packages::build::pack_member(utils, "any", "any").unwrap();

    let hash1 = ekko_core::packages::store::sha256_of(&ekl_bytes);
    let hash2 = ekko_core::packages::store::sha256_of(&ekl_bytes);
    assert_eq!(hash1, hash2, "same data should produce same hash");
    assert_eq!(hash1.len(), 64, "SHA-256 hex should be 64 chars");

    let hash_empty = ekko_core::packages::store::sha256_of(b"");
    assert_eq!(hash_empty, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

    let _ = std::fs::remove_dir_all(&base);
}

#[test]
fn member_kind_parsed_correctly() {
    let base = unique_dir("member-kind");
    create_fixture(&base);

    let ws = ekko_core::packages::workspace::discover_workspace(&base.join("apps/main/src/main.ts")).unwrap();
    let app = ws.members.get("@test/app").unwrap();
    assert_eq!(app.kind, ekko_core::packages::workspace::MemberKind::Run);

    let core = ws.members.get("@test/lib-core").unwrap();
    assert_eq!(core.kind, ekko_core::packages::workspace::MemberKind::Lib);

    let _ = std::fs::remove_dir_all(&base);
}

#[test]
fn multiple_vfs_packages_coexist() {
    let base = unique_dir("multi-vfs");
    create_fixture(&base);

    let ws = ekko_core::packages::workspace::discover_workspace(&base.join("libs/core/src/index.ts")).unwrap();

    let core = ws.members.get("@test/lib-core").unwrap();
    let utils = ws.members.get("@test/lib-utils").unwrap();

    let core_ekl = ekko_core::packages::build::pack_member(core, "any", "any").unwrap();
    let utils_ekl = ekko_core::packages::build::pack_member(utils, "any", "any").unwrap();

    let registry = ekko_vfs::VfsRegistry::new();
    registry.load_package_from_bytes(core_ekl).unwrap();
    registry.load_package_from_bytes(utils_ekl).unwrap();

    assert_eq!(registry.package_count(), 2);
    assert!(registry.has_package("@test/lib-core"));
    assert!(registry.has_package("@test/lib-utils"));

    let core_pkg = registry.get_package("@test/lib-core").unwrap();
    let core_entry = core_pkg.entries().first().unwrap().path.clone();
    let core_src = registry.read_module("@test/lib-core", &core_entry).unwrap();
    assert!(!core_src.is_empty(), "core module should have content");

    let utils_pkg = registry.get_package("@test/lib-utils").unwrap();
    let utils_entry = utils_pkg.entries().first().unwrap().path.clone();
    let utils_src = registry.read_module("@test/lib-utils", &utils_entry).unwrap();
    assert!(!utils_src.is_empty(), "utils module should have content");

    let _ = std::fs::remove_dir_all(&base);
}
