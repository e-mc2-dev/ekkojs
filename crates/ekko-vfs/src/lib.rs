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
use std::io::{Cursor, Read as IoRead, Write as IoWrite};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const MAGIC: &[u8; 4] = b"EKKO";
pub const FORMAT_VERSION: u16 = 1;
pub const HEADER_SIZE: usize = 64;



#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageMetadata {
    pub name: String,
    pub version: String,
    pub platform: String,
    pub arch: String,
    pub exports: HashMap<String, String>,
    #[serde(default)]
    pub bin: HashMap<String, String>,
    #[serde(default)]
    pub entry: Option<String>,
    #[serde(default)]
    pub project_type: Option<String>,
    #[serde(default)]
    pub native: HashMap<String, String>,
    #[serde(default = "default_loading")]
    pub loading: String,
    #[serde(default)]
    pub integrity: String,
    #[serde(default)]
    pub signature: String,
    #[serde(default)]
    pub ship: HashMap<String, String>,
}


fn default_loading() -> String {
    "memory".to_string()
}

#[derive(Debug, Clone)]
pub struct TocEntry {
    pub path: String,
    pub offset: u64,
    pub size: u32,
    pub compressed_size: u32,
    pub hash: [u8; 32],
}

#[derive(Debug)]
pub struct EklPackage {
    pub metadata: PackageMetadata,
    toc: Vec<TocEntry>,
    path_index: HashMap<String, usize>,
    data: Arc<Vec<u8>>,
    data_start: u64,
}

pub struct VfsRegistry {
    packages: DashMap<String, Arc<EklPackage>>,
    source_cache: DashMap<String, Arc<String>>,

    file_cache: DashMap<String, Arc<Vec<u8>>>,
}


const MAX_CACHED_FILE: usize = 512 * 1024;



#[derive(Debug, Clone, Copy)]
struct EklHeader {
    version: u16,
    flags: u16,
    entry_count: u32,
    toc_offset: u64,
    toc_size: u64,
    metadata_offset: u64,
    metadata_size: u64,
}

impl EklHeader {
    
    fn parse(data: &[u8]) -> anyhow::Result<Self> {
        if data.len() < HEADER_SIZE {
            anyhow::bail!("file too small for .ekl header ({} bytes)", data.len());
        }
        if &data[0..4] != MAGIC {
            anyhow::bail!("invalid .ekl magic: expected 'EKKO', got {:?}", &data[0..4]);
        }

        let version = u16::from_le_bytes([data[4], data[5]]);
        let flags = u16::from_le_bytes([data[6], data[7]]);
        let entry_count = u32::from_le_bytes([data[8], data[9], data[10], data[11]]);
        let toc_offset = u64::from_le_bytes(data[12..20].try_into().unwrap());
        let toc_size = u64::from_le_bytes(data[20..28].try_into().unwrap());
        let metadata_offset = u64::from_le_bytes(data[28..36].try_into().unwrap());
        let metadata_size = u64::from_le_bytes(data[36..44].try_into().unwrap());

        if version > FORMAT_VERSION {
            anyhow::bail!("unsupported .ekl format version {} (max {})", version, FORMAT_VERSION);
        }

        Ok(Self { version, flags, entry_count, toc_offset, toc_size, metadata_offset, metadata_size })
    }

    
    fn write(&self, buf: &mut Vec<u8>) {
        buf.extend_from_slice(MAGIC);
        buf.extend_from_slice(&self.version.to_le_bytes());
        buf.extend_from_slice(&self.flags.to_le_bytes());
        buf.extend_from_slice(&self.entry_count.to_le_bytes());
        buf.extend_from_slice(&self.toc_offset.to_le_bytes());
        buf.extend_from_slice(&self.toc_size.to_le_bytes());
        buf.extend_from_slice(&self.metadata_offset.to_le_bytes());
        buf.extend_from_slice(&self.metadata_size.to_le_bytes());
        buf.resize(HEADER_SIZE, 0);
    }
}



#[derive(Serialize, Deserialize)]
struct TocEntryJson {
    path: String,
    offset: u64,
    size: u32,
    compressed_size: u32,
    hash: String,
}

impl From<&TocEntry> for TocEntryJson {
    fn from(e: &TocEntry) -> Self {
        Self {
            path: e.path.clone(),
            offset: e.offset,
            size: e.size,
            compressed_size: e.compressed_size,
            hash: hex_encode(&e.hash),
        }
    }
}

impl TocEntryJson {
    
    fn to_toc_entry(&self) -> anyhow::Result<TocEntry> {
        let hash = hex_decode(&self.hash)?;
        Ok(TocEntry {
            path: self.path.clone(),
            offset: self.offset,
            size: self.size,
            compressed_size: self.compressed_size,
            hash,
        })
    }
}



impl EklPackage {
    
    pub fn from_file(path: &Path) -> anyhow::Result<Self> {
        let data = std::fs::read(path)?;
        Self::from_bytes(data)
    }

    
    pub fn from_bytes(data: Vec<u8>) -> anyhow::Result<Self> {
        let header = EklHeader::parse(&data)?;

        let metadata_start = header.metadata_offset as usize;
        let metadata_end = metadata_start + header.metadata_size as usize;
        if metadata_end > data.len() {
            anyhow::bail!("metadata section extends past end of file");
        }
        let metadata_compressed = &data[metadata_start..metadata_end];
        let metadata_json = zstd::decode_all(Cursor::new(metadata_compressed))?;
        let metadata: PackageMetadata = serde_json::from_slice(&metadata_json)?;

        let toc_start = header.toc_offset as usize;
        let toc_end = toc_start + header.toc_size as usize;
        if toc_end > data.len() {
            anyhow::bail!("TOC section extends past end of file");
        }
        let toc_compressed = &data[toc_start..toc_end];
        let toc_json = zstd::decode_all(Cursor::new(toc_compressed))?;
        let toc_entries: Vec<TocEntryJson> = serde_json::from_slice(&toc_json)?;

        let mut toc = Vec::with_capacity(toc_entries.len());
        let mut path_index = HashMap::with_capacity(toc_entries.len());
        for (i, entry) in toc_entries.iter().enumerate() {
            toc.push(entry.to_toc_entry()?);
            path_index.insert(entry.path.clone(), i);
        }

        let data_start = HEADER_SIZE as u64;

        Ok(Self {
            metadata,
            toc,
            path_index,
            data: Arc::new(data),
            data_start,
        })
    }

    
    pub fn read(&self, path: &str) -> Option<Vec<u8>> {
        let idx = *self.path_index.get(path)?;
        let entry = &self.toc[idx];
        let start = (self.data_start + entry.offset) as usize;
        let end = start + entry.compressed_size as usize;
        if end > self.data.len() {
            return None;
        }
        let compressed = &self.data[start..end];
        zstd::decode_all(Cursor::new(compressed)).ok()
    }

    
    pub fn read_verified(&self, path: &str) -> anyhow::Result<Vec<u8>> {
        let idx = *self.path_index.get(path)
            .ok_or_else(|| anyhow::anyhow!("entry '{}' not found in .ekl", path))?;
        let entry = &self.toc[idx];
        let start = (self.data_start + entry.offset) as usize;
        let end = start + entry.compressed_size as usize;
        if end > self.data.len() {
            anyhow::bail!("entry '{}' data extends past end of archive", path);
        }
        let compressed = &self.data[start..end];
        let decompressed = zstd::decode_all(Cursor::new(compressed))?;

        let mut hasher = Sha256::new();
        hasher.update(&decompressed);
        let hash: [u8; 32] = hasher.finalize().into();
        if hash != entry.hash {
            anyhow::bail!(
                "integrity check failed for '{}': expected {}, got {}",
                path, hex_encode(&entry.hash), hex_encode(&hash)
            );
        }

        Ok(decompressed)
    }

    
    pub fn read_str(&self, path: &str) -> Option<String> {
        self.read(path).and_then(|b| String::from_utf8(b).ok())
    }

    
    pub fn resolve_export(&self, subpath: &str) -> Option<&str> {
        self.metadata.exports.get(subpath).map(|s| s.as_str())
    }

    
    pub fn resolve_export_wildcard(&self, subpath: &str) -> Option<String> {
        for (pattern, target) in &self.metadata.exports {
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

    
    pub fn extract_native(&self, cache_dir: &Path, lib_name: &str) -> anyhow::Result<PathBuf> {
        let native_path = self.metadata.native.get(lib_name)
            .ok_or_else(|| anyhow::anyhow!("no native lib '{}' in package '{}' (available: {:?})",
                lib_name, self.metadata.name, self.metadata.native.keys().collect::<Vec<_>>()))?;

        let target = cache_dir
            .join("native")
            .join(&self.metadata.name)
            .join(&self.metadata.version)
            .join(format!("{}-{}", self.metadata.platform, self.metadata.arch))
            .join(native_path);

        if target.exists() {
            return Ok(target);
        }

        let data = self.read_verified(native_path)?;
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(&target, &data)?;
        Ok(target)
    }

    
    pub fn entries(&self) -> &[TocEntry] {
        &self.toc
    }

    
    pub fn entry_count(&self) -> usize {
        self.toc.len()
    }
}



impl VfsRegistry {
    
    pub fn new() -> Self {
        Self {
            packages: DashMap::new(),
            source_cache: DashMap::new(),
            file_cache: DashMap::new(),
        }
    }

    
    pub fn load_package(&self, path: &Path) -> anyhow::Result<()> {
        let pkg = EklPackage::from_file(path)?;
        let name = pkg.metadata.name.clone();
        self.packages.insert(name, Arc::new(pkg));
        Ok(())
    }

    
    pub fn load_package_from_bytes(&self, data: Vec<u8>) -> anyhow::Result<()> {
        let pkg = EklPackage::from_bytes(data)?;
        let name = pkg.metadata.name.clone();
        self.packages.insert(name, Arc::new(pkg));
        Ok(())
    }

    
    pub fn resolve(&self, specifier: &str) -> Option<(Arc<EklPackage>, String)> {
        let (pkg_name, subpath) = split_specifier(specifier);
        let pkg = self.packages.get(&pkg_name)?;
        let file_path = pkg.resolve_export(&subpath)
            .or_else(|| pkg.resolve_export_wildcard(&subpath).as_deref().map(|_| ""))
            .map(|s| s.to_string());

        if file_path.as_deref() == Some("") {
            let wc = pkg.resolve_export_wildcard(&subpath)?;
            return Some((pkg.clone(), wc));
        }

        let file_path = file_path?;
        Some((pkg.clone(), file_path))
    }

    
    pub fn read_module(&self, pkg_name: &str, path: &str) -> Option<Arc<String>> {
        let cache_key = format!("{}:{}", pkg_name, path);
        if let Some(cached) = self.source_cache.get(&cache_key) {
            return Some(cached.clone());
        }
        let pkg = self.packages.get(pkg_name)?;
        let source = pkg.read_str(path)?;
        let arc = Arc::new(source);
        self.source_cache.insert(cache_key, arc.clone());
        Some(arc)
    }


    pub fn read_file(&self, pkg_name: &str, path: &str) -> Option<Vec<u8>> {
        let key = format!("{}:{}", pkg_name, path);
        if let Some(c) = self.file_cache.get(&key) {
            return Some((**c).clone());
        }
        let bytes = self.packages.get(pkg_name)?.read(path)?;

        if bytes.len() <= MAX_CACHED_FILE {
            self.file_cache.insert(key, Arc::new(bytes.clone()));
        }
        Some(bytes)
    }

    
    pub fn has_path(&self, pkg_name: &str, path: &str) -> bool {
        match self.packages.get(pkg_name) {
            None => false,
            Some(p) => {
                if p.read(path).is_some() { return true; }
                let pfx = format!("{}/", path.trim_end_matches('/'));
                p.entries().iter().any(|e| e.path.starts_with(&pfx))
            }
        }
    }

    
    pub fn file_size(&self, pkg_name: &str, path: &str) -> Option<u64> {
        self.packages.get(pkg_name)
            .and_then(|p| p.entries().iter().find(|e| e.path == path).map(|e| e.size as u64))
    }

    
    pub fn list_paths(&self, pkg_name: &str, prefix: &str) -> Vec<String> {
        self.packages.get(pkg_name).map(|p| {
            p.entries().iter()
                .map(|e| e.path.clone())
                .filter(|pth| prefix.is_empty() || pth.starts_with(prefix))
                .collect()
        }).unwrap_or_default()
    }

    
    pub fn has_package(&self, name: &str) -> bool {
        self.packages.contains_key(name)
    }

    
    pub fn get_package(&self, name: &str) -> Option<Arc<EklPackage>> {
        self.packages.get(name).map(|r| r.clone())
    }

    
    pub fn package_count(&self) -> usize {
        self.packages.len()
    }
}

impl Default for VfsRegistry {
    fn default() -> Self {
        Self::new()
    }
}



pub struct EklWriter {
    metadata: PackageMetadata,
    entries: Vec<(String, Vec<u8>)>,
}

impl EklWriter {
    
    pub fn new(metadata: PackageMetadata) -> Self {
        Self { metadata, entries: Vec::new() }
    }

    
    pub fn add_entry(&mut self, path: impl Into<String>, data: Vec<u8>) {
        self.entries.push((path.into(), data));
    }

    
    pub fn build(self) -> anyhow::Result<Vec<u8>> {
        let mut data_section = Vec::new();
        let mut toc_entries: Vec<TocEntryJson> = Vec::new();

        for (path, content) in &self.entries {
            let mut hasher = Sha256::new();
            hasher.update(content);
            let hash: [u8; 32] = hasher.finalize().into();

            let compressed = zstd::encode_all(Cursor::new(content), 3)?;
            let offset = data_section.len() as u64;

            toc_entries.push(TocEntryJson {
                path: path.clone(),
                offset,
                size: content.len() as u32,
                compressed_size: compressed.len() as u32,
                hash: hex_encode(&hash),
            });

            data_section.extend_from_slice(&compressed);
        }

        let toc_json = serde_json::to_vec(&toc_entries)?;
        let toc_compressed = zstd::encode_all(Cursor::new(&toc_json), 3)?;

        let metadata_json = serde_json::to_vec(&self.metadata)?;
        let metadata_compressed = zstd::encode_all(Cursor::new(&metadata_json), 3)?;

        
        let data_offset = HEADER_SIZE;
        let toc_offset = data_offset + data_section.len();
        let metadata_offset = toc_offset + toc_compressed.len();

        let header = EklHeader {
            version: FORMAT_VERSION,
            flags: 0,
            entry_count: toc_entries.len() as u32,
            toc_offset: toc_offset as u64,
            toc_size: toc_compressed.len() as u64,
            metadata_offset: metadata_offset as u64,
            metadata_size: metadata_compressed.len() as u64,
        };

        let mut output = Vec::new();
        header.write(&mut output);
        output.extend_from_slice(&data_section);
        output.extend_from_slice(&toc_compressed);
        output.extend_from_slice(&metadata_compressed);

        Ok(output)
    }
}




pub fn split_specifier(spec: &str) -> (String, String) {
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


fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}


fn hex_decode(s: &str) -> anyhow::Result<[u8; 32]> {
    if s.len() != 64 {
        anyhow::bail!("expected 64 hex chars, got {}", s.len());
    }
    let mut out = [0u8; 32];
    for i in 0..32 {
        out[i] = u8::from_str_radix(&s[i * 2..i * 2 + 2], 16)?;
    }
    Ok(out)
}



#[cfg(test)]
mod tests {
    use super::*;

    fn test_metadata() -> PackageMetadata {
        PackageMetadata {
            name: "test-pkg".into(),
            version: "1.0.0".into(),
            platform: "any".into(),
            arch: "any".into(),
            exports: HashMap::from([
                (".".into(), "src/index.js".into()),
                ("./utils".into(), "src/utils.js".into()),
            ]),
            bin: HashMap::new(),
            entry: None,
            project_type: None,
            native: HashMap::new(),
            loading: "memory".into(),
            integrity: String::new(),
            signature: String::new(),
            ship: HashMap::new(),
        }
    }

    #[test]
    fn roundtrip_write_read() {
        let metadata = test_metadata();
        let mut writer = EklWriter::new(metadata);
        writer.add_entry("src/index.js", b"export const x = 1;".to_vec());
        writer.add_entry("src/utils.js", b"export function add(a, b) { return a + b; }".to_vec());

        let ekl_data = writer.build().unwrap();
        let pkg = EklPackage::from_bytes(ekl_data).unwrap();

        assert_eq!(pkg.metadata.name, "test-pkg");
        assert_eq!(pkg.metadata.version, "1.0.0");
        assert_eq!(pkg.entry_count(), 2);
    }

    #[test]
    fn read_entries() {
        let metadata = test_metadata();
        let mut writer = EklWriter::new(metadata);
        writer.add_entry("src/index.js", b"export const x = 42;".to_vec());
        writer.add_entry("src/utils.js", b"export const y = 99;".to_vec());

        let ekl_data = writer.build().unwrap();
        let pkg = EklPackage::from_bytes(ekl_data).unwrap();

        assert_eq!(pkg.read_str("src/index.js").unwrap(), "export const x = 42;");
        assert_eq!(pkg.read_str("src/utils.js").unwrap(), "export const y = 99;");
        assert!(pkg.read_str("nonexistent.js").is_none());
    }

    #[test]
    fn read_verified_integrity() {
        let metadata = test_metadata();
        let mut writer = EklWriter::new(metadata);
        writer.add_entry("src/index.js", b"hello world".to_vec());

        let ekl_data = writer.build().unwrap();
        let pkg = EklPackage::from_bytes(ekl_data).unwrap();

        let content = pkg.read_verified("src/index.js").unwrap();
        assert_eq!(content, b"hello world");
    }

    #[test]
    fn resolve_export_exact() {
        let metadata = test_metadata();
        let mut writer = EklWriter::new(metadata);
        writer.add_entry("src/index.js", b"x".to_vec());
        writer.add_entry("src/utils.js", b"y".to_vec());

        let ekl_data = writer.build().unwrap();
        let pkg = EklPackage::from_bytes(ekl_data).unwrap();

        assert_eq!(pkg.resolve_export("."), Some("src/index.js"));
        assert_eq!(pkg.resolve_export("./utils"), Some("src/utils.js"));
        assert_eq!(pkg.resolve_export("./nope"), None);
    }

    #[test]
    fn resolve_export_wildcard() {
        let metadata = PackageMetadata {
            exports: HashMap::from([
                (".".into(), "src/index.js".into()),
                ("./components/*".into(), "src/components/*.js".into()),
            ]),
            ..test_metadata()
        };
        let mut writer = EklWriter::new(metadata);
        writer.add_entry("src/index.js", b"x".to_vec());

        let ekl_data = writer.build().unwrap();
        let pkg = EklPackage::from_bytes(ekl_data).unwrap();

        assert_eq!(
            pkg.resolve_export_wildcard("./components/Button"),
            Some("src/components/Button.js".into())
        );
    }

    #[test]
    fn registry_load_and_resolve() {
        let metadata = test_metadata();
        let mut writer = EklWriter::new(metadata);
        writer.add_entry("src/index.js", b"export const x = 1;".to_vec());
        writer.add_entry("src/utils.js", b"export const y = 2;".to_vec());

        let ekl_data = writer.build().unwrap();
        let registry = VfsRegistry::new();
        registry.load_package_from_bytes(ekl_data).unwrap();

        assert!(registry.has_package("test-pkg"));
        assert_eq!(registry.package_count(), 1);

        let (pkg, file_path) = registry.resolve("test-pkg").unwrap();
        assert_eq!(file_path, "src/index.js");
        assert_eq!(pkg.metadata.name, "test-pkg");

        let (_, file_path) = registry.resolve("test-pkg/utils").unwrap();
        assert_eq!(file_path, "src/utils.js");
    }

    #[test]
    fn registry_read_module_cached() {
        let metadata = test_metadata();
        let mut writer = EklWriter::new(metadata);
        writer.add_entry("src/index.js", b"export const x = 1;".to_vec());

        let ekl_data = writer.build().unwrap();
        let registry = VfsRegistry::new();
        registry.load_package_from_bytes(ekl_data).unwrap();

        let src1 = registry.read_module("test-pkg", "src/index.js").unwrap();
        let src2 = registry.read_module("test-pkg", "src/index.js").unwrap();
        assert_eq!(*src1, "export const x = 1;");
        assert!(Arc::ptr_eq(&src1, &src2));
    }

    #[test]
    fn registry_read_file_caches_small() {
        let mut writer = EklWriter::new(test_metadata());
        writer.add_entry("static/a.txt", b"hello-vfs".to_vec());
        let reg = VfsRegistry::new();
        reg.load_package_from_bytes(writer.build().unwrap()).unwrap();
        assert_eq!(reg.read_file("test-pkg", "static/a.txt").unwrap(), b"hello-vfs");
        assert!(reg.file_cache.contains_key("test-pkg:static/a.txt")); 
        assert_eq!(reg.read_file("test-pkg", "static/a.txt").unwrap(), b"hello-vfs"); 
        assert!(reg.read_file("test-pkg", "missing").is_none());
    }

    #[test]
    fn native_extraction() {
        let metadata = PackageMetadata {
            native: HashMap::from([("_".into(), "native/libtest.so".into())]),
            platform: "linux".into(),
            arch: "x64".into(),
            ..test_metadata()
        };
        let mut writer = EklWriter::new(metadata);
        writer.add_entry("src/index.js", b"x".to_vec());
        writer.add_entry("native/libtest.so", b"\x7fELF_fake_binary_content".to_vec());

        let ekl_data = writer.build().unwrap();
        let pkg = EklPackage::from_bytes(ekl_data).unwrap();

        let tmp = std::env::temp_dir().join("ekko_vfs_test_native");
        let _ = std::fs::remove_dir_all(&tmp);
        let native_path = pkg.extract_native(&tmp, "_").unwrap();

        assert!(native_path.exists());
        let content = std::fs::read(&native_path).unwrap();
        assert_eq!(content, b"\x7fELF_fake_binary_content");

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn header_magic_validation() {
        let bad_data = vec![0u8; 64];
        let err = EklPackage::from_bytes(bad_data).unwrap_err();
        assert!(err.to_string().contains("invalid .ekl magic"));
    }

    #[test]
    fn header_too_small() {
        let err = EklPackage::from_bytes(vec![0u8; 10]).unwrap_err();
        assert!(err.to_string().contains("too small"));
    }

    #[test]
    fn binary_content_roundtrip() {
        let metadata = test_metadata();
        let binary_data: Vec<u8> = (0..256).map(|i| i as u8).collect();
        let mut writer = EklWriter::new(metadata);
        writer.add_entry("src/index.js", b"js code".to_vec());
        writer.add_entry("assets/image.bin", binary_data.clone());

        let ekl_data = writer.build().unwrap();
        let pkg = EklPackage::from_bytes(ekl_data).unwrap();

        assert_eq!(pkg.read("assets/image.bin").unwrap(), binary_data);
    }

    #[test]
    fn large_file_roundtrip() {
        let metadata = test_metadata();
        let large_data: Vec<u8> = (0..100_000).map(|i| (i % 256) as u8).collect();
        let mut writer = EklWriter::new(metadata);
        writer.add_entry("src/index.js", large_data.clone());

        let ekl_data = writer.build().unwrap();
        assert!(ekl_data.len() < large_data.len()); 

        let pkg = EklPackage::from_bytes(ekl_data).unwrap();
        assert_eq!(pkg.read("src/index.js").unwrap(), large_data);
    }

    #[test]
    fn split_specifier_scoped() {
        let (pkg, sub) = split_specifier("@acme/core/models");
        assert_eq!(pkg, "@acme/core");
        assert_eq!(sub, "./models");
    }

    #[test]
    fn split_specifier_scoped_no_sub() {
        let (pkg, sub) = split_specifier("@acme/core");
        assert_eq!(pkg, "@acme/core");
        assert_eq!(sub, ".");
    }

    #[test]
    fn split_specifier_unscoped() {
        let (pkg, sub) = split_specifier("lodash/merge");
        assert_eq!(pkg, "lodash");
        assert_eq!(sub, "./merge");
    }

    #[test]
    fn split_specifier_bare() {
        let (pkg, sub) = split_specifier("zod");
        assert_eq!(pkg, "zod");
        assert_eq!(sub, ".");
    }

    #[test]
    fn file_roundtrip() {
        let metadata = test_metadata();
        let mut writer = EklWriter::new(metadata);
        writer.add_entry("src/index.js", b"export default 42;".to_vec());

        let ekl_data = writer.build().unwrap();

        let tmp = std::env::temp_dir().join("ekko_vfs_test_file_rt.ekl");
        std::fs::write(&tmp, &ekl_data).unwrap();

        let pkg = EklPackage::from_file(&tmp).unwrap();
        assert_eq!(pkg.read_str("src/index.js").unwrap(), "export default 42;");

        let _ = std::fs::remove_file(&tmp);
    }

    #[test]
    fn many_entries() {
        let metadata = test_metadata();
        let mut writer = EklWriter::new(metadata);
        for i in 0..100 {
            writer.add_entry(format!("src/module_{}.js", i), format!("export const x = {};", i).into_bytes());
        }

        let ekl_data = writer.build().unwrap();
        let pkg = EklPackage::from_bytes(ekl_data).unwrap();
        assert_eq!(pkg.entry_count(), 100);

        assert_eq!(pkg.read_str("src/module_0.js").unwrap(), "export const x = 0;");
        assert_eq!(pkg.read_str("src/module_99.js").unwrap(), "export const x = 99;");
        assert_eq!(pkg.read_str("src/module_50.js").unwrap(), "export const x = 50;");
    }
}
