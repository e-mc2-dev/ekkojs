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
use std::sync::{Arc, OnceLock};

use serde::Deserialize;

static WORKSPACE: OnceLock<Option<Arc<Workspace>>> = OnceLock::new();

pub fn init_workspace(entry_file: &Path) {
    let ws = discover_workspace(entry_file);
    let _ = WORKSPACE.set(ws.map(Arc::new));
}

pub fn get_workspace() -> Option<&'static Arc<Workspace>> {
    WORKSPACE.get_or_init(|| None).as_ref()
}

#[derive(Debug, Clone)]
pub struct Workspace {
    pub root: PathBuf,
    pub members: HashMap<String, Member>,
    pub dependencies: HashMap<String, ResolvedDep>,
    
    pub import_overrides: HashMap<String, String>,

    

    pub member_imports: HashMap<String, HashMap<String, String>>,
    pub lockfile: Option<Lockfile>,
    pub permissions: Option<serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct Member {
    pub name: String,
    pub version: String,
    pub kind: MemberKind,
    pub root_dir: PathBuf,
    pub exports: HashMap<String, String>,
    pub bin: HashMap<String, String>,
    pub ship: HashMap<String, String>,
    pub build: HashMap<String, String>,
    pub native: HashMap<String, HashMap<String, String>>,
    pub loading: HashMap<String, LoadingMode>,
    pub entry: Option<String>,
    pub package_include: Vec<String>,
    pub package_exclude: Vec<String>,
    pub description: Option<String>,
    pub license: Option<String>,
    pub repository: Option<String>,
    pub readme: Option<String>,
    pub min_ekko: Option<String>,
    pub publish: String,   
    pub storage: String,   

    
    
    pub peer: HashMap<String, String>,

    pub permissions: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MemberKind {
    Run,
    Lib,
    Tool,
    Test,
    Gui,
    Tui,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LoadingMode {
    Memory,
    Cache,
}

#[derive(Debug, Clone)]
pub struct ResolvedDep {
    pub name: String,
    pub version: String,
    pub location: DepLocation,
    pub integrity: String,
    pub category: DepCategory,
    pub exports: HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub enum DepLocation {
    Store(PathBuf),
    Vendor(PathBuf),
    Vfs(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DepCategory {
    Ship,
    Build,
}

#[derive(Debug, Clone)]
pub struct Lockfile {
    pub version: u32,
    pub packages: HashMap<String, LockedPackage>,
    pub workspace_members: HashMap<String, WorkspaceMemberLock>,
}

#[derive(Debug, Clone)]
pub struct LockedPackage {
    pub version: String,
    pub integrity: String,
    pub source: String,
    pub category: DepCategory,
    pub exports: HashMap<String, String>,
    pub latest_available: Option<String>,
}

#[derive(Debug, Clone)]
pub struct WorkspaceMemberLock {
    pub dir: String,
    pub checksum: String,
}

#[derive(Deserialize)]
struct RootConfig {
    workspace: Option<WorkspaceConfig>,
    name: Option<String>,
    version: Option<String>,
    #[serde(rename = "type")]
    kind: Option<String>,
    entry: Option<String>,
    exports: Option<HashMap<String, String>>,
    bin: Option<HashMap<String, String>>,
    ship: Option<HashMap<String, String>>,
    build: Option<HashMap<String, String>>,
    native: Option<HashMap<String, HashMap<String, String>>>,
    loading: Option<HashMap<String, LoadingMode>>,
    imports: Option<HashMap<String, String>>,
    #[allow(dead_code)]
    permissions: Option<serde_json::Value>,
    package: Option<PackageConfig>,
    description: Option<String>,
    license: Option<String>,
    #[allow(dead_code)]
    homepage: Option<String>,
    repository: Option<String>,
    readme: Option<String>,
    #[serde(rename = "minEkko")]
    min_ekko: Option<String>,
    private: Option<bool>,           
    publish: Option<String>,         
    storage: Option<String>,         
    peer: Option<HashMap<String, String>>,  
}

#[derive(Deserialize, Clone, Debug, Default)]
struct PackageConfig {
    #[serde(default)]
    include: Vec<String>,
    #[serde(default)]
    exclude: Vec<String>,
}

#[derive(Deserialize)]
struct WorkspaceConfig {
    members: Vec<String>,
    map: HashMap<String, String>,
}

#[derive(Deserialize)]
struct LockfileJson {
    version: Option<u32>,
    packages: Option<HashMap<String, LockedPackageJson>>,
    workspace_members: Option<HashMap<String, WorkspaceMemberLockJson>>,
}

#[derive(Deserialize)]
struct LockedPackageJson {
    version: String,
    integrity: String,
    source: String,
    category: String,
    exports: Option<HashMap<String, String>>,
    latest_available: Option<String>,
}

#[derive(Deserialize)]
struct WorkspaceMemberLockJson {
    dir: String,
    checksum: String,
}

const KNOWN_FIELDS: &[&str] = &[
    "workspace", "name", "version", "type", "entry", "exports", "bin",
    "ship", "build", "native", "loading", "imports", "permissions", "package",
    "description", "license", "homepage", "repository", "readme", "minEkko", "private",
    "publish", "storage", "peer",
    
    "author", "bugs", "keywords", "categories",
];

pub fn strip_jsonc_comments(input: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();
    let mut in_string = false;
    let mut escape_next = false;

    while let Some(c) = chars.next() {
        if escape_next {
            result.push(c);
            escape_next = false;
            continue;
        }
        if in_string {
            result.push(c);
            if c == '\\' { escape_next = true; }
            else if c == '"' { in_string = false; }
            continue;
        }
        if c == '"' {
            in_string = true;
            result.push(c);
            continue;
        }
        if c == '/' {
            match chars.peek() {
                Some('/') => {
                    chars.next();
                    while let Some(&nc) = chars.peek() {
                        if nc == '\n' { break; }
                        chars.next();
                    }
                    continue;
                }
                Some('*') => {
                    chars.next();
                    loop {
                        match chars.next() {
                            Some('*') if chars.peek() == Some(&'/') => { chars.next(); break; }
                            None => break,
                            _ => {}
                        }
                    }
                    result.push(' ');
                    continue;
                }
                _ => {}
            }
        }
        result.push(c);
    }
    result
}

fn warn_unknown_fields(clean_json: &str) {
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(clean_json) {
        if let Some(obj) = val.as_object() {
            for key in obj.keys() {
                if !KNOWN_FIELDS.contains(&key.as_str()) {
                    eprintln!("\x1b[33mwarning:\x1b[0m unknown field '{}' in ekko.json", key);
                }
            }
        }
    }
}

pub fn strip_bom(s: &str) -> &str {
    s.strip_prefix('\u{feff}').unwrap_or(s)
}

fn read_ekko_json(path: &Path) -> Option<RootConfig> {
    let content = std::fs::read_to_string(path).ok()?;
    let clean = strip_jsonc_comments(strip_bom(&content));
    warn_unknown_fields(&clean);
    serde_json::from_str::<RootConfig>(&clean).ok()
}

pub fn discover_workspace(entry_file: &Path) -> Option<Workspace> {
    let entry_abs = std::fs::canonicalize(entry_file)
        .unwrap_or_else(|_| entry_file.to_path_buf());
    let start_dir = entry_abs.parent()?;

    let mut dir = start_dir;
    loop {
        let config_path = dir.join("ekko.json");
        if config_path.exists() {
            if let Some(config) = read_ekko_json(&config_path) {
                if config.workspace.is_some() {
                    return parse_workspace(dir, config);
                }
            }
        }
        match dir.parent() {
            Some(parent) => dir = parent,
            None => break,
        }
    }

    let mut dir = start_dir;
    loop {
        let config_path = dir.join("ekko.json");
        if config_path.exists() {
            if let Some(config) = read_ekko_json(&config_path) {
                if config.name.is_some() && config.kind.is_some() {
                    return parse_single_project(dir, config);
                }
            }
        }
        match dir.parent() {
            Some(parent) => dir = parent,
            None => break,
        }
    }

    None
}

fn parse_workspace(root: &Path, config: RootConfig) -> Option<Workspace> {
    let ws_config = config.workspace?;
    let mut members = HashMap::new();
    let mut member_imports: HashMap<String, HashMap<String, String>> = HashMap::new();

    for (global_name, relative_dir) in &ws_config.map {
        let member_dir = root.join(relative_dir);
        let member_config_path = member_dir.join("ekko.json");
        if !member_config_path.exists() {
            continue;
        }
        let member_config = read_ekko_json(&member_config_path)?;

        let own_imports = member_config.imports.clone().unwrap_or_default();
        if let Some(member) = parse_member(global_name, &member_dir, member_config) {
            if !own_imports.is_empty() { member_imports.insert(global_name.clone(), own_imports); }
            members.insert(global_name.clone(), member);
        }
    }

    
    for pattern in &ws_config.members {
        let full_pattern = root.join(pattern).to_string_lossy().to_string();
        if let Ok(paths) = glob::glob(&full_pattern) {
            for entry in paths.flatten() {
                if entry.is_dir() && entry.join("ekko.json").exists() {

                }
            }
        }
    }

    let permissions = config.permissions.clone();
    let import_overrides = config.imports.unwrap_or_default();
    let lockfile = parse_lockfile(root);
    let dependencies = resolve_dependencies(&lockfile, root);

    Some(Workspace {
        root: root.to_path_buf(),
        members,
        dependencies,
        import_overrides,
        member_imports,
        lockfile,
        permissions,
    })
}

fn parse_single_project(root: &Path, config: RootConfig) -> Option<Workspace> {
    let name = config.name.clone().unwrap_or_else(|| "default".to_string());
    let permissions = config.permissions.clone();
    let import_overrides = config.imports.clone().unwrap_or_default();  
    let mut members = HashMap::new();

    if let Some(member) = parse_member(&name, root, config) {
        members.insert(name, member);
    }

    let lockfile = parse_lockfile(root);
    let dependencies = resolve_dependencies(&lockfile, root);

    Some(Workspace {
        root: root.to_path_buf(),
        members,
        dependencies,

        import_overrides,
        member_imports: HashMap::new(),
        lockfile,
        permissions,
    })
}

fn parse_member(global_name: &str, member_dir: &Path, config: RootConfig) -> Option<Member> {
    let kind = match config.kind.as_deref() {
        Some("run") => MemberKind::Run,
        Some("lib") => MemberKind::Lib,
        Some("tool") => MemberKind::Tool,
        Some("test") => MemberKind::Test,
        Some("gui") => MemberKind::Gui,
        Some("tui") => MemberKind::Tui,
        None if config.bin.as_ref().map_or(false, |b| !b.is_empty()) => MemberKind::Tool,
        None if config.entry.is_some() => MemberKind::Run,
        _ => return None,
    };

    Some(Member {
        name: config.name.unwrap_or_else(|| global_name.to_string()),
        version: config.version.unwrap_or_else(|| "0.0.0".to_string()),
        kind,
        root_dir: member_dir.to_path_buf(),
        exports: config.exports.unwrap_or_default(),
        bin: config.bin.unwrap_or_default(),
        ship: config.ship.unwrap_or_default(),
        build: config.build.unwrap_or_default(),
        native: config.native.unwrap_or_default(),
        loading: config.loading.unwrap_or_default(),
        entry: config.entry,
        package_include: config.package.as_ref().map(|p| p.include.clone()).unwrap_or_default(),
        package_exclude: config.package.as_ref().map(|p| p.exclude.clone()).unwrap_or_default(),
        description: config.description,
        license: config.license,
        repository: config.repository,
        readme: config.readme,
        min_ekko: config.min_ekko,
        publish: {
            
            config.publish.clone()
                .or_else(|| config.private.map(|p| if p { "private".to_string() } else { "public".to_string() }))
                .unwrap_or_else(|| "public".to_string())
        },
        storage: {
            
            config.storage.clone().unwrap_or_else(|| {
                config.publish.clone()
                    .or_else(|| config.private.map(|p| if p { "private".to_string() } else { "public".to_string() }))
                    .unwrap_or_else(|| "public".to_string())
            })
        },
        peer: config.peer.unwrap_or_default(),
        permissions: config.permissions,
    })
}

pub fn parse_standalone_member(config_path: &Path) -> anyhow::Result<Member> {
    let content = std::fs::read_to_string(config_path)?;
    let clean = strip_jsonc_comments(strip_bom(&content));
    let config: RootConfig = serde_json::from_str(&clean)?;
    let dir = config_path.parent().unwrap_or(Path::new("."));
    let name = config.name.clone().unwrap_or_else(|| {
        dir.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "unnamed".to_string())
    });
    parse_member(&name, dir, config)
        .ok_or_else(|| anyhow::anyhow!("cannot parse project at '{}' — check type/exports/bin/entry fields", config_path.display()))
}

pub fn validate_publish_storage(publish: &str, storage: &str) -> anyhow::Result<()> {
    for (field, val) in [("publish", publish), ("storage", storage)] {
        if val != "public" && val != "private" {
            anyhow::bail!("ekko.json `{}` must be \"public\" or \"private\" (got \"{}\")", field, val);
        }
    }
    if publish == "private" && storage == "public" {
        anyhow::bail!("ekko.json: a private package cannot use public storage — publish:\"private\" requires storage:\"private\"");
    }
    Ok(())
}

fn parse_lockfile(root: &Path) -> Option<Lockfile> {
    let lock_path = root.join("ekko.lock");
    let content = std::fs::read_to_string(&lock_path).ok()?;
    let raw: LockfileJson = serde_json::from_str(&content).ok()?;

    let packages = raw.packages.unwrap_or_default().into_iter().map(|(name, pkg)| {
        let category = match pkg.category.as_str() {
            "build" => DepCategory::Build,
            _ => DepCategory::Ship,
        };
        (name, LockedPackage {
            version: pkg.version,
            integrity: pkg.integrity,
            source: pkg.source,
            category,
            exports: pkg.exports.unwrap_or_default(),
            latest_available: pkg.latest_available,
        })
    }).collect();

    let workspace_members = raw.workspace_members.unwrap_or_default().into_iter().map(|(name, wm)| {
        (name, WorkspaceMemberLock {
            dir: wm.dir,
            checksum: wm.checksum,
        })
    }).collect();

    Some(Lockfile {
        version: raw.version.unwrap_or(2),
        packages,
        workspace_members,
    })
}

fn resolve_dependencies(lockfile: &Option<Lockfile>, root: &Path) -> HashMap<String, ResolvedDep> {
    let mut deps = HashMap::new();
    let Some(lock) = lockfile else { return deps };

    for (name, pkg) in &lock.packages {
        let store_path = dirs_store().join(name).join(&pkg.version);
        let vendor_path = root.join("vendor").join(name).join(&pkg.version);

        let location = if vendor_path.exists() {
            DepLocation::Vendor(vendor_path)
        } else if store_path.exists() {
            DepLocation::Store(store_path)
        } else {
            DepLocation::Store(store_path)
        };

        deps.insert(name.clone(), ResolvedDep {
            name: name.clone(),
            version: pkg.version.clone(),
            location,
            integrity: pkg.integrity.clone(),
            category: pkg.category,
            exports: pkg.exports.clone(),
        });
    }

    deps
}

impl Member {
    
    pub fn resolve_export(&self, subpath: &str) -> Option<&str> {
        if let Some(path) = self.exports.get(subpath) {
            return Some(path.as_str());
        }
        if subpath == "." {
            return self.exports.get(".").map(|s| s.as_str());
        }
        for (pattern, target) in &self.exports {
            if pattern.contains('*') {
                let prefix = pattern.split('*').next().unwrap_or("");
                if subpath.starts_with(prefix) {

                    let _ = target;
                }
            }
        }
        None
    }

    pub fn resolve_export_wildcard(&self, subpath: &str) -> Option<String> {
        for (pattern, target) in &self.exports {
            if pattern.contains('*') {
                let prefix = pattern.split('*').next().unwrap_or("");
                if subpath.starts_with(prefix) {
                    let remainder = &subpath[prefix.len()..];
                    return Some(target.replace('*', remainder));
                }
            }
        }
        None
    }
}

impl Workspace {

    

    

    pub fn member_owning_path(&self, module_path: &str) -> Option<&Member> {
        let needle = normalize_path_for_match(module_path);
        let mut best: Option<&Member> = None;
        let mut best_len = 0usize;
        for member in self.members.values() {
            let root = normalize_path_for_match(&member.root_dir.to_string_lossy());
            if !root.is_empty() && is_path_under(&needle, &root) && root.len() > best_len {
                best = Some(member);
                best_len = root.len();
            }
        }
        best
    }

    
    
    pub fn member_imports_owning_path(&self, module_path: &str) -> Option<&HashMap<String, String>> {
        let needle = normalize_path_for_match(module_path);
        let mut best: Option<(&String, usize)> = None;
        for (key, member) in self.members.iter() {
            let root = normalize_path_for_match(&member.root_dir.to_string_lossy());
            if !root.is_empty() && is_path_under(&needle, &root)
                && best.map_or(true, |(_, len)| root.len() > len)
            {
                best = Some((key, root.len()));
            }
        }
        self.member_imports.get(best?.0)
    }

    

    

    pub fn member_project_view(&self, member: &Member) -> Workspace {
        let lockfile = parse_lockfile(&member.root_dir);
        let dependencies = resolve_dependencies(&lockfile, &member.root_dir);
        let mut import_overrides = self.import_overrides.clone();
        
        if let Some((key, _)) = self.members.iter().find(|(_, m)| m.root_dir == member.root_dir) {
            if let Some(own) = self.member_imports.get(key) {
                for (k, v) in own { import_overrides.insert(k.clone(), v.clone()); }
            }
        }
        Workspace {
            root: member.root_dir.clone(),
            members: self.members.clone(),
            dependencies,
            import_overrides,
            member_imports: self.member_imports.clone(),
            lockfile,
            permissions: member.permissions.clone(),
        }
    }
}

fn normalize_path_for_match(p: &str) -> String {
    let mut s = p.replace('\\', "/");
    if let Some(rest) = s.strip_prefix("//?/") { s = rest.to_string(); }
    else if let Some(rest) = s.strip_prefix("//./") { s = rest.to_string(); }
    while s.len() > 1 && s.ends_with('/') { s.pop(); }
    if cfg!(windows) { s = s.to_lowercase(); }
    s
}

fn is_path_under(child: &str, ancestor: &str) -> bool {
    if ancestor.is_empty() || !child.starts_with(ancestor) { return false; }
    matches!(child.as_bytes().get(ancestor.len()), None | Some(b'/'))
}

pub fn split_package_specifier(spec: &str) -> (String, String) {
    if spec.starts_with('@') {
        let parts: Vec<&str> = spec.splitn(3, '/').collect();
        if parts.len() >= 3 {
            (format!("{}/{}", parts[0], parts[1]), format!("./{}", parts[2]))
        } else {
            (spec.to_string(), ".".to_string())
        }
    } else if let Some(idx) = spec.find('/') {
        (spec[..idx].to_string(), format!("./{}", &spec[idx + 1..]))
    } else {
        (spec.to_string(), ".".to_string())
    }
}

fn dirs_store() -> PathBuf {
    if let Some(home) = home_dir() {
        home.join(".ekko").join("store")
    } else {
        PathBuf::from(".ekko").join("store")
    }
}

fn home_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE").ok().map(PathBuf::from)
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME").ok().map(PathBuf::from)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn split_scoped_package() {
        let (pkg, sub) = split_package_specifier("@acme/core/models");
        assert_eq!(pkg, "@acme/core");
        assert_eq!(sub, "./models");
    }

    #[test]
    fn split_scoped_package_no_subpath() {
        let (pkg, sub) = split_package_specifier("@acme/core");
        assert_eq!(pkg, "@acme/core");
        assert_eq!(sub, ".");
    }

    #[test]
    fn split_unscoped_package() {
        let (pkg, sub) = split_package_specifier("lodash/merge");
        assert_eq!(pkg, "lodash");
        assert_eq!(sub, "./merge");
    }

    #[test]
    fn split_unscoped_no_subpath() {
        let (pkg, sub) = split_package_specifier("zod");
        assert_eq!(pkg, "zod");
        assert_eq!(sub, ".");
    }

    #[test]
    fn member_resolve_export_exact() {
        let member = Member {
            name: "test".into(),
            version: "1.0.0".into(),
            kind: MemberKind::Lib,
            root_dir: PathBuf::from("/tmp/test"),
            exports: HashMap::from([
                (".".into(), "./src/index.ts".into()),
                ("./models".into(), "./src/models/index.ts".into()),
            ]),
            bin: HashMap::new(),
            ship: HashMap::new(),
            build: HashMap::new(),
            native: HashMap::new(),
            loading: HashMap::new(),
            entry: None,
            package_include: Vec::new(),
            package_exclude: Vec::new(),
            description: None, license: None, repository: None, readme: None, min_ekko: None, publish: "public".into(), storage: "public".into(),
            peer: HashMap::new(), permissions: None,
        };

        assert_eq!(member.resolve_export("."), Some("./src/index.ts"));
        assert_eq!(member.resolve_export("./models"), Some("./src/models/index.ts"));
        assert_eq!(member.resolve_export("./unknown"), None);
    }

    #[test]
    fn member_resolve_export_wildcard() {
        let member = Member {
            name: "test".into(),
            version: "1.0.0".into(),
            kind: MemberKind::Lib,
            root_dir: PathBuf::from("/tmp/test"),
            exports: HashMap::from([
                (".".into(), "./src/index.ts".into()),
                ("./components/*".into(), "./src/components/*.ts".into()),
            ]),
            bin: HashMap::new(),
            ship: HashMap::new(),
            build: HashMap::new(),
            native: HashMap::new(),
            loading: HashMap::new(),
            entry: None,
            package_include: Vec::new(),
            package_exclude: Vec::new(),
            description: None, license: None, repository: None, readme: None, min_ekko: None, publish: "public".into(), storage: "public".into(),
            peer: HashMap::new(), permissions: None,
        };

        assert_eq!(
            member.resolve_export_wildcard("./components/Button"),
            Some("./src/components/Button.ts".into())
        );
    }

    #[test]
    fn parse_member_config() {
        let json = r#"{
            "name": "@acme/core",
            "version": "1.5.0",
            "type": "lib",
            "exports": {
                ".": "./src/index.ts",
                "./models": "./src/models/index.ts"
            },
            "ship": {
                "zod": "3.23.0"
            },
            "bin": {
                "acme": "./src/cli.ts"
            }
        }"#;

        let config: RootConfig = serde_json::from_str(json).unwrap();
        let member = parse_member("@acme/core", Path::new("/workspace/libs/core"), config).unwrap();

        assert_eq!(member.name, "@acme/core");
        assert_eq!(member.version, "1.5.0");
        assert_eq!(member.kind, MemberKind::Lib);
        assert_eq!(member.exports.get(".").unwrap(), "./src/index.ts");
        assert_eq!(member.ship.get("zod").unwrap(), "3.23.0");
        assert_eq!(member.bin.get("acme").unwrap(), "./src/cli.ts");
    }

    fn parse(json: &str) -> Member {
        let config: RootConfig = serde_json::from_str(json).unwrap();
        parse_member("p", Path::new("/tmp/p"), config).unwrap()
    }

    #[test]
    fn publish_storage_defaults_public() {
        let m = parse(r#"{ "name": "p", "version": "1.0.0", "type": "lib", "exports": { ".": "./i.ts" } }"#);
        assert_eq!(m.publish, "public");
        assert_eq!(m.storage, "public");
    }

    #[test]
    fn publish_private_alias_maps_both_private() {
        let m = parse(r#"{ "name": "p", "version": "1.0.0", "type": "lib", "exports": { ".": "./i.ts" }, "private": true }"#);
        assert_eq!(m.publish, "private");
        assert_eq!(m.storage, "private"); 
    }

    #[test]
    fn storage_mirrors_publish_when_omitted() {
        let m = parse(r#"{ "name": "p", "version": "1.0.0", "type": "lib", "exports": { ".": "./i.ts" }, "publish": "private" }"#);
        assert_eq!(m.publish, "private");
        assert_eq!(m.storage, "private");
    }

    #[test]
    fn explicit_public_publish_private_storage() {
        let m = parse(r#"{ "name": "p", "version": "1.0.0", "type": "lib", "exports": { ".": "./i.ts" }, "publish": "public", "storage": "private" }"#);
        assert_eq!(m.publish, "public");
        assert_eq!(m.storage, "private");
    }

    #[test]
    fn validate_rejects_private_publish_on_public_storage() {
        assert!(validate_publish_storage("private", "public").is_err());
    }

    #[test]
    fn validate_accepts_valid_combos() {
        assert!(validate_publish_storage("public", "public").is_ok());
        assert!(validate_publish_storage("public", "private").is_ok());
        assert!(validate_publish_storage("private", "private").is_ok());
        assert!(validate_publish_storage("bogus", "public").is_err());
    }

    #[test]
    fn parse_workspace_config() {
        let json = r#"{
            "workspace": {
                "members": ["apps/*", "libs/*"],
                "map": {
                    "@acme/core": "libs/core",
                    "@acme/api": "apps/api"
                }
            }
        }"#;

        let config: RootConfig = serde_json::from_str(json).unwrap();
        let ws = config.workspace.unwrap();
        assert_eq!(ws.members.len(), 2);
        assert_eq!(ws.map.get("@acme/core").unwrap(), "libs/core");
    }

    #[test]
    fn parse_lockfile_json() {
        let json = r#"{
            "version": 2,
            "packages": {
                "zod": {
                    "version": "3.23.0",
                    "source": "registry:pkg.ekko.dev",
                    "integrity": "sha256-abc123",
                    "category": "ship",
                    "exports": { ".": "src/index.js" },
                    "latest_available": "3.24.1"
                }
            },
            "workspace_members": {
                "@acme/core": { "dir": "libs/core", "checksum": "sha256-def456" }
            }
        }"#;

        let raw: LockfileJson = serde_json::from_str(json).unwrap();
        assert_eq!(raw.version, Some(2));
        let pkgs = raw.packages.unwrap();
        assert_eq!(pkgs.get("zod").unwrap().version, "3.23.0");
        let members = raw.workspace_members.unwrap();
        assert_eq!(members.get("@acme/core").unwrap().dir, "libs/core");
    }

    #[test]
    fn discover_workspace_from_temp_dir() {
        let tmp = std::env::temp_dir().join("ekko_test_ws_discover");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(tmp.join("libs/core/src")).unwrap();
        fs::create_dir_all(tmp.join("apps/api/src")).unwrap();

        let tmp = fs::canonicalize(&tmp).unwrap();

        fs::write(tmp.join("ekko.json"), r#"{
            "workspace": {
                "members": ["apps/*", "libs/*"],
                "map": {
                    "@test/core": "libs/core"
                }
            }
        }"#).unwrap();

        fs::write(tmp.join("libs/core/ekko.json"), r#"{
            "name": "@test/core",
            "version": "1.0.0",
            "type": "lib",
            "exports": { ".": "./src/index.ts" }
        }"#).unwrap();

        fs::write(tmp.join("libs/core/src/index.ts"), "export const x = 1;").unwrap();
        fs::write(tmp.join("apps/api/src/main.ts"), "import { x } from '@test/core';").unwrap();

        let entry = tmp.join("apps/api/src/main.ts");
        let ws = discover_workspace(&entry).unwrap();

        assert_eq!(ws.root, tmp);
        assert!(ws.members.contains_key("@test/core"));
        let core = ws.members.get("@test/core").unwrap();
        assert_eq!(core.kind, MemberKind::Lib);
        assert_eq!(core.resolve_export("."), Some("./src/index.ts"));

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn discover_single_project() {
        let tmp = std::env::temp_dir().join("ekko_test_single_proj");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(tmp.join("src")).unwrap();
        let tmp = fs::canonicalize(&tmp).unwrap();   

        fs::write(tmp.join("ekko.json"), r#"{
            "name": "my-app",
            "version": "1.0.0",
            "type": "run",
            "entry": "src/main.ts"
        }"#).unwrap();
        fs::write(tmp.join("src/main.ts"), "console.log('hello');").unwrap();

        let entry = tmp.join("src/main.ts");
        let ws = discover_workspace(&entry).unwrap();

        assert_eq!(ws.root, tmp);
        assert!(ws.members.contains_key("my-app"));
        let app = ws.members.get("my-app").unwrap();
        assert_eq!(app.kind, MemberKind::Run);
        assert_eq!(app.entry, Some("src/main.ts".to_string()));

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn script_mode_no_ekko_json() {
        let tmp = std::env::temp_dir().join("ekko_test_script_mode");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&tmp).unwrap();
        fs::write(tmp.join("hello.ts"), "console.log('hi');").unwrap();

        let entry = tmp.join("hello.ts");
        let ws = discover_workspace(&entry);
        assert!(ws.is_none());

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn strip_jsonc_line_comments() {
        let input = r#"{ "name": "test", // this is a comment
"version": "1.0.0" }"#;
        let clean = strip_jsonc_comments(input);
        let val: serde_json::Value = serde_json::from_str(&clean).unwrap();
        assert_eq!(val["name"], "test");
        assert_eq!(val["version"], "1.0.0");
    }

    #[test]
    fn strip_jsonc_block_comments() {
        let input = r#"{ "name": "test", /* block comment */ "type": "lib" }"#;
        let clean = strip_jsonc_comments(input);
        let val: serde_json::Value = serde_json::from_str(&clean).unwrap();
        assert_eq!(val["name"], "test");
        assert_eq!(val["type"], "lib");
    }

    #[test]
    fn strip_jsonc_preserves_strings() {
        let input = r#"{ "url": "https://example.com/path" }"#;
        let clean = strip_jsonc_comments(input);
        let val: serde_json::Value = serde_json::from_str(&clean).unwrap();
        assert_eq!(val["url"], "https://example.com/path");
    }

    #[test]
    fn strip_jsonc_slash_in_string() {
        let input = r#"{ "path": "a/b/c", "desc": "has // slashes" }"#;
        let clean = strip_jsonc_comments(input);
        let val: serde_json::Value = serde_json::from_str(&clean).unwrap();
        assert_eq!(val["path"], "a/b/c");
        assert_eq!(val["desc"], "has // slashes");
    }

    #[test]
    fn parse_package_config() {
        let json = r#"{
            "name": "my-app",
            "version": "1.0.0",
            "type": "run",
            "entry": "server.tsx",
            "package": {
                "include": ["handlers/**", "styles/**"],
                "exclude": ["*.test.ts"]
            }
        }"#;
        let config: RootConfig = serde_json::from_str(json).unwrap();
        let pkg = config.package.unwrap();
        assert_eq!(pkg.include, vec!["handlers/**", "styles/**"]);
        assert_eq!(pkg.exclude, vec!["*.test.ts"]);
    }

    #[test]
    fn parse_jsonc_ekko_json() {
        let tmp = std::env::temp_dir().join("ekko_test_jsonc");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(tmp.join("src")).unwrap();
        fs::write(tmp.join("ekko.json"), r#"{
            // This is a JSONC config
            "name": "jsonc-app",
            "version": "1.0.0",
            "type": "run",
            "entry": "src/main.ts"
            /* permissions would go here */
        }"#).unwrap();
        fs::write(tmp.join("src/main.ts"), "console.log('hi');").unwrap();

        let entry = tmp.join("src/main.ts");
        let ws = discover_workspace(&entry).unwrap();
        assert!(ws.members.contains_key("jsonc-app"));

        let _ = fs::remove_dir_all(&tmp);
    }

    fn mk_member(name: &str, root: &str) -> Member {
        Member {
            name: name.into(), version: "1.0.0".into(), kind: MemberKind::Lib,
            root_dir: PathBuf::from(root),
            exports: HashMap::new(), bin: HashMap::new(), ship: HashMap::new(),
            build: HashMap::new(), native: HashMap::new(), loading: HashMap::new(),
            entry: None, package_include: Vec::new(), package_exclude: Vec::new(),
            description: None, license: None, repository: None, readme: None, min_ekko: None,
            publish: "public".into(), storage: "public".into(), peer: HashMap::new(), permissions: None,
        }
    }

    fn mk_ws(members: Vec<Member>) -> Workspace {
        let mut m = HashMap::new();
        for mem in members { m.insert(mem.name.clone(), mem); }
        Workspace {
            root: PathBuf::from("/ws"), members: m, dependencies: HashMap::new(),
            import_overrides: HashMap::new(), member_imports: HashMap::new(), lockfile: None, permissions: None,
        }
    }

    #[test]
    fn strip_bom_makes_json_parseable() {
        assert_eq!(strip_bom("\u{feff}{}"), "{}");
        assert_eq!(strip_bom("{}"), "{}");
        assert!(serde_json::from_str::<serde_json::Value>("\u{feff}{\"a\":1}").is_err());
        assert!(serde_json::from_str::<serde_json::Value>(strip_bom("\u{feff}{\"a\":1}")).is_ok());
    }

    #[test]
    fn read_ekko_json_tolerates_bom() {
        let tmp = std::env::temp_dir().join("ekko_test_bom_ekko");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&tmp).unwrap();
        fs::write(tmp.join("ekko.json"),
            "\u{feff}{\"name\":\"bommed\",\"version\":\"1.0.0\",\"type\":\"lib\",\"exports\":{\".\":\"./src/index.ts\"}}").unwrap();
        let cfg = read_ekko_json(&tmp.join("ekko.json")).expect("BOM'd ekko.json must parse");
        assert_eq!(cfg.name.as_deref(), Some("bommed"));
        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn per_member_imports_populated_and_scoped() {
        let tmp = std::env::temp_dir().join("ekko_test_member_imports");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(tmp.join("libs/core/src")).unwrap();
        fs::create_dir_all(tmp.join("apps/api/src")).unwrap();
        let tmp = fs::canonicalize(&tmp).unwrap();

        fs::write(tmp.join("ekko.json"), r#"{
            "workspace": { "members": ["libs/*","apps/*"],
              "map": { "@t/core": "libs/core", "@t/api": "apps/api" } },
            "imports": { "shared": "@t/core" }
        }"#).unwrap();
        fs::write(tmp.join("libs/core/ekko.json"),
            r#"{ "name":"@t/core","version":"1.0.0","type":"lib","exports":{".":"./src/index.ts"},
                 "imports": { "@db": "./src/db" } }"#).unwrap();
        fs::write(tmp.join("apps/api/ekko.json"),
            r#"{ "name":"@t/api","version":"1.0.0","type":"run","entry":"src/main.ts" }"#).unwrap();
        fs::write(tmp.join("libs/core/src/index.ts"), "export const x=1;").unwrap();
        fs::write(tmp.join("apps/api/src/main.ts"), "").unwrap();

        let ws = discover_workspace(&tmp.join("apps/api/src/main.ts")).unwrap();
        
        assert_eq!(ws.import_overrides.get("shared").map(String::as_str), Some("@t/core"));
        assert!(!ws.import_overrides.contains_key("@db"));
        assert_eq!(ws.member_imports.get("@t/core").and_then(|m| m.get("@db")).map(String::as_str), Some("./src/db"));
        
        let core_file = tmp.join("libs/core/src/index.ts").to_string_lossy().to_string();
        let api_file = tmp.join("apps/api/src/main.ts").to_string_lossy().to_string();
        assert!(ws.member_imports_owning_path(&core_file).and_then(|m| m.get("@db")).is_some());
        assert!(ws.member_imports_owning_path(&api_file).is_none());

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn owning_member_scopes_native_self_to_caller_package() {

        let ws = mk_ws(vec![
            mk_member("@ekko/postgres", "/ws/ekko-lib/postgres"),
            mk_member("@ekko/mysql", "/ws/ekko-lib/mysql"),
        ]);
        assert_eq!(ws.member_owning_path("/ws/ekko-lib/postgres/src/db.ts").unwrap().name, "@ekko/postgres");
        assert_eq!(ws.member_owning_path("/ws/ekko-lib/mysql/src/db.ts").unwrap().name, "@ekko/mysql");
        
        assert!(ws.member_owning_path("/ws/scripts/run.ts").is_none());
    }

    #[test]
    fn owning_member_deepest_root_wins() {
        let ws = mk_ws(vec![
            mk_member("outer", "/ws/pkgs"),
            mk_member("inner", "/ws/pkgs/inner"),
        ]);
        assert_eq!(ws.member_owning_path("/ws/pkgs/inner/src/x.ts").unwrap().name, "inner");
        assert_eq!(ws.member_owning_path("/ws/pkgs/other/src/x.ts").unwrap().name, "outer");
    }

    #[test]
    fn owning_member_is_boundary_aware() {
        let ws = mk_ws(vec![mk_member("pg", "/ws/postgres")]);
        
        assert!(ws.member_owning_path("/ws/postgres-extra/src/x.ts").is_none());
        assert_eq!(ws.member_owning_path("/ws/postgres/src/x.ts").unwrap().name, "pg");
    }

    #[test]
    fn owning_member_normalizes_windows_verbatim_and_separators() {

        let ws = mk_ws(vec![mk_member("pg", r"\\?\D:\git\ekkojs\ekko-lib\postgres")]);
        assert_eq!(
            ws.member_owning_path(r"D:\git\ekkojs\ekko-lib\postgres\src\db.ts").unwrap().name,
            "pg"
        );
    }

    #[test]
    fn path_under_helpers() {
        assert!(is_path_under("/a/b/c", "/a/b"));
        assert!(is_path_under("/a/b", "/a/b"));
        assert!(!is_path_under("/a/bc", "/a/b"));
        assert!(!is_path_under("/a", "/a/b"));
        assert!(!is_path_under("/x", ""));

        
        let normalized = normalize_path_for_match(r"\\?\D:\Foo\Bar\");
        if cfg!(windows) {
            assert_eq!(normalized, "d:/foo/bar");
        } else {
            assert_eq!(normalized, "D:/Foo/Bar");
        }
    }

    #[test]
    fn member_project_view_scopes_to_member_root_lock_perms() {
        let tmp = std::env::temp_dir().join("ekko_test_member_view");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(tmp.join("apps/api/src")).unwrap();
        fs::create_dir_all(tmp.join("libs/core/src")).unwrap();
        let tmp = fs::canonicalize(&tmp).unwrap();

        fs::write(tmp.join("ekko.json"), r#"{
            "workspace": { "members": ["apps/*","libs/*"],
              "map": { "@t/api": "apps/api", "@t/core": "libs/core" } },
            "permissions": { "fs": true }
        }"#).unwrap();
        fs::write(tmp.join("apps/api/ekko.json"),
            r#"{ "name":"@t/api","version":"1.0.0","type":"run","entry":"src/main.ts",
                 "permissions": { "net": true, "env": ["PORT"] } }"#).unwrap();
        fs::write(tmp.join("apps/api/ekko.lock"), r#"{
            "version": 2,
            "packages": { "zod": { "version":"3.23.0","integrity":"sha256-x","source":"registry:r","category":"ship","exports":{".":"src/index.js"} } }
        }"#).unwrap();
        fs::write(tmp.join("libs/core/ekko.json"),
            r#"{ "name":"@t/core","version":"1.0.0","type":"lib","exports":{".":"./src/index.ts"} }"#).unwrap();
        fs::write(tmp.join("apps/api/src/main.ts"), "").unwrap();
        fs::write(tmp.join("libs/core/src/index.ts"), "export const x=1;").unwrap();

        let ws = discover_workspace(&tmp.join("apps/api/src/main.ts")).unwrap();
        let member = ws.members.get("@t/api").unwrap();
        let view = ws.member_project_view(member);

        assert_eq!(view.root, member.root_dir);
        assert_ne!(view.root, ws.root);
        
        let perms = view.permissions.as_ref().expect("member perms carried through");
        assert!(perms.get("net").is_some());
        assert!(perms.get("env").is_some());
        assert!(perms.get("fs").is_none());
        
        assert!(view.dependencies.contains_key("zod"));
        assert_eq!(view.dependencies.get("zod").unwrap().version, "3.23.0");
        
        assert!(view.members.contains_key("@t/core"));

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn member_project_view_single_project_is_root_noop() {
        
        let tmp = std::env::temp_dir().join("ekko_test_member_view_single");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(tmp.join("src")).unwrap();
        let tmp = fs::canonicalize(&tmp).unwrap();
        fs::write(tmp.join("ekko.json"),
            r#"{ "name":"solo","version":"1.0.0","type":"run","entry":"src/main.ts" }"#).unwrap();
        fs::write(tmp.join("src/main.ts"), "").unwrap();

        let ws = discover_workspace(&tmp.join("src/main.ts")).unwrap();
        let member = ws.members.get("solo").unwrap();
        let view = ws.member_project_view(member);
        assert_eq!(view.root, ws.root);

        let _ = fs::remove_dir_all(&tmp);
    }
}
