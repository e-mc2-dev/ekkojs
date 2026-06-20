// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use regex::Regex;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone)]
pub struct ExportedMethod {
    pub export_name: String,
    pub class_name: String,
    pub method_name: String,
    pub return_type: String,
    pub is_async: bool,
    pub params: Vec<Param>,
}

#[derive(Debug, Clone)]
pub struct Param {
    pub cs_type: String,
    pub name: String,
}

pub fn parse_cs_file(path: &Path) -> anyhow::Result<Vec<ExportedMethod>> {
    let content = fs::read_to_string(path)?;
    let mut methods = Vec::new();
    let mut current_class = String::new();

    let class_re = Regex::new(r"(?:public\s+)?(?:static\s+)?class\s+(\w+)").unwrap();
    if let Some(cap) = class_re.captures(&content) {
        current_class = cap[1].to_string();
    }

    let export_re = Regex::new(
        r#"\[EkkoExport\("([^"]+)"\)\]\s*\n\s*public\s+static\s+(async\s+)?(Task<(\w+(?:\[\])?)>|(\w+(?:\[\])?))?\s+(\w+)\(([^)]*)\)"#
    ).unwrap();

    for cap in export_re.captures_iter(&content) {
        let export_name = cap[1].to_string();
        let is_async = cap.get(2).is_some();
        let return_type = if let Some(task_inner) = cap.get(4) {
            task_inner.as_str().to_string()
        } else if let Some(direct) = cap.get(5) {
            direct.as_str().to_string()
        } else {
            "void".to_string()
        };
        let method_name = cap[6].to_string();
        let params_str = cap[7].to_string();

        let mut params = Vec::new();
        if !params_str.trim().is_empty() {
            for p in params_str.split(',') {
                let p = p.trim();
                let parts: Vec<&str> = p.rsplitn(2, ' ').collect();
                if parts.len() == 2 {
                    params.push(Param {
                        cs_type: parts[1].to_string(),
                        name: parts[0].to_string(),
                    });
                }
            }
        }

        methods.push(ExportedMethod {
            export_name,
            class_name: current_class.clone(),
            method_name,
            return_type,
            is_async,
            params,
        });
    }

    Ok(methods)
}

pub fn parse_directory(dir: &Path) -> anyhow::Result<Vec<ExportedMethod>> {
    let mut all = Vec::new();
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().is_some_and(|e| e == "cs") {
            let methods = parse_cs_file(&path)?;
            if !methods.is_empty() {
                println!("  {} → {} exports", path.display(), methods.len());
                all.extend(methods);
            }
        }
    }
    Ok(all)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn write_temp_cs(content: &str) -> tempfile::NamedTempFile {
        let mut f = tempfile::NamedTempFile::with_suffix(".cs").unwrap();
        f.write_all(content.as_bytes()).unwrap();
        f
    }

    #[test]
    fn parse_sync_method() {
        let f = write_temp_cs(r#"
public static class TestApi {
    [EkkoExport("test.add")]
    public static int Add(int a, int b) => a + b;
}
"#);
        let methods = parse_cs_file(f.path()).unwrap();
        assert_eq!(methods.len(), 1);
        assert_eq!(methods[0].export_name, "test.add");
        assert_eq!(methods[0].return_type, "int");
        assert!(!methods[0].is_async);
        assert_eq!(methods[0].params.len(), 2);
    }

    #[test]
    fn parse_async_method() {
        let f = write_temp_cs(r#"
public static class TestApi {
    [EkkoExport("test.slow")]
    public static async Task<long> Slow(long input)
    {
        return input;
    }
}
"#);
        let methods = parse_cs_file(f.path()).unwrap();
        assert_eq!(methods.len(), 1);
        assert!(methods[0].is_async);
        assert_eq!(methods[0].return_type, "long");
    }

    #[test]
    fn parse_string_params() {
        let f = write_temp_cs(r#"
public static class TestApi {
    [EkkoExport("test.greet")]
    public static string Greet(string name) => name;
}
"#);
        let methods = parse_cs_file(f.path()).unwrap();
        assert_eq!(methods[0].params[0].cs_type, "string");
        assert_eq!(methods[0].return_type, "string");
    }
}
