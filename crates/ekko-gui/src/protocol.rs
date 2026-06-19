// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::borrow::Cow;
use std::path::{Path, PathBuf};

use wry::http::{header::CONTENT_TYPE, Response};

use crate::events::ContentSource;

fn needs_transpile(path: &str) -> bool {
    let ext = path.rsplit('.').next().unwrap_or("");
    matches!(ext, "ts" | "tsx" | "jsx")
}

fn mime_from_ext(path: &str) -> &'static str {
    let ext = path.rsplit('.').next().unwrap_or("");
    match ext {
        "html" | "htm" => "text/html",
        "js" | "mjs" | "ts" | "tsx" | "jsx" => "text/javascript",
        "css" => "text/css",
        "json" => "application/json",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        "wasm" => "application/wasm",
        "xml" => "application/xml",
        "txt" => "text/plain",
        "map" => "application/json",
        _ => "application/octet-stream",
    }
}

fn not_found() -> Response<Cow<'static, [u8]>> {
    Response::builder()
        .status(404)
        .header(CONTENT_TYPE, "text/plain")
        .body(Cow::Borrowed(b"Not Found" as &[u8]))
        .unwrap()
}

fn normalize_path(uri_path: &str) -> &str {
    let p = uri_path.strip_prefix('/').unwrap_or(uri_path);
    if p.is_empty() {
        "index.html"
    } else {
        p
    }
}

pub type ProtocolHandler =
    Box<dyn Fn(&str, wry::http::Request<Vec<u8>>) -> Response<Cow<'static, [u8]>> + 'static>;

pub fn make_protocol_handler(content: ContentSource) -> ProtocolHandler {
    match content {
        ContentSource::Directory(root) => {
            let root = std::fs::canonicalize(&root).unwrap_or(root);
            Box::new(directory_handler(root))
        }
        ContentSource::Html(html) => Box::new(html_handler(html)),
        ContentSource::Vfs { package, root } => Box::new(vfs_handler(package, root)),
    }
}

fn directory_handler(
    root: PathBuf,
) -> impl Fn(&str, wry::http::Request<Vec<u8>>) -> Response<Cow<'static, [u8]>>
       + 'static {
    move |_id, request| {
        let uri_path = request.uri().path();
        let relative = normalize_path(uri_path);

        let file_path = resolve_file(&root, relative);

        let Some(file_path) = file_path else {
            return not_found();
        };

        let path_str = file_path.to_string_lossy();
        let mime = mime_from_ext(&path_str);

        if needs_transpile(&path_str) {
            match std::fs::read_to_string(&file_path) {
                Ok(source) => {
                    let filename = file_path.file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_else(|| "script.ts".to_string());
                    match ekko_core::parsers::swc_transform::transpile(&source, &filename) {
                        Ok(js) => Response::builder()
                            .header(CONTENT_TYPE, mime)
                            .body(Cow::Owned(js.into_bytes()))
                            .unwrap(),
                        Err(e) => Response::builder()
                            .status(500)
                            .header(CONTENT_TYPE, "text/plain")
                            .body(Cow::Owned(format!("TypeScript error: {}", e).into_bytes()))
                            .unwrap(),
                    }
                }
                Err(_) => not_found(),
            }
        } else {
            match std::fs::read(&file_path) {
                Ok(bytes) => Response::builder()
                    .header(CONTENT_TYPE, mime)
                    .body(Cow::Owned(bytes))
                    .unwrap(),
                Err(_) => not_found(),
            }
        }
    }
}

fn html_handler(
    html: String,
) -> impl Fn(&str, wry::http::Request<Vec<u8>>) -> Response<Cow<'static, [u8]>>
       + 'static {
    move |_id, request| {
        let uri_path = request.uri().path();
        let relative = normalize_path(uri_path);

        if relative == "index.html" {
            Response::builder()
                .header(CONTENT_TYPE, "text/html")
                .body(Cow::Owned(html.as_bytes().to_vec()))
                .unwrap()
        } else {
            not_found()
        }
    }
}

fn vfs_handler(
    package: String,
    root: String,
) -> impl Fn(&str, wry::http::Request<Vec<u8>>) -> Response<Cow<'static, [u8]>>
       + 'static {
    move |_id, request| {
        let uri_path = request.uri().path();
        let relative = normalize_path(uri_path);
        let vfs_path = if root.is_empty() {
            relative.to_string()
        } else {
            format!("{}/{}", root.trim_end_matches('/'), relative)
        };

        let registry = ekko_core::module_loader::vfs_registry();

        if needs_transpile(&vfs_path) {
            if let Some(source) = registry.read_module(&package, &vfs_path) {
                let mime = mime_from_ext(&vfs_path);
                match ekko_core::parsers::swc_transform::transpile(&source, &vfs_path) {
                    Ok(js) => Response::builder()
                        .header(CONTENT_TYPE, mime)
                        .body(Cow::Owned(js.into_bytes()))
                        .unwrap(),
                    Err(e) => Response::builder()
                        .status(500)
                        .header(CONTENT_TYPE, "text/plain")
                        .body(Cow::Owned(format!("TypeScript error: {}", e).into_bytes()))
                        .unwrap(),
                }
            } else {
                let js_path = vfs_path
                    .replace(".ts", ".js")
                    .replace(".tsx", ".js")
                    .replace(".jsx", ".js");
                if let Some(data) = resolve_vfs_file(&package, &js_path) {
                    Response::builder()
                        .header(CONTENT_TYPE, "text/javascript")
                        .body(Cow::Owned(data))
                        .unwrap()
                } else {
                    not_found()
                }
            }
        } else {
            let (resolved, resolved_path) = resolve_vfs_file_with_path(&package, &vfs_path);
            if let Some(data) = resolved {
                let mime = mime_from_ext(&resolved_path);
                Response::builder()
                    .header(CONTENT_TYPE, mime)
                    .body(Cow::Owned(data))
                    .unwrap()
            } else {
                not_found()
            }
        }
    }
}

fn resolve_vfs_file(package: &str, path: &str) -> Option<Vec<u8>> {
    resolve_vfs_file_with_path(package, path).0
}

fn resolve_vfs_file_with_path(package: &str, path: &str) -> (Option<Vec<u8>>, String) {
    let registry = ekko_core::module_loader::vfs_registry();
    let pkg = match registry.get_package(package) {
        Some(p) => p,
        None => return (None, path.to_string()),
    };
    if let Some(data) = pkg.read(path) {
        return (Some(data), path.to_string());
    }
    for ext in &[".ts", ".tsx", ".js", ".jsx"] {
        let with_ext = format!("{}{}", path, ext);
        if let Some(data) = pkg.read(&with_ext) {
            return (Some(data), with_ext);
        }
    }
    let js_path = path
        .replace(".ts", ".js")
        .replace(".tsx", ".js")
        .replace(".jsx", ".js");
    if js_path != path {
        if let Some(data) = pkg.read(&js_path) {
            return (Some(data), js_path);
        }
    }
    (None, path.to_string())
}

fn resolve_file(root: &Path, relative: &str) -> Option<PathBuf> {
    let exact = root.join(relative);
    if let Some(p) = safe_join(root, &exact) {
        return Some(p);
    }
    for ext in &[".ts", ".tsx", ".js", ".jsx"] {
        let with_ext = root.join(format!("{}{}", relative, ext));
        if let Some(p) = safe_join(root, &with_ext) {
            return Some(p);
        }
    }
    let js_rel = relative
        .replace(".ts", ".js")
        .replace(".tsx", ".js")
        .replace(".jsx", ".js");
    if js_rel != relative {
        let js_path = root.join(&js_rel);
        if let Some(p) = safe_join(root, &js_path) {
            return Some(p);
        }
    }
    None
}

fn safe_join(root: &Path, requested: &Path) -> Option<PathBuf> {
    let canonical = std::fs::canonicalize(requested).ok()?;
    let root_canonical = std::fs::canonicalize(root).ok()?;
    if canonical.starts_with(&root_canonical) {
        Some(canonical)
    } else {
        None
    }
}
