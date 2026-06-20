// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::collections::{HashMap, HashSet, VecDeque};
use std::path::{Path, PathBuf};

use crate::packages::workspace::{Member, MemberKind};
use crate::parsers::swc_transform;

pub struct BuildResult {
    pub files: Vec<BuildEntry>,
    pub native_libs: HashMap<String, PathBuf>,
}

pub struct BuildEntry {
    pub relative_path: String,
    pub content: Vec<u8>,
}

pub fn build_member(member: &Member) -> anyhow::Result<BuildResult> {
    validate_member(member)?;

    let mut files = Vec::new();

    if member.kind == MemberKind::Gui || member.kind == MemberKind::Tui {
        let all_files = walk_project_dir(&member.root_dir)?;
        for (abs_path, relative) in &all_files {
            let ext = abs_path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if swc_transform::needs_transpile(&abs_path.to_string_lossy()) {
                let source = std::fs::read_to_string(abs_path)
                    .map_err(|e| anyhow::anyhow!("cannot read '{}': {}", abs_path.display(), e))?;
                let js = swc_transform::transpile(&source, &abs_path.to_string_lossy())?;
                let output_path = relative
                    .replace(".tsx", ".js")
                    .replace(".jsx", ".js")
                    .replace(".ts", ".js");
                files.push(BuildEntry { relative_path: output_path, content: js.into_bytes() });
            } else if is_text_ext(ext) {
                let source = std::fs::read_to_string(abs_path)
                    .map_err(|e| anyhow::anyhow!("cannot read '{}': {}", abs_path.display(), e))?;
                files.push(BuildEntry { relative_path: relative.clone(), content: source.into_bytes() });
            } else {
                let data = std::fs::read(abs_path)
                    .map_err(|e| anyhow::anyhow!("cannot read '{}': {}", abs_path.display(), e))?;
                files.push(BuildEntry { relative_path: relative.clone(), content: data });
            }
        }
    } else {
        let mut source_files = walk_import_graph(member)?;

        

        let mut includes = member.package_include.clone();
        match member.kind {
            MemberKind::Rune => {
                
                for d in [".ekko/build/**/*", "static/**/*", "public/**/*", "pages/**/*", "styles/**/*", "content/**/*", "assets/**/*"] {
                    includes.push(d.to_string());
                }
            }
            MemberKind::Web => {
                for d in ["dist/**/*", "static/**/*", "public/**/*", "index.html"] {
                    includes.push(d.to_string());
                }
            }
            _ => {}
        }
        if !includes.is_empty() {
            let extra = walk_package_includes(
                &member.root_dir,
                &includes,
                &member.package_exclude,
            )?;
            for path in extra {
                source_files.push(path);
            }
            source_files.sort();
            source_files.dedup();
        }

        let root_canonical = std::fs::canonicalize(&member.root_dir).unwrap_or_else(|_| member.root_dir.clone());
        for abs_path in &source_files {
            let relative = abs_path.strip_prefix(&root_canonical)
                .or_else(|_| abs_path.strip_prefix(&member.root_dir))
                .unwrap_or(abs_path)
                .to_string_lossy()
                .replace('\\', "/");

            let ext = abs_path.extension().and_then(|e| e.to_str()).unwrap_or("");

            if swc_transform::needs_transpile(&abs_path.to_string_lossy()) {
                let source = std::fs::read_to_string(abs_path)
                    .map_err(|e| anyhow::anyhow!("cannot read '{}': {}", abs_path.display(), e))?;
                let js = swc_transform::transpile(&source, &abs_path.to_string_lossy())?;
                let output_path = relative
                    .replace(".tsx", ".js")
                    .replace(".jsx", ".js")
                    .replace(".ts", ".js");
                files.push(BuildEntry { relative_path: output_path, content: js.into_bytes() });
            } else if is_text_ext(ext) {
                let source = std::fs::read_to_string(abs_path)
                    .map_err(|e| anyhow::anyhow!("cannot read '{}': {}", abs_path.display(), e))?;
                files.push(BuildEntry { relative_path: relative.clone(), content: source.into_bytes() });
            } else {
                let data = std::fs::read(abs_path)
                    .map_err(|e| anyhow::anyhow!("cannot read '{}': {}", abs_path.display(), e))?;
                files.push(BuildEntry { relative_path: relative.clone(), content: data });
            }
        }
    }

    
    if let Some(rel) = member.readme.as_ref() {
        let abs = member.root_dir.join(rel);
        if !abs.exists() {
            anyhow::bail!("ekko.json `readme` points to a missing file: {}", rel);
        }
        let rel_norm = rel.replace('\\', "/");
        if !files.iter().any(|f| f.relative_path == rel_norm) {
            let data = std::fs::read(&abs)
                .map_err(|e| anyhow::anyhow!("cannot read readme '{}': {}", abs.display(), e))?;
            files.push(BuildEntry { relative_path: rel_norm, content: data });
        }
    }

    let native_libs = resolve_native_libs(member);

    Ok(BuildResult { files, native_libs })
}

fn merge_root_imports(ekko_json: &[u8], root_imports: &HashMap<String, String>) -> Vec<u8> {
    if root_imports.is_empty() { return ekko_json.to_vec(); }
    let text = match std::str::from_utf8(ekko_json) { Ok(t) => t, Err(_) => return ekko_json.to_vec() };
    let clean = crate::packages::workspace::strip_jsonc_comments(crate::packages::workspace::strip_bom(text));
    let mut val: serde_json::Value = match serde_json::from_str(&clean) { Ok(v) => v, Err(_) => return ekko_json.to_vec() };
    let obj = match val.as_object_mut() { Some(o) => o, None => return ekko_json.to_vec() };

    let mut imports: serde_json::Map<String, serde_json::Value> = obj.get("imports")
        .and_then(|v| v.as_object()).cloned().unwrap_or_default();
    let mut changed = false;
    for (k, v) in root_imports {
        if !imports.contains_key(k) {
            imports.insert(k.clone(), serde_json::Value::String(v.clone()));
            changed = true;
        }
    }
    if !changed { return ekko_json.to_vec(); }   
    obj.insert("imports".to_string(), serde_json::Value::Object(imports));
    serde_json::to_vec_pretty(&val).unwrap_or_else(|_| ekko_json.to_vec())
}

fn ekko_json_for_pack(member_dir: &std::path::Path) -> Option<Vec<u8>> {
    let raw = std::fs::read(member_dir.join("ekko.json")).ok()?;
    let root_imports = crate::packages::workspace::get_workspace()
        .map(|ws| ws.import_overrides.clone())
        .unwrap_or_default();
    Some(merge_root_imports(&raw, &root_imports))
}

pub fn pack_member(member: &Member, platform: &str, arch: &str) -> anyhow::Result<Vec<u8>> {
    let build_result = build_member(member)?;

    let native_metadata: HashMap<String, String> = build_result.native_libs.iter().map(|(name, path)| {
        let rel = path.strip_prefix(&member.root_dir).unwrap_or(path)
            .to_string_lossy().replace('\\', "/");
        (name.clone(), rel)
    }).collect();

    let project_type = match member.kind {
        MemberKind::Run => "run",
        MemberKind::Rune => "rune",
        MemberKind::Web => "web",
        MemberKind::Lib => "lib",
        MemberKind::Tool => "tool",
        MemberKind::Test => "test",
        MemberKind::Gui => "gui",
        MemberKind::Tui => "tui",
    };

    let metadata = ekko_vfs::PackageMetadata {
        name: member.name.clone(),
        version: member.version.clone(),
        platform: platform.to_string(),
        arch: arch.to_string(),
        exports: member.exports.iter().map(|(k, v)| {
            let js_path = v.replace(".tsx", ".js").replace(".jsx", ".js").replace(".ts", ".js");
            (k.clone(), js_path)
        }).collect(),
        bin: member.bin.iter().map(|(k, v)| {
            let js_path = v.replace(".tsx", ".js").replace(".jsx", ".js").replace(".ts", ".js");
            (k.clone(), js_path)
        }).collect(),
        entry: member.entry.as_ref().map(|e| {
            e.replace(".tsx", ".js").replace(".jsx", ".js").replace(".ts", ".js")
        }),
        project_type: Some(project_type.to_string()),
        native: native_metadata.clone(),
        loading: "memory".to_string(),
        integrity: String::new(),
        signature: String::new(),
        ship: member.ship.clone(),
    };

    let mut writer = ekko_vfs::EklWriter::new(metadata);

    for entry in &build_result.files {
        writer.add_entry(&entry.relative_path, entry.content.clone());
    }

    for (_, path) in &build_result.native_libs {
        let native_data = std::fs::read(path)
            .map_err(|e| anyhow::anyhow!("cannot read native lib '{}': {}", path.display(), e))?;
        let rel = path.strip_prefix(&member.root_dir).unwrap_or(path)
            .to_string_lossy().replace('\\', "/");
        writer.add_entry(rel, native_data);
    }

    
    if let Some(data) = ekko_json_for_pack(&member.root_dir) {
        writer.add_entry("ekko.json", data);
    }

    let lock_path = member.root_dir.join("ekko.lock");
    if lock_path.exists() {
        if let Ok(data) = std::fs::read(&lock_path) {
            writer.add_entry("ekko.lock", data);
        }
    }

    writer.build()
}

fn validate_member(member: &Member) -> anyhow::Result<()> {
    match member.kind {
        MemberKind::Test => {
            anyhow::bail!("test members cannot be packaged");
        }
        MemberKind::Lib => {
            if member.exports.is_empty() {
                anyhow::bail!("lib members require an exports field");
            }
        }
        MemberKind::Tool => {
            if member.bin.is_empty() {
                anyhow::bail!("tool members require a bin field");
            }
        }
        MemberKind::Run => {
            if member.bin.is_empty() && member.entry.is_none() {
                anyhow::bail!("run members require a bin field or entry for packaging");
            }
        }
        MemberKind::Rune => {
            if member.entry.is_none() {
                anyhow::bail!("rune members require an entry field (e.g. server.tsx)");
            }
        }
        MemberKind::Web => {
            if member.entry.is_none() {
                anyhow::bail!("web members require an entry field (e.g. serve.ts / server.ts)");
            }
        }
        MemberKind::Gui => {
            if member.entry.is_none() {
                anyhow::bail!("gui members require an entry field");
            }
        }
        MemberKind::Tui => {
            if member.entry.is_none() {
                anyhow::bail!("tui members require an entry field");
            }
        }
    }
    Ok(())
}

fn walk_package_includes(
    root: &Path,
    includes: &[String],
    excludes: &[String],
) -> anyhow::Result<Vec<PathBuf>> {
    let mut result = Vec::new();
    let root_str = root.to_string_lossy().replace('\\', "/");

    for pattern in includes {
        let full = format!("{}/{}", root_str, pattern);
        for entry in glob::glob(&full)? {
            let path = entry?;
            if !path.is_file() { continue; }
            let relative = path.strip_prefix(root)
                .unwrap_or(&path)
                .to_string_lossy()
                .replace('\\', "/");

            let excluded = excludes.iter().any(|ex| {
                glob::Pattern::new(ex).map_or(false, |p| p.matches(&relative))
            });
            if !excluded {
                result.push(std::fs::canonicalize(&path).unwrap_or(path));
            }
        }
    }
    Ok(result)
}

fn walk_project_dir(root: &Path) -> anyhow::Result<Vec<(PathBuf, String)>> {
    let mut result = Vec::new();
    let skip_dirs: HashSet<&str> = ["node_modules", ".ekko", ".git", "dist", ".claude"].iter().copied().collect();

    for entry in walkdir::WalkDir::new(root)
        .into_iter()
        .filter_entry(|e| {
            if e.file_type().is_dir() {
                if let Some(name) = e.file_name().to_str() {
                    return !skip_dirs.contains(name);
                }
            }
            true
        })
    {
        let entry = entry?;
        if !entry.file_type().is_file() { continue; }
        let abs = entry.path().to_path_buf();
        if abs.file_name().map_or(false, |n| n == "ekko.json") { continue; }
        let relative = abs.strip_prefix(root)
            .unwrap_or(&abs)
            .to_string_lossy()
            .replace('\\', "/");
        result.push((abs, relative));
    }
    Ok(result)
}

fn is_text_ext(ext: &str) -> bool {
    matches!(ext,
        "js" | "mjs" | "json" | "html" | "htm" | "css" | "svg" | "xml"
        | "txt" | "md" | "map" | "toml" | "yaml" | "yml"
    )
}

fn walk_import_graph(member: &Member) -> anyhow::Result<Vec<PathBuf>> {
    let mut visited: HashSet<PathBuf> = HashSet::new();
    let mut queue: VecDeque<PathBuf> = VecDeque::new();

    for (_subpath, file_path) in &member.exports {
        let abs = member.root_dir.join(file_path);
        if abs.exists() {
            queue.push_back(abs);
        }
    }

    for (_cmd, file_path) in &member.bin {
        let abs = member.root_dir.join(file_path);
        if abs.exists() {
            queue.push_back(abs);
        }
    }

    if let Some(ref entry) = member.entry {
        let abs = member.root_dir.join(entry);
        if abs.exists() {
            queue.push_back(abs);
        }
    }

    while let Some(file) = queue.pop_front() {
        let canonical = std::fs::canonicalize(&file).unwrap_or(file.clone());
        if !visited.insert(canonical.clone()) {
            continue;
        }

        let imports = extract_local_imports(&canonical);
        for imp in imports {
            let resolved = resolve_relative_import(&canonical, &imp);
            if let Some(resolved) = resolved {
                if resolved.exists() && !visited.contains(&resolved) {
                    queue.push_back(resolved);
                }
            }
        }
    }

    Ok(visited.into_iter().collect())
}

fn extract_local_imports(file: &Path) -> Vec<String> {
    let source = match std::fs::read_to_string(file) {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };

    

    let mut imports = Vec::new();
    let bytes = source.as_bytes();
    let is_word = |c: u8| c.is_ascii_alphanumeric() || c == b'_' || c == b'$';
    let quoted_after = |mut j: usize| -> Option<(String, usize)> {
        while j < bytes.len() && (bytes[j] == b' ' || bytes[j] == b'\t' || bytes[j] == b'(') { j += 1; }
        if j >= bytes.len() || (bytes[j] != b'"' && bytes[j] != b'\'') { return None; }
        let q = bytes[j];
        let start = j + 1;
        let mut k = start;
        while k < bytes.len() && bytes[k] != q { k += 1; }
        if k >= bytes.len() { return None; }
        Some((String::from_utf8_lossy(&bytes[start..k]).to_string(), k))
    };
    for kw in ["from", "import"] {
        let mut pos = 0usize;
        while let Some(rel) = source[pos..].find(kw) {
            let i = pos + rel;
            let before_ok = i == 0 || !is_word(bytes[i - 1]);
            let after = i + kw.len();
            let after_ok = after >= bytes.len() || !is_word(bytes[after]);
            if before_ok && after_ok {
                if let Some((spec, _)) = quoted_after(after) {
                    if spec.starts_with("./") || spec.starts_with("../") {
                        imports.push(spec);
                    }
                }
            }
            pos = i + kw.len();
        }
    }
    imports.sort();
    imports.dedup();
    imports
}

fn extract_import_specifier(line: &str) -> Option<String> {

    
    if !line.starts_with("import") && !line.starts_with("export") {
        return None;
    }
    if !line.contains("from") {
        return None;
    }

    let from_idx = line.find("from")?;
    let after_from = &line[from_idx + 4..];

    let quote_char = if after_from.contains('"') { '"' } else if after_from.contains('\'') { '\'' } else { return None };
    let start = after_from.find(quote_char)? + 1;
    let rest = &after_from[start..];
    let end = rest.find(quote_char)?;
    Some(rest[..end].to_string())
}

fn resolve_relative_import(referrer: &Path, specifier: &str) -> Option<PathBuf> {
    let dir = referrer.parent()?;
    let base = dir.join(specifier);

    
    if base.is_file() {
        return Some(base);
    }

    for ext in [".ts", ".tsx", ".js", ".jsx"] {
        let with_ext = base.with_extension(&ext[1..]);
        if with_ext.exists() {
            return Some(with_ext);
        }
    }

    if base.is_dir() {
        for index in ["index.ts", "index.tsx", "index.js"] {
            let idx = base.join(index);
            if idx.exists() {
                return Some(idx);
            }
        }
    }

    let as_str = base.to_string_lossy();
    if as_str.ends_with(".ts") || as_str.ends_with(".js") || as_str.ends_with(".tsx") || as_str.ends_with(".jsx") {
        if base.exists() {
            return Some(base);
        }
    }

    None
}

fn resolve_native_libs(member: &Member) -> HashMap<String, PathBuf> {
    let platform_key = current_platform_key();
    resolve_native_libs_for(member, &platform_key)
}

pub fn resolve_native_libs_for(member: &Member, platform_key: &str) -> HashMap<String, PathBuf> {
    let mut result = HashMap::new();
    for (name, platforms) in &member.native {
        if let Some(rel_path) = platforms.get(platform_key) {
            let path = member.root_dir.join(rel_path);
            if path.exists() {
                result.insert(name.clone(), path);
            }
        }
    }
    result
}

pub fn pack_member_for(member: &Member, platform: &str, arch: &str, platform_key: &str) -> anyhow::Result<Vec<u8>> {
    let build_result = build_member(member)?;

    let native_libs = resolve_native_libs_for(member, platform_key);
    let native_metadata: HashMap<String, String> = native_libs.iter().map(|(name, path)| {
        let rel = path.strip_prefix(&member.root_dir).unwrap_or(path)
            .to_string_lossy().replace('\\', "/");
        (name.clone(), rel)
    }).collect();

    let project_type = match member.kind {
        MemberKind::Run => "run", MemberKind::Rune => "rune", MemberKind::Web => "web",
        MemberKind::Lib => "lib", MemberKind::Tool => "tool",
        MemberKind::Test => "test", MemberKind::Gui => "gui", MemberKind::Tui => "tui",
    };

    let metadata = ekko_vfs::PackageMetadata {
        name: member.name.clone(), version: member.version.clone(),
        platform: platform.to_string(), arch: arch.to_string(),
        exports: member.exports.iter().map(|(k, v)| {
            (k.clone(), v.replace(".tsx", ".js").replace(".jsx", ".js").replace(".ts", ".js"))
        }).collect(),
        bin: member.bin.iter().map(|(k, v)| {
            (k.clone(), v.replace(".tsx", ".js").replace(".jsx", ".js").replace(".ts", ".js"))
        }).collect(),
        entry: member.entry.as_ref().map(|e| e.replace(".tsx", ".js").replace(".jsx", ".js").replace(".ts", ".js")),
        project_type: Some(project_type.to_string()),
        native: native_metadata.clone(),
        loading: "memory".to_string(), integrity: String::new(), signature: String::new(),
        ship: member.ship.clone(),
    };

    let mut writer = ekko_vfs::EklWriter::new(metadata);
    for entry in &build_result.files { writer.add_entry(&entry.relative_path, entry.content.clone()); }

    for (_, path) in &native_libs {
        let native_data = std::fs::read(path)
            .map_err(|e| anyhow::anyhow!("cannot read native lib '{}': {}", path.display(), e))?;
        let rel = path.strip_prefix(&member.root_dir).unwrap_or(path)
            .to_string_lossy().replace('\\', "/");
        writer.add_entry(rel, native_data);
    }

    
    if let Some(data) = ekko_json_for_pack(&member.root_dir) {
        writer.add_entry("ekko.json", data);
    }

    let lock_path = member.root_dir.join("ekko.lock");
    if lock_path.exists() {
        if let Ok(data) = std::fs::read(&lock_path) {
            writer.add_entry("ekko.lock", data);
        }
    }

    writer.build()
}

pub fn current_platform_key() -> String {
    let os = if cfg!(target_os = "windows") { "windows" }
        else if cfg!(target_os = "macos") { "macos" }
        else { "linux" };
    let arch = if cfg!(target_arch = "aarch64") { "arm64" } else { "x64" };
    format!("{}-{}", os, arch)
}

pub fn current_platform() -> (&'static str, &'static str) {
    let os = if cfg!(target_os = "windows") { "windows" }
        else if cfg!(target_os = "macos") { "macos" }
        else { "linux" };
    let arch = if cfg!(target_arch = "aarch64") { "arm64" } else { "x64" };
    (os, arch)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_import_double_quotes() {
        let spec = extract_import_specifier(r#"import { foo } from "./bar.ts";"#);
        assert_eq!(spec, Some("./bar.ts".into()));
    }

    #[test]
    fn merge_root_imports_member_wins_and_merges() {
        let member = br#"{"name":"x","type":"lib","imports":{"a":"./local-a"}}"#;
        let mut root = HashMap::new();
        root.insert("a".to_string(), "@root/a".to_string()); 
        root.insert("b".to_string(), "@root/b".to_string()); 
        let out = merge_root_imports(member, &root);
        let v: serde_json::Value = serde_json::from_slice(&out).unwrap();
        assert_eq!(v["imports"]["a"], "./local-a"); 
        assert_eq!(v["imports"]["b"], "@root/b");   
        assert_eq!(v["name"], "x");                 
    }

    #[test]
    fn merge_root_imports_adds_section_when_absent() {
        let member = br#"{"name":"x","type":"lib"}"#;
        let mut root = HashMap::new();
        root.insert("react".to_string(), "@acme/react".to_string());
        let v: serde_json::Value = serde_json::from_slice(&merge_root_imports(member, &root)).unwrap();
        assert_eq!(v["imports"]["react"], "@acme/react");
    }

    #[test]
    fn merge_root_imports_noop_when_nothing_to_add() {
        
        let member = br#"{"name":"x"}"#.to_vec();
        assert_eq!(merge_root_imports(&member, &HashMap::new()), member);
        
        let member2 = br#"{"imports":{"a":"./a"}}"#.to_vec();
        let mut root = HashMap::new();
        root.insert("a".to_string(), "@root/a".to_string());
        assert_eq!(merge_root_imports(&member2, &root), member2);
    }

    #[test]
    fn extract_import_single_quotes() {
        let spec = extract_import_specifier("import { foo } from './bar.ts';");
        assert_eq!(spec, Some("./bar.ts".into()));
    }

    #[test]
    fn extract_export_from() {
        let spec = extract_import_specifier(r#"export { baz } from "../utils.ts";"#);
        assert_eq!(spec, Some("../utils.ts".into()));
    }

    #[test]
    fn extract_bare_specifier() {
        let spec = extract_import_specifier(r#"import { z } from "zod";"#);
        assert_eq!(spec, Some("zod".into()));
    }

    #[test]
    fn extract_no_from() {
        let spec = extract_import_specifier("import './side-effect.ts';");
        assert_eq!(spec, None); 
    }

    #[test]
    fn current_platform_key_format() {
        let key = current_platform_key();
        assert!(key.contains('-'));
        let parts: Vec<&str> = key.split('-').collect();
        assert_eq!(parts.len(), 2);
    }

    #[test]
    fn validate_test_member_rejected() {
        let member = Member {
            name: "test".into(),
            version: "1.0.0".into(),
            kind: MemberKind::Test,
            root_dir: PathBuf::from("/tmp"),
            exports: HashMap::new(),
            bin: HashMap::new(),
            ship: HashMap::new(),
            build: HashMap::new(),
            native: HashMap::new(),
            loading: HashMap::new(),
            entry: None,
            package_include: Vec::new(),
            package_exclude: Vec::new(),
            description: None, license: None, repository: None, readme: None, min_ekko: None, max_ekko: None, publish: "public".into(), storage: "public".into(),
            peer: HashMap::new(), permissions: None,
        };
        let err = validate_member(&member).unwrap_err();
        assert!(err.to_string().contains("test members cannot be packaged"));
    }

    #[test]
    fn validate_lib_needs_exports() {
        let member = Member {
            name: "lib".into(),
            version: "1.0.0".into(),
            kind: MemberKind::Lib,
            root_dir: PathBuf::from("/tmp"),
            exports: HashMap::new(),
            bin: HashMap::new(),
            ship: HashMap::new(),
            build: HashMap::new(),
            native: HashMap::new(),
            loading: HashMap::new(),
            entry: None,
            package_include: Vec::new(),
            package_exclude: Vec::new(),
            description: None, license: None, repository: None, readme: None, min_ekko: None, max_ekko: None, publish: "public".into(), storage: "public".into(),
            peer: HashMap::new(), permissions: None,
        };
        let err = validate_member(&member).unwrap_err();
        assert!(err.to_string().contains("exports"));
    }

    #[test]
    fn build_and_pack_fixture() {
        let tmp = std::env::temp_dir().join("ekko_build_test");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(tmp.join("src")).unwrap();

        std::fs::write(tmp.join("src/index.ts"), "export const x: number = 42;\nexport function add(a: number, b: number): number { return a + b; }").unwrap();
        std::fs::write(tmp.join("src/utils.ts"), "import { x } from './index.ts';\nexport const doubled = x * 2;").unwrap();

        let member = Member {
            name: "test-build".into(),
            version: "1.0.0".into(),
            kind: MemberKind::Lib,
            root_dir: tmp.clone(),
            exports: HashMap::from([
                (".".into(), "./src/index.ts".into()),
                ("./utils".into(), "./src/utils.ts".into()),
            ]),
            bin: HashMap::new(),
            ship: HashMap::new(),
            build: HashMap::new(),
            native: HashMap::new(),
            loading: HashMap::new(),
            entry: None,
            package_include: Vec::new(),
            package_exclude: Vec::new(),
            description: None, license: None, repository: None, readme: None, min_ekko: None, max_ekko: None, publish: "public".into(), storage: "public".into(),
            peer: HashMap::new(), permissions: None,
        };

        let result = build_member(&member).unwrap();
        assert!(result.files.len() >= 2);

        let index = result.files.iter().find(|f| f.relative_path == "src/index.js").unwrap();
        let content = String::from_utf8_lossy(&index.content);
        assert!(content.contains("42"));
        assert!(!content.contains("number")); 

        let (os, arch) = current_platform();
        let ekl_data = pack_member(&member, os, arch).unwrap();
        assert!(ekl_data.len() > 64); 

        let pkg = ekko_vfs::EklPackage::from_bytes(ekl_data).unwrap();
        assert_eq!(pkg.metadata.name, "test-build");
        assert_eq!(pkg.metadata.version, "1.0.0");
        let src = pkg.read_str("src/index.js").unwrap();
        assert!(src.contains("42"));

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn pack_includes_ekko_json() {
        let tmp = std::env::temp_dir().join("ekko_pack_config_test");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(tmp.join("src")).unwrap();

        std::fs::write(tmp.join("ekko.json"), r#"{"name":"test","version":"1.0.0","type":"lib","exports":{".":"./src/index.ts"}}"#).unwrap();
        std::fs::write(tmp.join("src/index.ts"), "export const x = 1;").unwrap();

        let member = Member {
            name: "test".into(),
            version: "1.0.0".into(),
            kind: MemberKind::Lib,
            root_dir: tmp.clone(),
            exports: HashMap::from([(".".into(), "./src/index.ts".into())]),
            bin: HashMap::new(),
            ship: HashMap::new(),
            build: HashMap::new(),
            native: HashMap::new(),
            loading: HashMap::new(),
            entry: None,
            package_include: Vec::new(),
            package_exclude: Vec::new(),
            description: None, license: None, repository: None, readme: None, min_ekko: None, max_ekko: None, publish: "public".into(), storage: "public".into(),
            peer: HashMap::new(), permissions: None,
        };

        let (os, arch) = current_platform();
        let ekl_data = pack_member(&member, os, arch).unwrap();
        let pkg = ekko_vfs::EklPackage::from_bytes(ekl_data).unwrap();
        assert!(pkg.read_str("ekko.json").is_some(), "ekko.json must be in the archive");

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn pack_includes_readme_any_name() {
        let tmp = std::env::temp_dir().join("ekko_pack_readme_test");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(tmp.join("src")).unwrap();
        std::fs::write(tmp.join("src/index.ts"), "export const x = 1;").unwrap();
        std::fs::write(tmp.join("DOC.md"), "# Hello\nPackage description.").unwrap();

        let mut member = Member {
            name: "test".into(), version: "1.0.0".into(), kind: MemberKind::Lib, root_dir: tmp.clone(),
            exports: HashMap::from([(".".into(), "./src/index.ts".into())]),
            bin: HashMap::new(), ship: HashMap::new(), build: HashMap::new(), native: HashMap::new(),
            loading: HashMap::new(), entry: None, package_include: Vec::new(), package_exclude: Vec::new(),
            description: None, license: None, repository: None, readme: Some("DOC.md".into()), min_ekko: None, max_ekko: None,
            publish: "public".into(), storage: "public".into(), peer: HashMap::new(), permissions: None,
        };

        let (os, arch) = current_platform();
        let ekl_data = pack_member(&member, os, arch).unwrap();
        let pkg = ekko_vfs::EklPackage::from_bytes(ekl_data).unwrap();
        let doc = pkg.read_str("DOC.md");
        assert!(doc.is_some(), "readme (DOC.md) must be packed into the .ekl");
        assert!(doc.unwrap().contains("Package description"));

        member.readme = Some("MISSING.md".into());
        assert!(pack_member(&member, os, arch).is_err(), "missing readme file must fail the pack");

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn pack_with_package_includes() {
        let tmp = std::env::temp_dir().join("ekko_pack_include_test");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(tmp.join("src")).unwrap();
        std::fs::create_dir_all(tmp.join("handlers")).unwrap();
        std::fs::create_dir_all(tmp.join("static")).unwrap();

        std::fs::write(tmp.join("ekko.json"), "{}").unwrap();
        std::fs::write(tmp.join("src/main.ts"), "console.log('hi');").unwrap();
        std::fs::write(tmp.join("handlers/auth.ts"), "export function login() {}").unwrap();
        std::fs::write(tmp.join("handlers/admin.ts"), "export function stats() {}").unwrap();
        std::fs::write(tmp.join("static/logo.png"), &[0x89, 0x50, 0x4E, 0x47]).unwrap();

        let member = Member {
            name: "test-include".into(),
            version: "1.0.0".into(),
            kind: MemberKind::Run,
            root_dir: tmp.clone(),
            exports: HashMap::new(),
            bin: HashMap::new(),
            ship: HashMap::new(),
            build: HashMap::new(),
            native: HashMap::new(),
            loading: HashMap::new(),
            entry: Some("src/main.ts".into()),
            package_include: vec!["handlers/**/*".into(), "static/**/*".into()],
            package_exclude: vec![],
            description: None, license: None, repository: None, readme: None, min_ekko: None, max_ekko: None, publish: "public".into(), storage: "public".into(),
            peer: HashMap::new(), permissions: None,
        };

        let result = build_member(&member).unwrap();
        let paths: Vec<&str> = result.files.iter().map(|f| f.relative_path.as_str()).collect();
        assert!(paths.contains(&"src/main.js"));
        assert!(paths.contains(&"handlers/auth.js"));
        assert!(paths.contains(&"handlers/admin.js"));
        assert!(paths.contains(&"static/logo.png"));

        let logo = result.files.iter().find(|f| f.relative_path == "static/logo.png").unwrap();
        assert_eq!(&logo.content[..4], &[0x89, 0x50, 0x4E, 0x47]);

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn pack_with_package_excludes() {
        let tmp = std::env::temp_dir().join("ekko_pack_exclude_test");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(tmp.join("handlers")).unwrap();

        std::fs::write(tmp.join("ekko.json"), "{}").unwrap();
        std::fs::write(tmp.join("src/main.ts"), "console.log('hi');").unwrap_or_default();
        std::fs::create_dir_all(tmp.join("src")).unwrap();
        std::fs::write(tmp.join("src/main.ts"), "console.log('hi');").unwrap();
        std::fs::write(tmp.join("handlers/auth.ts"), "export function login() {}").unwrap();
        std::fs::write(tmp.join("handlers/auth.test.ts"), "// test file").unwrap();

        let member = Member {
            name: "test-exclude".into(),
            version: "1.0.0".into(),
            kind: MemberKind::Run,
            root_dir: tmp.clone(),
            exports: HashMap::new(),
            bin: HashMap::new(),
            ship: HashMap::new(),
            build: HashMap::new(),
            native: HashMap::new(),
            loading: HashMap::new(),
            entry: Some("src/main.ts".into()),
            package_include: vec!["handlers/**/*".into()],
            package_exclude: vec!["**/*.test.ts".into()],
            description: None, license: None, repository: None, readme: None, min_ekko: None, max_ekko: None, publish: "public".into(), storage: "public".into(),
            peer: HashMap::new(), permissions: None,
        };

        let result = build_member(&member).unwrap();
        let paths: Vec<&str> = result.files.iter().map(|f| f.relative_path.as_str()).collect();
        assert!(paths.contains(&"handlers/auth.js"));
        assert!(!paths.iter().any(|p| p.contains("test")));

        let _ = std::fs::remove_dir_all(&tmp);
    }
}
