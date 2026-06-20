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

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Account {
    pub name: String,
    pub url: String,
    pub token: Option<String>,
    pub cert_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct RegistryConfig {
    
    pub url: String,
    
    pub token: Option<String>,
    
    pub accounts: Vec<Account>,
    
    pub current: Option<String>,
}

impl Default for RegistryConfig {
    fn default() -> Self {

        Self { url: "https://bifrost.ekkojs.com".to_string(), token: None, accounts: Vec::new(), current: None }
    }
}

impl RegistryConfig {
    
    pub fn active_account(&self) -> Option<&Account> {
        let cur = self.current.as_ref()?;
        self.accounts.iter().find(|a| &a.name == cur)
    }
    
    pub fn effective_url(&self) -> String {
        match self.active_account() {
            Some(a) if !a.url.is_empty() => a.url.clone(),
            _ => self.url.clone(),
        }
    }
    
    pub fn effective_token(&self) -> Option<String> {
        if let Ok(t) = std::env::var("PUBLISH_TOKEN") {
            if !t.is_empty() { return Some(t); }
        }
        if let Some(a) = self.active_account() {
            if a.token.is_some() { return a.token.clone(); }
        }
        self.token.clone()
    }
    
    pub fn effective_cert(&self) -> Option<String> {
        self.active_account().and_then(|a| a.cert_path.clone())
    }
    
    pub fn upsert_account(&mut self, name: &str, url: Option<&str>, token: Option<String>, cert: Option<String>) {
        if let Some(a) = self.accounts.iter_mut().find(|a| a.name == name) {
            if let Some(u) = url { if !u.is_empty() { a.url = u.to_string(); } }
            if token.is_some() { a.token = token; }
            if cert.is_some() { a.cert_path = cert; }
        } else {
            self.accounts.push(Account {
                name: name.to_string(),
                url: url.unwrap_or("").to_string(),
                token, cert_path: cert,
            });
        }
    }
    pub fn set_current(&mut self, name: Option<&str>) { self.current = name.map(|s| s.to_string()); }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct PackageSummary {
    pub name: String,
    pub description: String,
    pub license: String,
    pub latest: String,
    pub versions: Vec<VersionSummary>,
    pub authors: Vec<AuthorInfo>,
    #[serde(deserialize_with = "deserialize_string_or_number")]
    pub created_at: String,
    #[serde(deserialize_with = "deserialize_string_or_number")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AuthorInfo {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub email: String,
    #[serde(default)]
    pub pubkey: String,
}

impl Default for PackageSummary {
    fn default() -> Self {
        Self { name: String::new(), description: String::new(), license: String::new(), latest: String::new(), versions: Vec::new(), authors: Vec::new(), created_at: String::new(), updated_at: String::new() }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionSummary {
    pub version: String,
    #[serde(default, deserialize_with = "deserialize_string_or_number")]
    pub published_at: String,
    #[serde(default, deserialize_with = "deserialize_int_as_bool")]
    pub yanked: bool,
    #[serde(default)]
    pub signature_author: String,
    #[serde(default)]
    pub min_ekko_version: String,
    #[serde(default)]
    pub max_ekko_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionDetail {
    pub name: String,
    pub version: String,
    #[serde(default, deserialize_with = "deserialize_string_or_number")]
    pub published_at: String,
    #[serde(default, deserialize_with = "deserialize_int_as_bool")]
    pub yanked: bool,
    pub min_ekko_version: String,
    #[serde(default)]
    pub max_ekko_version: String,
    pub ship: HashMap<String, String>,
    pub exports: HashMap<String, String>,
    pub bin: HashMap<String, String>,
    #[serde(default, deserialize_with = "deserialize_int_as_bool")]
    pub has_native: bool,
    pub platforms: Vec<PlatformInfo>,
    #[serde(default)]
    pub signature_author: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformInfo {
    pub platform: String,
    pub arch: String,

    
    #[serde(default)]
    pub size: u64,
    #[serde(default)]
    pub integrity: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub latest_version: String,
    #[serde(default, deserialize_with = "deserialize_string_or_number")]
    pub updated_at: String,
}

fn deserialize_int_as_bool<'de, D: serde::Deserializer<'de>>(d: D) -> Result<bool, D::Error> {
    struct Visitor;
    impl serde::de::Visitor<'_> for Visitor {
        type Value = bool;
        fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result { f.write_str("bool or int") }
        fn visit_bool<E: serde::de::Error>(self, v: bool) -> Result<bool, E> { Ok(v) }
        fn visit_i64<E: serde::de::Error>(self, v: i64) -> Result<bool, E> { Ok(v != 0) }
        fn visit_u64<E: serde::de::Error>(self, v: u64) -> Result<bool, E> { Ok(v != 0) }
    }
    d.deserialize_any(Visitor)
}

fn deserialize_string_or_number<'de, D: serde::Deserializer<'de>>(d: D) -> Result<String, D::Error> {
    struct Visitor;
    impl serde::de::Visitor<'_> for Visitor {
        type Value = String;
        fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result { f.write_str("string or number") }
        fn visit_str<E: serde::de::Error>(self, v: &str) -> Result<String, E> { Ok(v.to_string()) }
        fn visit_string<E: serde::de::Error>(self, v: String) -> Result<String, E> { Ok(v) }
        fn visit_i64<E: serde::de::Error>(self, v: i64) -> Result<String, E> { Ok(v.to_string()) }
        fn visit_u64<E: serde::de::Error>(self, v: u64) -> Result<String, E> { Ok(v.to_string()) }
        fn visit_f64<E: serde::de::Error>(self, v: f64) -> Result<String, E> { Ok(v.to_string()) }
    }
    d.deserialize_any(Visitor)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub username: String,
    pub email: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub username: String,
    pub email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublishResponse {
    pub published: bool,
    pub name: String,
    pub version: String,
    pub platform: String,
    pub arch: String,
    pub size: u64,
}

pub struct RegistryClient {
    config: RegistryConfig,
}

impl RegistryClient {
    
    pub fn new(config: RegistryConfig) -> Self {
        Self { config }
    }

    
    
    pub fn from_user_config() -> anyhow::Result<Self> {
        let config = load_user_config()?;
        Ok(Self::new(RegistryConfig {
            url: config.effective_url(),
            token: config.effective_token(),
            accounts: Vec::new(),
            current: None,
        }))
    }

    pub fn registry_url(&self) -> &str { &self.config.url }

    pub fn get_package(&self, name: &str) -> anyhow::Result<PackageSummary> {
        let url = format!("{}/v1/packages/{}", self.config.url, encode_name(name));
        let body = http_get(&url, self.config.token.as_deref())?;
        Ok(serde_json::from_str(&body)?)
    }

    

    pub fn package_detail_value(&self, name: &str) -> anyhow::Result<serde_json::Value> {
        let url = format!("{}/v1/packages/{}", self.config.url, encode_name(name));
        let body = http_get(&url, self.config.token.as_deref())?;
        Ok(serde_json::from_str(&body)?)
    }

    pub fn get_version(&self, name: &str, version: &str) -> anyhow::Result<VersionDetail> {
        let url = format!("{}/v1/packages/{}/{}", self.config.url, encode_name(name), version);
        let body = http_get(&url, self.config.token.as_deref())?;
        Ok(serde_json::from_str(&body)?)
    }

    pub fn search(&self, query: &str, limit: usize) -> anyhow::Result<Vec<SearchResult>> {
        let url = format!("{}/v1/search?q={}&limit={}", self.config.url, query, limit);
        let body = http_get(&url, self.config.token.as_deref())?;
        let wrapper: SearchWrapper = serde_json::from_str(&body)?;
        Ok(wrapper.results)
    }

    

    
    pub fn download(&self, name: &str, version: &str, platform: &str, arch: &str, dest: &Path) -> anyhow::Result<PathBuf> {
        let fetch = |plat: &str, ar: &str| -> anyhow::Result<Vec<u8>> {
            let url = format!(
                "{}/v1/packages/{}/{}/download?platform={}&arch={}",
                self.config.url, encode_name(name), version, plat, ar
            );
            http_get_bytes(&url, self.config.token.as_deref())
        };
        let data = match fetch(platform, arch) {
            Ok(d) if !d.is_empty() => d,
            res => {
                
                if platform == "any" && arch == "any" {
                    let d = res?;
                    if d.is_empty() { anyhow::bail!("registry returned an empty .ekl for {}@{}", name, version); }
                    d
                } else {
                    let d = fetch("any", "any")?;
                    if d.is_empty() { anyhow::bail!("registry returned an empty .ekl for {}@{} (any/any)", name, version); }
                    d
                }
            }
        };
        let out_path = dest.join(format!("{}.ekl", name.replace('/', "-").replace('@', "")));
        std::fs::create_dir_all(dest)?;
        std::fs::write(&out_path, &data)?;
        Ok(out_path)
    }

    
    
    pub fn download_ekl_exact(&self, name: &str, version: &str, platform: &str, arch: &str, out_file: &Path) -> anyhow::Result<usize> {

        let url = format!(
            "{}/v1/packages/{}/{}/download?platform={}&arch={}&ekl=1",
            self.config.url, encode_name(name), version, platform, arch
        );
        let data = http_get_bytes(&url, self.config.token.as_deref())?;
        if let Some(parent) = out_file.parent() { std::fs::create_dir_all(parent)?; }
        std::fs::write(out_file, &data)?;
        Ok(data.len())
    }

    
    
    pub fn publish(&self, name: &str, version: &str, platform: &str, arch: &str, ekl_path: &Path, signature: Option<&str>, min_ekko: Option<&str>, max_ekko: Option<&str>, visibility: &str, storage: &str, allow_private_on_public: bool) -> anyhow::Result<PublishResponse> {
        let token = self.config.token.as_ref()
            .ok_or_else(|| anyhow::anyhow!("not authenticated. Run: ekko login"))?;
        let url = format!(
            "{}/v1/packages/{}/{}?platform={}&arch={}",
            self.config.url, encode_name(name), version, platform, arch
        );
        let data = std::fs::read(ekl_path)?;
        let body = http_put_binary(&url, token, &data, signature, min_ekko, max_ekko, visibility, storage, allow_private_on_public)?;
        Ok(serde_json::from_str(&body)?)
    }

    
    pub fn publish_platform_meta(&self, name: &str, version: &str, platform: &str, arch: &str, ship: &HashMap<String, String>, files_json: Option<&str>) -> anyhow::Result<()> {
        let token = self.config.token.as_ref()
            .ok_or_else(|| anyhow::anyhow!("not authenticated. Run: ekko login"))?;
        let url = format!(
            "{}/v1/packages/{}/{}/{}/{}/meta",
            self.config.url, encode_name(name), version, platform, arch
        );
        let files_val: serde_json::Value = files_json
            .and_then(|f| serde_json::from_str(f).ok())
            .unwrap_or_else(|| serde_json::json!([]));
        let payload = serde_json::json!({ "ship": ship, "files": files_val });
        http_post_json(&url, Some(token), &payload.to_string())?;
        Ok(())
    }

    
    pub fn publish_meta(&self, name: &str, version: &str, readme: &str, description: &str, repository: &str, license: &str, release_notes: &str) -> anyhow::Result<()> {
        let token = self.config.token.as_ref()
            .ok_or_else(|| anyhow::anyhow!("not authenticated. Run: ekko login"))?;
        let url = format!(
            "{}/v1/packages/{}/{}/meta",
            self.config.url, encode_name(name), version
        );
        let payload = serde_json::json!({
            "readme": readme,
            "description": description,
            "repository": repository,
            "license": license,
            "releaseNotes": release_notes,
        });
        http_post_json(&url, Some(token), &payload.to_string())?;
        Ok(())
    }

    pub fn login(&self, username: &str, email: &str) -> anyhow::Result<LoginResponse> {
        let url = format!("{}/v1/auth/login", self.config.url);
        let payload = serde_json::json!({ "username": username, "email": email });
        let body = http_post_json(&url, None, &payload.to_string())?;
        Ok(serde_json::from_str(&body)?)
    }

    
    pub fn verify_token(&self, token: &str) -> anyhow::Result<UserInfo> {
        let url = format!("{}/v1/auth/whoami", self.config.url);
        let body = http_get(&url, Some(token))?;
        Ok(serde_json::from_str(&body)?)
    }

    pub fn whoami(&self) -> anyhow::Result<UserInfo> {
        let token = self.config.token.as_ref()
            .ok_or_else(|| anyhow::anyhow!("not authenticated. Run: ekko login"))?;
        let url = format!("{}/v1/auth/whoami", self.config.url);
        let body = http_get(&url, Some(token))?;
        Ok(serde_json::from_str(&body)?)
    }

    pub fn yank(&self, name: &str, version: &str) -> anyhow::Result<()> {
        let token = self.config.token.as_ref()
            .ok_or_else(|| anyhow::anyhow!("not authenticated. Run: ekko login"))?;
        let url = format!("{}/v1/packages/{}/{}/yank", self.config.url, encode_name(name), version);
        http_post_json(&url, Some(token), "{}")?;
        Ok(())
    }
}

#[derive(Deserialize)]
struct SearchWrapper {

    #[serde(alias = "packages", default)]
    results: Vec<SearchResult>,
}

fn encode_name(name: &str) -> String {
    name.replace("@", "").replace('/', "--")
}

fn decode_name(encoded: &str) -> String {
    if encoded.contains("--") {
        let parts: Vec<&str> = encoded.splitn(2, "--").collect();
        format!("@{}/{}", parts[0], parts[1])
    } else {
        encoded.to_string()
    }
}

pub fn load_user_config() -> anyhow::Result<RegistryConfig> {
    let config_path = user_config_path();
    if config_path.exists() {
        let content = std::fs::read_to_string(&config_path)?;
        Ok(serde_json::from_str(&content)?)
    } else {
        Ok(RegistryConfig::default())
    }
}

pub fn save_user_config(config: &RegistryConfig) -> anyhow::Result<()> {
    let config_path = user_config_path();
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(config)?;
    std::fs::write(&config_path, content)?;
    Ok(())
}

fn user_config_path() -> PathBuf {
    let home = if cfg!(target_os = "windows") {
        std::env::var("USERPROFILE").unwrap_or_else(|_| ".".to_string())
    } else {
        std::env::var("HOME").unwrap_or_else(|_| ".".to_string())
    };
    PathBuf::from(home).join(".ekko").join("config.json")
}

fn load_web_api() -> anyhow::Result<std::sync::Arc<crate::ffi::generated::web_api::Api>> {
    crate::engine::v8_runtime::load_native_web_api()
        .ok_or_else(|| anyhow::anyhow!("EkkoNative not available — cannot make HTTP requests"))
}

fn build_headers_json(token: Option<&str>, extra: &[(&str, &str)]) -> String {
    let mut parts = Vec::new();
    if let Some(t) = token {
        parts.push(format!("\"authorization\":\"Bearer {}\"", t));
    }
    for (k, v) in extra {
        parts.push(format!("\"{}\":\"{}\"", k, v));
    }
    if parts.is_empty() { "{}".to_string() } else { format!("{{{}}}", parts.join(",")) }
}

fn parse_response_body(json: &str) -> anyhow::Result<String> {
    let parsed: serde_json::Value = serde_json::from_str(json)
        .map_err(|e| anyhow::anyhow!("bad response: {}", e))?;
    let ok = parsed["ok"].as_bool().unwrap_or(false);
    let body = parsed["body"].as_str().unwrap_or("");
    let status = parsed["status"].as_i64().unwrap_or(0);
    if !ok { anyhow::bail!("HTTP {} error: {}", status, body); }
    Ok(body.to_string())
}

fn http_get(url: &str, token: Option<&str>) -> anyhow::Result<String> {
    let api = load_web_api()?;
    let headers = build_headers_json(token, &[]);
    let json = api.web_httpRequest(url, "GET", &headers, &[])
        .map_err(|e| anyhow::anyhow!("HTTP GET failed: {}", e))?;
    parse_response_body(&json)
}

fn http_get_bytes(url: &str, token: Option<&str>) -> anyhow::Result<Vec<u8>> {
    let api = load_web_api()?;
    let headers = build_headers_json(token, &[]);
    api.web_httpRequestBytes(url, "GET", &headers, &[])
        .map_err(|e| anyhow::anyhow!("HTTP GET failed: {}", e))
}

fn http_post_json(url: &str, token: Option<&str>, body: &str) -> anyhow::Result<String> {
    let api = load_web_api()?;
    let headers = build_headers_json(token, &[("content-type", "application/json")]);
    let json = api.web_httpRequest(url, "POST", &headers, body.as_bytes())
        .map_err(|e| anyhow::anyhow!("HTTP POST failed: {}", e))?;
    parse_response_body(&json)
}

fn http_put_binary(url: &str, token: &str, data: &[u8], signature: Option<&str>, min_ekko: Option<&str>, max_ekko: Option<&str>, visibility: &str, storage: &str, allow_private_on_public: bool) -> anyhow::Result<String> {
    let api = load_web_api()?;
    
    let mut extra = vec![("content-type", "application/x-ekko-package")];
    let sig_val;
    if let Some(s) = signature {
        sig_val = s.to_string();
        extra.push(("x-ekko-signature", &sig_val));
    }
    let min_val;
    if let Some(m) = min_ekko {
        if !m.is_empty() {
            min_val = m.to_string();
            extra.push(("x-ekko-min-version", &min_val));
        }
    }
    let max_val;
    if let Some(m) = max_ekko {
        if !m.is_empty() {
            max_val = m.to_string();
            extra.push(("x-ekko-max-version", &max_val));
        }
    }
    let vis_val = visibility.to_string();
    extra.push(("x-ekko-visibility", &vis_val));
    let stor_val = storage.to_string();
    extra.push(("x-ekko-storage", &stor_val));
    if allow_private_on_public {
        extra.push(("x-ekko-allow-private-on-public", "1"));
    }
    let headers = build_headers_json(Some(token), &extra);
    let json = api.web_httpRequest(url, "PUT", &headers, data)
        .map_err(|e| anyhow::anyhow!("HTTP PUT failed: {}", e))?;
    parse_response_body(&json)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_scoped_name() {
        assert_eq!(encode_name("@acme/core"), "acme--core");
    }

    #[test]
    fn encode_unscoped_name() {
        assert_eq!(encode_name("lodash"), "lodash");
    }

    #[test]
    fn default_config() {
        let config = RegistryConfig {
            url: "http://localhost:4873".into(),
            token: None,
            ..Default::default()
        };
        assert_eq!(config.url, "http://localhost:4873");
    }

    #[test]
    fn token_resolution_precedence() {
        
        let cfg = RegistryConfig {
            url: "https://flat.example".into(),
            token: Some("flat-tok".into()),
            accounts: vec![Account { name: "alice".into(), url: "https://alice.example".into(), token: Some("alice-tok".into()), cert_path: Some("c.pem".into()) }],
            current: Some("alice".into()),
        };

        assert_eq!(cfg.effective_token().as_deref(), Some("alice-tok"));
        assert_eq!(cfg.effective_url(), "https://alice.example");
        assert_eq!(cfg.effective_cert().as_deref(), Some("c.pem"));
        
        let flat = RegistryConfig { url: "https://r".into(), token: Some("only".into()), ..Default::default() };
        assert_eq!(flat.effective_token().as_deref(), Some("only"));
        assert_eq!(flat.effective_url(), "https://r");
    }

    #[test]
    fn parse_package_summary() {
        let json = r#"{
            "name": "test",
            "description": "A test",
            "license": "MIT",
            "latest": "1.0.0",
            "versions": [{"version": "1.0.0", "published_at": "2026-01-01", "yanked": false}]
        }"#;
        let pkg: PackageSummary = serde_json::from_str(json).unwrap();
        assert_eq!(pkg.name, "test");
        assert_eq!(pkg.latest, "1.0.0");
        assert_eq!(pkg.versions.len(), 1);
    }

    #[test]
    fn parse_search_results() {
        let json = r#"{"results": [{"name": "zod", "description": "Schema validation", "latest_version": "3.23.0", "updated_at": "2026-01-01"}]}"#;
        let wrapper: SearchWrapper = serde_json::from_str(json).unwrap();
        assert_eq!(wrapper.results.len(), 1);
        assert_eq!(wrapper.results[0].name, "zod");
    }

    #[test]
    fn parse_search_packages_shape() {
        
        let json = r#"{"packages":[{"name":"@ekko/react-dom","description":"","latest_version":"19.0.0","keywords":"[]","updated_at":1781454910}],"total":1,"page":1,"limit":20,"pages":1}"#;
        let wrapper: SearchWrapper = serde_json::from_str(json).unwrap();
        assert_eq!(wrapper.results.len(), 1);
        assert_eq!(wrapper.results[0].name, "@ekko/react-dom");
        assert_eq!(wrapper.results[0].latest_version, "19.0.0");
    }

    #[test]
    fn encode_decode_roundtrip() {
        let original = "@test/math";
        let encoded = encode_name(original);
        assert_eq!(encoded, "test--math");
        let decoded = decode_name(&encoded);
        assert_eq!(decoded, original);
    }

    #[test]
    fn encode_decode_unscoped_roundtrip() {
        let original = "lodash";
        let encoded = encode_name(original);
        assert_eq!(encoded, "lodash");
        let decoded = decode_name(&encoded);
        assert_eq!(decoded, original);
    }

    #[test]
    fn parse_publish_response() {
        let json = r#"{"ok":true,"published":true,"name":"test","version":"1.0.0","platform":"any","arch":"any","size":1024}"#;
        let resp: PublishResponse = serde_json::from_str(json).unwrap();
        assert!(resp.published);
        assert_eq!(resp.name, "test");
        assert_eq!(resp.size, 1024);
    }
}
