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
use crate::packages::registry::RegistryClient;
use crate::packages::workspace::DepCategory;
use crate::packages::build;

pub fn store_path() -> PathBuf {
    store_root()
}

pub fn store_root() -> PathBuf {
    let home = if cfg!(target_os = "windows") {
        std::env::var("USERPROFILE").unwrap_or_else(|_| ".".to_string())
    } else {
        std::env::var("HOME").unwrap_or_else(|_| ".".to_string())
    };
    let config_path = PathBuf::from(&home).join(".ekko").join("config.json");
    if config_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(custom) = config["store_path"].as_str() {
                    return PathBuf::from(custom);
                }
            }
        }
    }
    PathBuf::from(home).join(".ekko").join("store")
}

fn temp_dir() -> PathBuf {
    std::env::temp_dir().join("ekko-downloads")
}

pub fn current_platform() -> (&'static str, &'static str) {
    build::current_platform()
}

pub fn install_package(
    client: &RegistryClient,
    name: &str,
    version: Option<&str>,
    category: DepCategory,
    workspace_root: &Path,
) -> anyhow::Result<AddResult> {
    let (result, exports) = fetch_extract(client, name, version)?;
    update_ekko_json(workspace_root, &result.name, &result.version, category)?;
    update_lockfile(workspace_root, &result.name, &result.version, &result.integrity, result.size, category, &exports)?;
    Ok(result)
}

pub fn fetch_extract(
    client: &RegistryClient,
    name: &str,
    version: Option<&str>,
) -> anyhow::Result<(AddResult, HashMap<String, String>)> {
    let (platform, arch) = current_platform();

    let summary = client.get_package(name)?;

    
    if let Some(req) = version {
        let known = summary.versions.iter().any(|sv| sv.version == req && !sv.yanked);
        if !known {
            let avail: Vec<&str> = summary.versions.iter().filter(|v| !v.yanked).map(|v| v.version.as_str()).collect();
            let latest = if !summary.latest.is_empty() { summary.latest.as_str() } else { avail.first().copied().unwrap_or("") };
            let hint = if latest.is_empty() { String::new() }
                else { format!(" Use a range like `^{latest}` to install the latest, or pin one of the versions above.") };
            anyhow::bail!(
                "{name}@{req} is not a published version.\n  Available: {}.{}",
                if avail.is_empty() { "none".to_string() } else { avail.join(", ") }, hint
            );
        }
    }

    let resolved_version = match version {
        Some(v) => v.to_string(),
        None => {
            if !summary.latest.is_empty() {
                summary.latest.clone()
            } else {
                summary.versions.iter()
                    .filter(|v| !v.yanked)
                    .next()
                    .map(|v| v.version.clone())
                    .ok_or_else(|| anyhow::anyhow!("no non-yanked version found for '{}'", name))?
            }
        }
    };

    let (min_ekko, max_ekko) = summary.versions.iter()
        .find(|v| v.version == resolved_version)
        .map(|v| (v.min_ekko_version.clone(), v.max_ekko_version.clone()))
        .unwrap_or_default();
    enforce_ekko_range(name, &resolved_version, &min_ekko, &max_ekko)?;

    let signature_author = summary.versions.iter()
        .find(|v| v.version == resolved_version)
        .and_then(|v| if v.signature_author.is_empty() { None } else { Some(v.signature_author.clone()) });

    let tmp = temp_dir();
    let ekl_path = client.download(name, &resolved_version, platform, arch, &tmp)?;

    let ekl_data = std::fs::read(&ekl_path)?;
    let integrity = format!("sha256-{}", sha256_hex(&ekl_data));
    let size = ekl_data.len();

    if let Some(ref sig) = signature_author {
        let pubkey = summary.authors.iter()
            .find(|a| !a.pubkey.is_empty())
            .map(|a| a.pubkey.as_str());
        if let Some(pub_pem) = pubkey {
            if let Some(crypto) = crate::engine::v8_runtime::load_native_crypto_api() {
                if let Some(encoding) = crate::engine::v8_runtime::load_native_encoding_api() {
                    match encoding.encoding_base64Decode(sig) {
                        Ok(sig_bytes) => {
                            match crypto.crypto_ecdsaVerify(pub_pem, &ekl_data, &sig_bytes) {
                                Ok(true) => eprintln!("[verify] Signature valid"),
                                Ok(false) => {
                                    let _ = std::fs::remove_file(&ekl_path);
                                    anyhow::bail!("SIGNATURE VERIFICATION FAILED for {}@{}. The package may have been tampered with.", name, resolved_version);
                                }
                                Err(e) => eprintln!("[verify] Could not verify signature: {}", e),
                            }
                        }
                        Err(e) => eprintln!("[verify] Could not decode signature: {}", e),
                    }
                }
            }
        }
    }

    let store_path = store_root().join(name).join(&resolved_version);
    extract_ekl_to_store(&ekl_path, &store_path)?;

    write_requirements(&store_path, &min_ekko, &max_ekko);

    let _ = std::fs::remove_file(&ekl_path);

    let exports = {
        let manifest_path = store_path.join("manifest.json");
        if let Ok(manifest_str) = std::fs::read_to_string(&manifest_path) {
            if let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&manifest_str) {
                manifest["exports"].as_object()
                    .map(|obj| obj.iter().map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string())).collect())
                    .unwrap_or_default()
            } else { HashMap::new() }
        } else { HashMap::new() }
    };

    Ok((AddResult {
        name: name.to_string(),
        version: resolved_version,
        integrity,
        size,
        store_path,
    }, exports))
}

pub fn install_local(
    ekl_path: &Path,
    category: DepCategory,
    workspace_root: &Path,
) -> anyhow::Result<AddResult> {
    let pkg = ekko_vfs::EklPackage::from_file(ekl_path)?;
    let name = pkg.metadata.name.clone();
    let version = pkg.metadata.version.clone();

    let ekl_data = std::fs::read(ekl_path)?;
    let integrity = format!("sha256-{}", sha256_hex(&ekl_data));
    let size = ekl_data.len();

    let store_path = store_root().join(&name).join(&version);
    extract_ekl_to_store(ekl_path, &store_path)?;

    let source = format!("file:{}", ekl_path.display());
    let exports = pkg.metadata.exports.clone();

    update_ekko_json(workspace_root, &name, &version, category)?;
    update_lockfile_with_source(workspace_root, &name, &version, &integrity, size, category, &exports, &source)?;

    Ok(AddResult {
        name,
        version,
        integrity,
        size,
        store_path,
    })
}

pub struct AddResult {
    pub name: String,
    pub version: String,
    pub integrity: String,
    pub size: usize,
    pub store_path: PathBuf,
}

pub fn install_with_deps(
    client: &RegistryClient,
    name: &str,
    version: Option<&str>,
    category: DepCategory,
    workspace_root: &Path,
) -> anyhow::Result<Vec<AddResult>> {
    let mut installed: Vec<AddResult> = Vec::new();
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    install_recursive(client, name, version, category, workspace_root, &mut installed, &mut seen, 0)?;
    Ok(installed)
}

fn install_recursive(
    client: &RegistryClient,
    name: &str,
    version: Option<&str>,
    category: DepCategory,
    workspace_root: &Path,
    installed: &mut Vec<AddResult>,
    seen: &mut std::collections::HashSet<String>,
    depth: usize,
) -> anyhow::Result<()> {
    if seen.contains(name) {
        return Ok(());
    }
    seen.insert(name.to_string());

    let lock_path = workspace_root.join("ekko.lock");
    if lock_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&lock_path) {
            if let Ok(lock) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(existing) = lock["packages"][name]["version"].as_str() {
                    if version.is_none() || version == Some(existing) {
                        
                        let store_path = store_root().join(name).join(existing);
                        if store_path.join("manifest.json").exists() {
                            gate_cached(client, name, existing, &store_path)?;
                        }
                        let indent = "  ".repeat(depth);
                        eprintln!("{}  {} already installed ({})", indent, name, existing);
                        return Ok(());
                    }
                }
            }
        }
    }

    let result = install_package(client, name, version, category, workspace_root)?;

    let ship_deps: HashMap<String, String> = {
        let manifest_path = result.store_path.join("manifest.json");
        if let Ok(content) = std::fs::read_to_string(&manifest_path) {
            if let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&content) {
                manifest["ship"].as_object()
                    .map(|obj| obj.iter()
                        .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
                        .collect())
                    .unwrap_or_default()
            } else { HashMap::new() }
        } else { HashMap::new() }
    };

    installed.push(result);

    for (dep_name, _dep_version) in &ship_deps {
        install_recursive(client, dep_name, None, DepCategory::Ship, workspace_root, installed, seen, depth + 1)?;
    }

    Ok(())
}

pub fn install_member_deps(
    client: &RegistryClient,
    member: &crate::packages::workspace::Member,
    workspace: Option<&crate::packages::workspace::Workspace>,
) -> anyhow::Result<Vec<AddResult>> {
    let mut installed: Vec<AddResult> = Vec::new();
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    let root = member.root_dir.clone();
    let deps: Vec<(String, DepCategory)> = member.ship.keys().map(|k| (k.clone(), DepCategory::Ship))
        .chain(member.build.keys().map(|k| (k.clone(), DepCategory::Build)))
        .collect();

    for (name, cat) in deps {
        if seen.contains(&name) { continue; }
        let spec = member.ship.get(&name).or_else(|| member.build.get(&name)).cloned().unwrap_or_default();

        if let Some(dep_member) = workspace.and_then(|ws| ws.members.get(&name)) {
            seen.insert(name.clone());
            let (plat, arch) = if dep_member.native.is_empty() { ("any", "any") } else { current_platform() };
            let ekl_bytes = build::pack_member(dep_member, plat, arch)?;
            let dist_dir = dep_member.root_dir.join("dist");
            std::fs::create_dir_all(&dist_dir)?;
            let safe = name.replace('/', "-").replace('@', "");
            let ekl_path = dist_dir.join(format!("{}.{}.{}.ekl", safe, plat, arch));
            std::fs::write(&ekl_path, &ekl_bytes)?;
            let integrity = format!("sha256-{}", sha256_hex(&ekl_bytes));
            let size = ekl_bytes.len();
            let store_path = store_root().join(&name).join(&dep_member.version);
            extract_ekl_to_store(&ekl_path, &store_path)?;
            let source = format!("file:{}", make_relative(&root, &ekl_path).to_string_lossy().replace('\\', "/"));
            update_lockfile_with_source(&root, &name, &dep_member.version, &integrity, size, cat, &dep_member.exports, &source)?;
            installed.push(AddResult { name: name.clone(), version: dep_member.version.clone(), integrity, size, store_path });
            continue;
        }

        let ver = pick_install_version(&root, &name, &spec);
        install_registry_dep(client, &name, ver.as_deref(), cat, &root, &mut installed, &mut seen)?;
    }
    Ok(installed)
}

fn install_registry_dep(
    client: &RegistryClient, name: &str, version: Option<&str>, category: DepCategory,
    root: &Path, installed: &mut Vec<AddResult>, seen: &mut std::collections::HashSet<String>,
) -> anyhow::Result<()> {
    if !seen.insert(name.to_string()) { return Ok(()); }

    

    

    if let Some(locked) = pick_install_version(root, name, "") {
        if version.is_none() || version == Some(locked.as_str()) {
            let store_path = store_root().join(name).join(&locked);
            if store_path.join("manifest.json").exists() {
                
                gate_cached(client, name, &locked, &store_path)?;
                for dep in ship_deps_of(&store_path) {
                    install_registry_dep(client, &dep, None, DepCategory::Ship, root, installed, seen)?;
                }
                return Ok(());
            }
        }
    }

    let (result, exports) = fetch_extract(client, name, version)?;
    update_lockfile(root, &result.name, &result.version, &result.integrity, result.size, category, &exports)?;
    let deps = ship_deps_of(&result.store_path);
    installed.push(result);
    for dep in deps {
        install_registry_dep(client, &dep, None, DepCategory::Ship, root, installed, seen)?;
    }
    Ok(())
}

fn pick_install_version(root: &Path, name: &str, spec: &str) -> Option<String> {
    let lock_path = root.join("ekko.lock");
    if let Ok(c) = std::fs::read_to_string(&lock_path) {
        if let Ok(l) = serde_json::from_str::<serde_json::Value>(&c) {
            if let Some(v) = l["packages"][name]["version"].as_str() {
                if !v.is_empty() { return Some(v.to_string()); }
            }
        }
    }
    let s = spec.trim();
    let exact = !s.is_empty()
        && s.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false)
        && !s.chars().any(|c| matches!(c, '^' | '~' | '*' | 'x' | 'X' | ' ' | '>' | '<' | '=' | '|'));
    if exact { Some(s.to_string()) } else { None }
}

fn make_relative(from_dir: &Path, target: &Path) -> PathBuf {
    let from = from_dir.canonicalize().unwrap_or_else(|_| from_dir.to_path_buf());
    let to = target.canonicalize().unwrap_or_else(|_| target.to_path_buf());
    let fc: Vec<_> = from.components().collect();
    let tc: Vec<_> = to.components().collect();
    let mut i = 0;
    while i < fc.len() && i < tc.len() && fc[i] == tc[i] { i += 1; }
    let mut out = PathBuf::new();
    for _ in i..fc.len() { out.push(".."); }
    for c in &tc[i..] { out.push(c.as_os_str()); }
    if out.as_os_str().is_empty() { out.push("."); }
    out
}

pub fn ship_deps_of(store_path: &Path) -> Vec<String> {
    let manifest_path = store_path.join("manifest.json");
    if let Ok(content) = std::fs::read_to_string(&manifest_path) {
        if let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(obj) = manifest["ship"].as_object() {
                return obj.keys().cloned().collect();
            }
        }
    }
    Vec::new()
}

pub fn ship_deps_versioned(store_path: &Path) -> Vec<(String, Option<String>)> {
    let manifest_path = store_path.join("manifest.json");
    if let Ok(content) = std::fs::read_to_string(&manifest_path) {
        if let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(obj) = manifest["ship"].as_object() {
                return obj.iter()

                    
                    .map(|(k, v)| (k.clone(), v.as_str()
                        .filter(|s| !s.is_empty() && s.as_bytes()[0].is_ascii_digit())
                        .map(str::to_string)))
                    .collect();
            }
        }
    }
    Vec::new()
}

pub fn cached_exact(name: &str, version: &str) -> Option<PathBuf> {
    if version.is_empty() || !version.as_bytes()[0].is_ascii_digit() { return None; }
    let p = store_root().join(name).join(version);
    if p.join("manifest.json").exists() { Some(p) } else { None }
}

pub fn latest_installed(name: &str) -> Option<String> { latest_installed_in(&store_root(), name) }

fn latest_installed_in(store: &Path, name: &str) -> Option<String> {
    let dir = store.join(name);
    let mut best: Option<String> = None;
    if let Ok(rd) = std::fs::read_dir(&dir) {
        for e in rd.flatten() {
            if !e.path().join("manifest.json").exists() { continue; }
            let v = e.file_name().to_string_lossy().to_string();
            if v.is_empty() || !v.as_bytes()[0].is_ascii_digit() { continue; }
            best = match best {
                Some(b) if version_gte(&b, &v) => Some(b),
                _ => Some(v),
            };
        }
    }
    best
}

fn store_manifest_lock_fields(store_path: &Path) -> (String, HashMap<String, String>) {
    let mut integrity = String::new();
    let mut exports = HashMap::new();
    if let Ok(s) = std::fs::read_to_string(store_path.join("manifest.json")) {
        if let Ok(m) = serde_json::from_str::<serde_json::Value>(&s) {
            integrity = m["integrity"].as_str().unwrap_or("").to_string();
            if let Some(obj) = m["exports"].as_object() {
                exports = obj.iter().map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string())).collect();
            }
        }
    }
    (integrity, exports)
}

pub fn reconcile_lock_from_store(project_dir: &Path) -> usize {
    reconcile_lock_from_store_in(project_dir, &store_root())
}

fn reconcile_lock_from_store_in(project_dir: &Path, store: &Path) -> usize {
    let Ok(content) = std::fs::read_to_string(project_dir.join("ekko.json")) else { return 0; };
    let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&content) else { return 0; };

    let mut declared: Vec<(String, DepCategory)> = Vec::new();
    if let Some(obj) = manifest["ship"].as_object() {
        for k in obj.keys() { declared.push((k.clone(), DepCategory::Ship)); }
    }
    if let Some(obj) = manifest["build"].as_object() {
        for k in obj.keys() { declared.push((k.clone(), DepCategory::Build)); }
    }
    if declared.is_empty() { return 0; }

    let lock: serde_json::Value = std::fs::read_to_string(project_dir.join("ekko.lock")).ok()
        .and_then(|c| serde_json::from_str(&c).ok())
        .unwrap_or_else(|| serde_json::json!({}));

    let mut written = 0usize;
    for (name, category) in declared {
        let spec = manifest[match category { DepCategory::Ship => "ship", DepCategory::Build => "build" }][name.as_str()]
            .as_str().unwrap_or("").to_string();

        if let Some(lv) = lock["packages"][name.as_str()]["version"].as_str() {
            if !lv.is_empty() && store.join(&name).join(lv).join("manifest.json").exists() {
                continue;
            }
        }

        let store_ver = if !spec.is_empty() && spec.as_bytes()[0].is_ascii_digit() {
            if store.join(&name).join(&spec).join("manifest.json").exists() { Some(spec.clone()) } else { None }
        } else {
            latest_installed_in(store, &name)
        };
        let Some(ver) = store_ver else { continue; }; 

        let store_path = store.join(&name).join(&ver);
        let (integrity, exports) = store_manifest_lock_fields(&store_path);
        if update_lockfile_with_source(project_dir, &name, &ver, &integrity, 0, category, &exports, "store:local").is_ok() {
            written += 1;
        }
    }
    written
}

pub fn remove_from_store(name: &str) -> anyhow::Result<Vec<String>> {
    let parent = store_root().join(name);
    let mut removed = Vec::new();
    if parent.exists() {
        for entry in std::fs::read_dir(&parent)? {
            let entry = entry?;
            if entry.path().is_dir() {
                removed.push(entry.file_name().to_string_lossy().to_string());
            }
        }
        std::fs::remove_dir_all(&parent)?;
        if let Some(scope) = parent.parent() {
            if scope != store_root() && scope.exists()
                && scope.read_dir().map(|mut d| d.next().is_none()).unwrap_or(false) {
                let _ = std::fs::remove_dir(scope);
            }
        }
    }
    Ok(removed)
}

pub fn remove_package(name: &str, workspace_root: &Path) -> anyhow::Result<()> {
    remove_from_ekko_json(workspace_root, name)?;
    let removed_version = remove_from_lockfile(workspace_root, name)?;

    if let Some(ver) = removed_version {
        let store_path = store_root().join(name).join(&ver);
        if store_path.exists() {
            std::fs::remove_dir_all(&store_path)?;
            let parent = store_root().join(name);
            if parent.exists() && parent.read_dir()?.next().is_none() {
                let _ = std::fs::remove_dir(&parent);
            }
        }
    }
    Ok(())
}

pub fn update_packages(
    client: &RegistryClient,
    pkg_name: Option<&str>,
    workspace_root: &Path,
) -> anyhow::Result<Vec<UpdateResult>> {
    let lock_path = workspace_root.join("ekko.lock");
    let lock_content = std::fs::read_to_string(&lock_path)
        .unwrap_or_else(|_| r#"{"version":2,"packages":{}}"#.to_string());
    let lock: serde_json::Value = serde_json::from_str(&lock_content)?;
    let packages = lock["packages"].as_object()
        .cloned().unwrap_or_default();

    let mut results = Vec::new();
    let (platform, arch) = current_platform();

    for (name, pkg) in &packages {
        if let Some(filter) = pkg_name {
            if name != filter { continue; }
        }
        let current = pkg["version"].as_str().unwrap_or("0.0.0");
        let category = match pkg["category"].as_str() {
            Some("build") => DepCategory::Build,
            _ => DepCategory::Ship,
        };

        match client.get_package(name) {
            Ok(summary) => {
                let latest = summary.versions.iter()
                    .filter(|v| !v.yanked)
                    .last()
                    .map(|v| v.version.clone());

                if let Some(ref latest_ver) = latest {
                    if latest_ver != current {
                        match client.download(name, latest_ver, platform, arch, &temp_dir()) {
                            Ok(ekl_path) => {
                                let data = std::fs::read(&ekl_path)?;
                                let integrity = format!("sha256-{}", sha256_hex(&data));
                                let size = data.len();
                                let store_path = store_root().join(name).join(latest_ver);
                                extract_ekl_to_store(&ekl_path, &store_path)?;
                                let _ = std::fs::remove_file(&ekl_path);

                                let detail = client.get_version(name, latest_ver).ok();
                                let exports = detail.map(|d| d.exports).unwrap_or_default();
                                update_ekko_json(workspace_root, name, latest_ver, category)?;
                                update_lockfile(workspace_root, name, latest_ver, &integrity, size, category, &exports)?;

                                results.push(UpdateResult {
                                    name: name.clone(),
                                    from: current.to_string(),
                                    to: latest_ver.clone(),
                                    updated: true,
                                });
                            }
                            Err(e) => {
                                eprintln!("  warning: failed to download {}: {}", name, e);
                                results.push(UpdateResult {
                                    name: name.clone(),
                                    from: current.to_string(),
                                    to: latest.unwrap_or_default(),
                                    updated: false,
                                });
                            }
                        }
                    } else {
                        results.push(UpdateResult {
                            name: name.clone(),
                            from: current.to_string(),
                            to: current.to_string(),
                            updated: false,
                        });
                    }
                }
            }
            Err(_) => {}
        }
    }
    Ok(results)
}

pub struct UpdateResult {
    pub name: String,
    pub from: String,
    pub to: String,
    pub updated: bool,
}

pub fn vendor_dependencies(workspace_root: &Path) -> anyhow::Result<Vec<String>> {
    let lock_path = workspace_root.join("ekko.lock");
    let lock_content = std::fs::read_to_string(&lock_path)?;
    let mut lock: serde_json::Value = serde_json::from_str(&lock_content)?;
    let packages = lock["packages"].as_object()
        .cloned().unwrap_or_default();

    let vendor_dir = workspace_root.join("vendor");
    let mut vendored = Vec::new();

    for (name, pkg) in &packages {
        let version = pkg["version"].as_str().unwrap_or("0.0.0");
        let store_path = store_root().join(name).join(version);
        let vendor_path = vendor_dir.join(name).join(version);

        if store_path.exists() {
            std::fs::create_dir_all(&vendor_path)?;
            copy_dir_recursive(&store_path, &vendor_path)?;
            vendored.push(format!("{name}@{version}"));
        }
    }

    let pkgs = lock["packages"].as_object_mut().unwrap();
    for (name, pkg) in pkgs.iter_mut() {
        let version = pkg["version"].as_str().unwrap_or("0.0.0");
        pkg["source"] = serde_json::json!(format!("vendor:./{name}/{version}/"));
    }
    std::fs::write(&lock_path, serde_json::to_string_pretty(&lock)?)?;

    Ok(vendored)
}

pub fn audit_packages(
    client: &RegistryClient,
    workspace_root: &Path,
) -> anyhow::Result<AuditReport> {
    let lock_path = workspace_root.join("ekko.lock");
    let lock_content = std::fs::read_to_string(&lock_path)?;
    let mut lock: serde_json::Value = serde_json::from_str(&lock_content)?;
    let packages = lock["packages"].as_object()
        .cloned().unwrap_or_default();

    let mut entries = Vec::new();
    let mut issues = 0;

    for (name, pkg) in &packages {
        let version = pkg["version"].as_str().unwrap_or("0.0.0").to_string();
        let stored_integrity = pkg["integrity"].as_str().unwrap_or("").to_string();

        let store_path = store_root().join(name).join(&version);
        let integrity_ok = store_path.exists();

        let mut latest = version.clone();
        let mut security = "ok".to_string();

        if let Ok(summary) = client.get_package(name) {
            if let Some(last) = summary.versions.iter().filter(|v| !v.yanked).last() {
                latest = last.version.clone();
            }
        }

        if !integrity_ok {
            security = "missing".to_string();
            issues += 1;
        }

        entries.push(AuditEntry {
            name: name.clone(),
            installed: version,
            latest,
            security,
        });
    }

    if lock["packages"].is_object() {
        let pkgs = lock["packages"].as_object_mut().unwrap();
        for entry in &entries {
            if let Some(pkg) = pkgs.get_mut(&entry.name) {
                pkg["latest_available"] = serde_json::json!(entry.latest);
                pkg["security"] = serde_json::json!(entry.security);
            }
        }
        std::fs::write(&lock_path, serde_json::to_string_pretty(&lock)?)?;
    }

    Ok(AuditReport { entries, issues })
}

pub struct AuditReport {
    pub entries: Vec<AuditEntry>,
    pub issues: usize,
}

pub struct AuditEntry {
    pub name: String,
    pub installed: String,
    pub latest: String,
    pub security: String,
}

pub fn publish_package(
    client: &RegistryClient,
    member_name: Option<&str>,
    dry_run: bool,
    workspace_root: &Path,
    allow_private_on_public: bool,
) -> anyhow::Result<PublishResult> {
    let ws = crate::packages::workspace::get_workspace()
        .ok_or_else(|| anyhow::anyhow!("no workspace found"))?;

    let member = if let Some(name) = member_name {
        ws.members.get(name)
            .ok_or_else(|| anyhow::anyhow!("member '{}' not found", name))?
    } else {
        let cwd = std::env::current_dir()?;
        let cwd_str = cwd.to_string_lossy().replace("\\\\?\\", "").replace('\\', "/");
        ws.members.values()
            .find(|m| {
                let root = m.root_dir.to_string_lossy().replace("\\\\?\\", "").replace('\\', "/");
                cwd_str.starts_with(&root) || cwd_str == root
            })
            .ok_or_else(|| anyhow::anyhow!("not inside a workspace member"))?
    };

    match member.kind {
        crate::packages::workspace::MemberKind::Test => return Err(anyhow::anyhow!("test members cannot be published")),
        _ => {}
    }

    crate::packages::workspace::validate_publish_storage(&member.publish, &member.storage)?;

    let mut platform_keys: std::collections::HashSet<String> = std::collections::HashSet::new();
    for (_name, platforms_map) in &member.native {
        for key in platforms_map.keys() {
            platform_keys.insert(key.clone());
        }
    }
    let platforms: Vec<(String, String, String)> = if platform_keys.is_empty() {
        vec![("any".to_string(), "any".to_string(), "any-any".to_string())]
    } else {
        platform_keys.iter().map(|key| {
            let parts: Vec<&str> = key.splitn(2, '-').collect();
            let os = parts.get(0).unwrap_or(&"any").to_string();
            let arch = parts.get(1).unwrap_or(&"any").to_string();
            (os, arch, key.clone())
        }).collect()
    };

    if dry_run {
        let (platform, arch) = current_platform();
        let ekl_bytes = build::pack_member(member, platform, arch)?;
        return Ok(PublishResult {
            name: member.name.clone(),
            version: member.version.clone(),
            platform: platform.to_string(),
            arch: arch.to_string(),
            size: ekl_bytes.len(),
            integrity: format!("sha256-{}", sha256_hex(&ekl_bytes)),
            published: false,
            skipped: Vec::new(),
        });
    }

    let tmp = temp_dir();
    std::fs::create_dir_all(&tmp)?;
    let mut last_size = 0;
    let mut last_platform = String::new();
    let mut last_arch = String::new();
    let mut skipped: Vec<String> = Vec::new();

    for (platform, arch, key) in &platforms {
        let ekl_bytes = if key == "any-any" {
            build::pack_member(member, platform, arch)?
        } else {
            build::pack_member_for(member, platform, arch, key)?
        };

        let safe_name = member.name.replace('/', "-").replace('@', "");
        let ekl_path = tmp.join(format!("{}.{}.{}.ekl", safe_name, platform, arch));
        std::fs::write(&ekl_path, &ekl_bytes)?;

        let signature = sign_ekl(&ekl_bytes);
        let files_json = if let Ok(pkg) = ekko_vfs::EklPackage::from_bytes(ekl_bytes.clone()) {
            let files: Vec<serde_json::Value> = pkg.entries().iter().map(|e| {
                serde_json::json!({ "path": e.path, "size": e.size })
            }).collect();
            Some(serde_json::to_string(&files).unwrap_or_default())
        } else { None };
        
        match client.publish(&member.name, &member.version, platform, arch, &ekl_path, signature.as_deref(), member.min_ekko.as_deref(), member.max_ekko.as_deref(), &member.publish, &member.storage, allow_private_on_public) {
            Ok(_) => {}
            Err(e) => {
                let _ = std::fs::remove_file(&ekl_path);

                let msg = e.to_string();
                if msg.contains("HTTP 402") && msg.contains("skipBuild") {
                    eprintln!("  Skipped {} {}: {}", platform, arch, clean_publish_error(&msg));
                    skipped.push(format!("{}-{}", platform, arch));
                    continue;
                }
                return Err(e);
            }
        }
        last_size = ekl_bytes.len();
        last_platform = platform.clone();
        last_arch = arch.clone();
        
        if let Err(e) = client.publish_platform_meta(&member.name, &member.version, platform, arch, &member.ship, files_json.as_deref()) {
            let _ = std::fs::remove_file(&ekl_path);
            return Err(anyhow::anyhow!("failed to send platform metadata for {}/{}: {}", platform, arch, e));
        }
        let _ = std::fs::remove_file(&ekl_path);
        eprintln!("  Published {}.{}.{}.ekl ({} bytes)", safe_name, platform, arch, ekl_bytes.len());
    }

    let readme_content = member.readme.as_ref()
        .map(|p| member.root_dir.join(p))
        .filter(|p| p.exists())
        .and_then(|p| std::fs::read_to_string(p).ok())
        .unwrap_or_default();
    let description = member.description.clone().unwrap_or_default();
    let repository = member.repository.clone().unwrap_or_default();
    let license = member.license.clone().unwrap_or_else(|| "MIT".to_string());

    let release_notes = ["release-note.md", "release-notes.md", "RELEASE-NOTES.md", "RELEASE_NOTES.md", "CHANGELOG.md"]
        .iter()
        .map(|f| member.root_dir.join(f))
        .find(|p| p.exists())
        .and_then(|p| std::fs::read_to_string(p).ok())
        .unwrap_or_default();
    if !readme_content.is_empty() || !description.is_empty() || !repository.is_empty() || !release_notes.is_empty() {
        if let Err(e) = client.publish_meta(&member.name, &member.version, &readme_content, &description, &repository, &license, &release_notes) {
            eprintln!("  warning: failed to send package metadata: {}", e);
        }
    }

    let published_any = !last_platform.is_empty();
    Ok(PublishResult {
        name: member.name.clone(),
        version: member.version.clone(),
        platform: last_platform,
        arch: last_arch,
        size: last_size,
        integrity: String::new(),
        published: published_any,
        skipped,
    })
}

pub struct PublishResult {
    pub name: String,
    pub version: String,
    pub platform: String,
    pub arch: String,
    pub size: usize,
    pub integrity: String,
    pub published: bool,
    
    pub skipped: Vec<String>,
}

fn clean_publish_error(msg: &str) -> String {
    if let Some(idx) = msg.find('{') {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&msg[idx..]) {
            if let Some(e) = v.get("error").and_then(|e| e.as_str()) {
                return e.to_string();
            }
        }
    }
    msg.to_string()
}

fn sign_ekl(ekl_bytes: &[u8]) -> Option<String> {
    let home = if cfg!(target_os = "windows") {
        std::env::var("USERPROFILE").unwrap_or_default()
    } else {
        std::env::var("HOME").unwrap_or_default()
    };
    
    let key_path = match crate::packages::registry::load_user_config().ok().and_then(|c| c.effective_cert()) {
        Some(p) => std::path::PathBuf::from(p),
        None => std::path::PathBuf::from(&home).join(".ekko").join("signing-key.pem"),
    };
    if !key_path.exists() { return None; }

    let pem = std::fs::read_to_string(&key_path).ok()?;
    eprintln!("[sign] Signing key found at {:?}", key_path);
    let crypto = match crate::engine::v8_runtime::load_native_crypto_api() {
        Some(c) => c,
        None => { eprintln!("[sign] Failed to load EkkoNative — cannot sign"); return None; }
    };
    let encoding = match crate::engine::v8_runtime::load_native_encoding_api() {
        Some(e) => e,
        None => { eprintln!("[sign] Failed to load encoding API"); return None; }
    };
    match crypto.crypto_ecdsaSign(&pem, ekl_bytes) {
        Ok(sig) => {
            match encoding.encoding_base64Encode(&sig) {
                Ok(b64) => {
                    eprintln!("[sign] OK — {} sig bytes", sig.len());
                    Some(b64)
                }
                Err(e) => { eprintln!("[sign] base64 encode failed: {}", e); None }
            }
        }
        Err(e) => {
            eprintln!("[sign] FAILED: {}", e);
            None
        }
    }
}

const B64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

pub fn base64_encode(data: &[u8]) -> String {
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        out.push(B64[((triple >> 18) & 0x3F) as usize] as char);
        out.push(B64[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 { out.push(B64[((triple >> 6) & 0x3F) as usize] as char); } else { out.push('='); }
        if chunk.len() > 2 { out.push(B64[(triple & 0x3F) as usize] as char); } else { out.push('='); }
    }
    out
}

pub fn enforce_ekko_range(name: &str, version: &str, min_ekko: &str, max_ekko: &str) -> anyhow::Result<()> {
    if !min_ekko.is_empty() && !version_gte(crate::VERSION, min_ekko) {
        anyhow::bail!(
            "package '{}@{}' requires EkkoJS >= {} (you have {}). Upgrade the runtime to install it.",
            name, version, min_ekko, crate::VERSION
        );
    }
    if !max_ekko.is_empty() && !version_gte(max_ekko, crate::VERSION) {
        anyhow::bail!(
            "package '{}@{}' requires EkkoJS <= {} (you have {}). Install an older runtime, or a release of '{}' that supports {}.",
            name, version, max_ekko, crate::VERSION, name, crate::VERSION
        );
    }
    Ok(())
}

fn requirements_path(store_path: &Path) -> PathBuf { store_path.join(".ekko-req.json") }

fn write_requirements(store_path: &Path, min_ekko: &str, max_ekko: &str) {
    let body = serde_json::json!({ "minEkko": min_ekko, "maxEkko": max_ekko });
    if let Ok(s) = serde_json::to_string(&body) {
        let _ = std::fs::write(requirements_path(store_path), s);
    }
}

fn read_requirements(store_path: &Path) -> Option<(String, String)> {
    let s = std::fs::read_to_string(requirements_path(store_path)).ok()?;
    let v: serde_json::Value = serde_json::from_str(&s).ok()?;
    Some((
        v.get("minEkko").and_then(|x| x.as_str()).unwrap_or("").to_string(),
        v.get("maxEkko").and_then(|x| x.as_str()).unwrap_or("").to_string(),
    ))
}

pub fn gate_cached(client: &RegistryClient, name: &str, version: &str, store_path: &Path) -> anyhow::Result<()> {
    if let Some((min_ekko, max_ekko)) = read_requirements(store_path) {
        return enforce_ekko_range(name, version, &min_ekko, &max_ekko);
    }
    
    let (min_ekko, max_ekko) = match client.get_package(name) {
        Ok(summary) => summary.versions.iter()
            .find(|v| v.version == version)
            .map(|v| (v.min_ekko_version.clone(), v.max_ekko_version.clone()))
            .unwrap_or_default(),
        Err(_) => (String::new(), String::new()), 
    };
    write_requirements(store_path, &min_ekko, &max_ekko);
    enforce_ekko_range(name, version, &min_ekko, &max_ekko)
}

fn version_gte(have: &str, need: &str) -> bool {
    fn parse(v: &str) -> (u64, u64, u64) {
        let core = v.split(['-', '+']).next().unwrap_or(v);
        let mut it = core.split('.').map(|p| p.trim().parse::<u64>().unwrap_or(0));
        (it.next().unwrap_or(0), it.next().unwrap_or(0), it.next().unwrap_or(0))
    }
    parse(have) >= parse(need)
}

fn sha256_hex(data: &[u8]) -> String {
    use sha2::{Sha256, Digest};
    use std::fmt::Write;
    let hash = Sha256::digest(data);
    let mut s = String::with_capacity(64);
    for byte in hash.iter() {
        let _ = write!(s, "{:02x}", byte);
    }
    s
}

pub fn extract_to_store(ekl_path: &Path, dest: &Path) -> anyhow::Result<()> {
    extract_ekl_to_store(ekl_path, dest)
}

pub fn sha256_of(data: &[u8]) -> String {
    sha256_hex(data)
}

pub fn install_lockfile_entry(
    root: &Path, name: &str, version: &str, integrity: &str,
    size: usize, category: DepCategory, exports: &HashMap<String, String>,
) -> anyhow::Result<()> {
    update_ekko_json(root, name, version, category)?;
    update_lockfile(root, name, version, integrity, size, category, exports)
}

fn extract_ekl_to_store(ekl_path: &Path, dest: &Path) -> anyhow::Result<()> {
    let pkg = ekko_vfs::EklPackage::from_file(ekl_path)?;

    
    
    let _ = std::fs::remove_dir_all(dest);
    std::fs::create_dir_all(dest)?;

    let manifest = serde_json::json!({
        "name": pkg.metadata.name,
        "version": pkg.metadata.version,
        "exports": pkg.metadata.exports,
        "bin": pkg.metadata.bin,
        "entry": pkg.metadata.entry,
        "project_type": pkg.metadata.project_type,
        "native": pkg.metadata.native,
        "integrity": pkg.metadata.integrity,
        "ship": pkg.metadata.ship,
    });
    std::fs::write(dest.join("manifest.json"), serde_json::to_string_pretty(&manifest)?)?;

    for entry in pkg.entries() {
        if let Some(content) = pkg.read(&entry.path) {
            let file_path = dest.join(&entry.path);
            if let Some(parent) = file_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::write(&file_path, &content)?;
        }
    }

    Ok(())
}

fn update_ekko_json(root: &Path, name: &str, version: &str, category: DepCategory) -> anyhow::Result<()> {
    let config_path = root.join("ekko.json");
    let content = std::fs::read_to_string(&config_path)
        .unwrap_or_else(|_| "{}".to_string());
    let mut doc: serde_json::Value = serde_json::from_str(&content)?;

    let field = match category {
        DepCategory::Ship => "ship",
        DepCategory::Build => "build",
    };

    if doc[field].is_null() {
        doc[field] = serde_json::json!({});
    }
    doc[field][name] = serde_json::json!(version);

    std::fs::write(&config_path, serde_json::to_string_pretty(&doc)?)?;
    Ok(())
}

fn remove_from_ekko_json(root: &Path, name: &str) -> anyhow::Result<()> {
    let config_path = root.join("ekko.json");
    let content = std::fs::read_to_string(&config_path)?;
    let mut doc: serde_json::Value = serde_json::from_str(&content)?;

    for field in ["ship", "build"] {
        if let Some(obj) = doc[field].as_object_mut() {
            obj.remove(name);
        }
    }

    std::fs::write(&config_path, serde_json::to_string_pretty(&doc)?)?;
    Ok(())
}

fn update_lockfile(
    root: &Path, name: &str, version: &str, integrity: &str,
    size: usize, category: DepCategory, exports: &HashMap<String, String>,
) -> anyhow::Result<()> {
    update_lockfile_with_source(root, name, version, integrity, size, category, exports, "registry:pkg.ekko.dev")
}

fn update_lockfile_with_source(
    root: &Path, name: &str, version: &str, integrity: &str,
    size: usize, category: DepCategory, exports: &HashMap<String, String>, source: &str,
) -> anyhow::Result<()> {
    let lock_path = root.join("ekko.lock");
    let content = std::fs::read_to_string(&lock_path)
        .unwrap_or_else(|_| r#"{"version":2,"packages":{}}"#.to_string());
    let mut lock: serde_json::Value = serde_json::from_str(&content)?;

    if lock["packages"].is_null() {
        lock["packages"] = serde_json::json!({});
    }

    let cat_str = match category { DepCategory::Ship => "ship", DepCategory::Build => "build" };
    lock["packages"][name] = serde_json::json!({
        "version": version,
        "source": source,
        "integrity": integrity,
        "size": size,
        "category": cat_str,
        "exports": exports,
    });

    std::fs::write(&lock_path, serde_json::to_string_pretty(&lock)?)?;
    Ok(())
}

fn remove_from_lockfile(root: &Path, name: &str) -> anyhow::Result<Option<String>> {
    let lock_path = root.join("ekko.lock");
    let content = std::fs::read_to_string(&lock_path)
        .unwrap_or_else(|_| r#"{"version":2,"packages":{}}"#.to_string());
    let mut lock: serde_json::Value = serde_json::from_str(&content)?;

    let version = lock["packages"][name]["version"].as_str().map(|s| s.to_string());
    if let Some(obj) = lock["packages"].as_object_mut() {
        obj.remove(name);
    }

    std::fs::write(&lock_path, serde_json::to_string_pretty(&lock)?)?;
    Ok(version)
}

fn copy_dir_recursive(src: &Path, dest: &Path) -> anyhow::Result<()> {
    std::fs::create_dir_all(dest)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dest_path = dest.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dest_path)?;
        } else {
            std::fs::copy(&src_path, &dest_path)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_gte_compare() {
        assert!(version_gte("1.0.0", "1.0.0"));
        assert!(version_gte("1.2.0", "1.0.0"));
        assert!(version_gte("2.0.0", "1.9.9"));
        assert!(version_gte("0.1.0", "0.1.0"));
        assert!(version_gte("1.0.1", "1.0.0"));
        assert!(!version_gte("0.1.0", "0.2.0"));
        assert!(!version_gte("1.0.0", "2.0.0"));
        assert!(!version_gte("1.0.0", "1.0.1"));
        
        assert!(version_gte("1.0.0-beta", "1.0.0"));
        assert!(version_gte("0.5.0", "0.5"));
    }

    #[test]
    fn sha256_empty() {
        let hash = sha256_hex(b"");
        assert_eq!(hash, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    }

    #[test]
    fn sha256_hello() {
        let hash = sha256_hex(b"hello");
        assert_eq!(hash, "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    }

    #[test]
    fn sha256_longer() {
        let hash = sha256_hex(b"The quick brown fox jumps over the lazy dog");
        assert_eq!(hash, "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592");
    }

    #[test]
    fn store_root_has_ekko() {
        let root = store_root();
        assert!(root.to_string_lossy().contains(".ekko"));
        assert!(root.to_string_lossy().contains("store"));
    }

    #[test]
    fn update_lockfile_creates_file() {
        let tmp = std::env::temp_dir().join("ekko-test-lockfile");
        std::fs::create_dir_all(&tmp).unwrap();
        let exports = HashMap::from([(".".into(), "src/index.js".into())]);
        update_lockfile(&tmp, "test-pkg", "1.0.0", "sha256-abc", 1024, DepCategory::Ship, &exports).unwrap();

        let content = std::fs::read_to_string(tmp.join("ekko.lock")).unwrap();
        let lock: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(lock["packages"]["test-pkg"]["version"], "1.0.0");
        assert_eq!(lock["packages"]["test-pkg"]["category"], "ship");

        let _ = std::fs::remove_dir_all(&tmp);
    }

    
    fn mk_store_pkg(store: &Path, name: &str, version: &str, exports_json: &str) {
        let p = store.join(name).join(version);
        std::fs::create_dir_all(&p).unwrap();
        std::fs::write(
            p.join("manifest.json"),
            format!(r#"{{"name":"{name}","version":"{version}","integrity":"sha256-x","exports":{exports_json}}}"#),
        ).unwrap();
    }

    #[test]
    fn latest_installed_picks_highest_version() {
        let store = std::env::temp_dir().join("ekko-test-latest-installed");
        let _ = std::fs::remove_dir_all(&store);
        mk_store_pkg(&store, "@ekko/react", "18.2.0", "{}");
        mk_store_pkg(&store, "@ekko/react", "19.0.0", "{}");
        mk_store_pkg(&store, "@ekko/react", "1.0.0", "{}");
        assert_eq!(latest_installed_in(&store, "@ekko/react"), Some("19.0.0".to_string()));
        assert_eq!(latest_installed_in(&store, "@ekko/absent"), None);
        let _ = std::fs::remove_dir_all(&store);
    }

    #[test]
    fn reconcile_range_spec_uses_latest_in_store() {
        let store = std::env::temp_dir().join("ekko-test-reco-range-store");
        let proj = std::env::temp_dir().join("ekko-test-reco-range-proj");
        let _ = std::fs::remove_dir_all(&store); let _ = std::fs::remove_dir_all(&proj);
        std::fs::create_dir_all(&proj).unwrap();
        mk_store_pkg(&store, "@ekko/react", "18.0.0", r#"{".":"./old.js"}"#);
        mk_store_pkg(&store, "@ekko/react", "19.0.0", r#"{".":"./src/react.js"}"#);
        std::fs::write(proj.join("ekko.json"), r#"{"name":"app","ship":{"@ekko/react":"^19.0.0"}}"#).unwrap();

        assert_eq!(reconcile_lock_from_store_in(&proj, &store), 1);
        let lock: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(proj.join("ekko.lock")).unwrap()).unwrap();
        
        assert_eq!(lock["packages"]["@ekko/react"]["version"], "19.0.0");
        assert_eq!(lock["packages"]["@ekko/react"]["exports"]["."], "./src/react.js");
        let _ = std::fs::remove_dir_all(&store); let _ = std::fs::remove_dir_all(&proj);
    }

    #[test]
    fn reconcile_exact_present_locks_missing_untouched() {
        let store = std::env::temp_dir().join("ekko-test-reco-exact-store");
        let proj = std::env::temp_dir().join("ekko-test-reco-exact-proj");
        let _ = std::fs::remove_dir_all(&store); let _ = std::fs::remove_dir_all(&proj);
        std::fs::create_dir_all(&proj).unwrap();
        mk_store_pkg(&store, "@ekko/react", "19.0.0", "{}");
        
        std::fs::write(proj.join("ekko.json"),
            r#"{"name":"app","ship":{"@ekko/react":"19.0.0","@ekko/absent":"0.1.0"}}"#).unwrap();

        assert_eq!(reconcile_lock_from_store_in(&proj, &store), 1);
        let lock: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(proj.join("ekko.lock")).unwrap()).unwrap();
        assert_eq!(lock["packages"]["@ekko/react"]["version"], "19.0.0");
        assert!(lock["packages"]["@ekko/absent"].is_null()); 
        let _ = std::fs::remove_dir_all(&store); let _ = std::fs::remove_dir_all(&proj);
    }

    #[test]
    fn reconcile_exact_version_not_in_store_is_untouched() {
        let store = std::env::temp_dir().join("ekko-test-reco-exactmiss-store");
        let proj = std::env::temp_dir().join("ekko-test-reco-exactmiss-proj");
        let _ = std::fs::remove_dir_all(&store); let _ = std::fs::remove_dir_all(&proj);
        std::fs::create_dir_all(&proj).unwrap();
        mk_store_pkg(&store, "@ekko/react", "19.0.0", "{}"); 
        
        std::fs::write(proj.join("ekko.json"), r#"{"name":"app","ship":{"@ekko/react":"0.1.0"}}"#).unwrap();

        assert_eq!(reconcile_lock_from_store_in(&proj, &store), 0);
        assert!(!proj.join("ekko.lock").exists());
        let _ = std::fs::remove_dir_all(&store); let _ = std::fs::remove_dir_all(&proj);
    }

    #[test]
    fn reconcile_noop_when_already_locked() {
        let store = std::env::temp_dir().join("ekko-test-reco-noop-store");
        let proj = std::env::temp_dir().join("ekko-test-reco-noop-proj");
        let _ = std::fs::remove_dir_all(&store); let _ = std::fs::remove_dir_all(&proj);
        std::fs::create_dir_all(&proj).unwrap();
        mk_store_pkg(&store, "@ekko/react", "19.0.0", "{}");
        std::fs::write(proj.join("ekko.json"), r#"{"name":"app","ship":{"@ekko/react":"^19.0.0"}}"#).unwrap();
        
        std::fs::write(proj.join("ekko.lock"),
            r#"{"packages":{"@ekko/react":{"version":"19.0.0","category":"ship"}}}"#).unwrap();

        assert_eq!(reconcile_lock_from_store_in(&proj, &store), 0);
        let _ = std::fs::remove_dir_all(&store); let _ = std::fs::remove_dir_all(&proj);
    }

    #[test]
    fn update_ekko_json_ship() {
        let tmp = std::env::temp_dir().join("ekko-test-config");
        std::fs::create_dir_all(&tmp).unwrap();
        std::fs::write(tmp.join("ekko.json"), r#"{"name":"test"}"#).unwrap();

        update_ekko_json(&tmp, "my-lib", "1.0.0", DepCategory::Ship).unwrap();
        let content = std::fs::read_to_string(tmp.join("ekko.json")).unwrap();
        let doc: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(doc["ship"]["my-lib"], "1.0.0");

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn update_ekko_json_build() {
        let tmp = std::env::temp_dir().join("ekko-test-config-build");
        std::fs::create_dir_all(&tmp).unwrap();
        std::fs::write(tmp.join("ekko.json"), r#"{"name":"test"}"#).unwrap();

        update_ekko_json(&tmp, "test-tools", "2.0.0", DepCategory::Build).unwrap();
        let content = std::fs::read_to_string(tmp.join("ekko.json")).unwrap();
        let doc: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(doc["build"]["test-tools"], "2.0.0");

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn remove_from_lockfile_returns_version() {
        let tmp = std::env::temp_dir().join("ekko-test-remove-lock");
        std::fs::create_dir_all(&tmp).unwrap();
        std::fs::write(tmp.join("ekko.lock"), r#"{"version":2,"packages":{"foo":{"version":"1.0.0","integrity":"sha256-abc","source":"registry","category":"ship"}}}"#).unwrap();

        let ver = remove_from_lockfile(&tmp, "foo").unwrap();
        assert_eq!(ver, Some("1.0.0".to_string()));

        let content = std::fs::read_to_string(tmp.join("ekko.lock")).unwrap();
        let lock: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert!(lock["packages"]["foo"].is_null());

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn remove_from_ekko_json_both_fields() {
        let tmp = std::env::temp_dir().join("ekko-test-remove-config");
        std::fs::create_dir_all(&tmp).unwrap();
        std::fs::write(tmp.join("ekko.json"), r#"{"name":"test","ship":{"foo":"1.0.0"},"build":{"bar":"2.0.0"}}"#).unwrap();

        remove_from_ekko_json(&tmp, "foo").unwrap();
        let content = std::fs::read_to_string(tmp.join("ekko.json")).unwrap();
        let doc: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert!(doc["ship"]["foo"].is_null());
        assert_eq!(doc["build"]["bar"], "2.0.0");

        let _ = std::fs::remove_dir_all(&tmp);
    }
}
