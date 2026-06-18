// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::path::PathBuf;

pub enum GuiEvent {
    CreateWindow {
        config: WindowConfig,
        ack: tokio::sync::oneshot::Sender<u32>,
    },
    EvalScript {
        window_id: u32,
        js: String,
    },
    EvalScriptAll(String),
    SetTitle {
        window_id: u32,
        title: String,
    },
    CloseWindow(u32),
    CloseAll,
    SetAlwaysOnTop { window_id: u32, value: bool },
    CreateTray(String),
    SetMenu(String),
}

pub struct WindowConfig {
    pub title: String,
    pub width: u32,
    pub height: u32,
    pub min_width: Option<u32>,
    pub min_height: Option<u32>,
    pub max_width: Option<u32>,
    pub max_height: Option<u32>,
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub resizable: bool,
    pub minimizable: bool,
    pub maximizable: bool,
    pub closable: bool,
    pub decorations: bool,
    pub transparent: bool,
    pub always_on_top: bool,
    pub fullscreen: bool,
    pub maximized: bool,
    pub icon: Option<PathBuf>,
    pub theme: Option<String>,
    pub background_color: Option<(u8, u8, u8, u8)>,
    pub content: ContentSource,
}

#[derive(Clone)]
pub enum ContentSource {
    Directory(PathBuf),
    Html(String),
    Vfs { package: String, root: String },
}

impl WindowConfig {
    
    pub fn content_source_clone(&self) -> ContentSource {
        self.content.clone()
    }

    pub fn from_json(json: &str, project_dir: &std::path::Path, vfs_package: Option<&str>) -> Self {
        let v: serde_json::Value = serde_json::from_str(json).unwrap_or_default();

        let resolve_path = |p: &str| -> PathBuf {
            let pb = PathBuf::from(p);
            if pb.is_relative() {
                project_dir.join(pb)
            } else {
                pb
            }
        };

        let content = if let Some(root) = v["root"].as_str() {
            if let Some(pkg) = vfs_package {
                let root_clean = root.trim_start_matches("./");
                ContentSource::Vfs { package: pkg.to_string(), root: root_clean.to_string() }
            } else {
                ContentSource::Directory(resolve_path(root))
            }
        } else if let Some(html) = v["html"].as_str() {
            ContentSource::Html(html.to_string())
        } else {
            ContentSource::Html("<html><body><h1>EkkoJS GUI</h1></body></html>".to_string())
        };

        let bg = v["backgroundColor"].as_object().map(|o| {
            (
                o.get("r").and_then(|v| v.as_u64()).unwrap_or(0) as u8,
                o.get("g").and_then(|v| v.as_u64()).unwrap_or(0) as u8,
                o.get("b").and_then(|v| v.as_u64()).unwrap_or(0) as u8,
                o.get("a").and_then(|v| v.as_u64()).unwrap_or(255) as u8,
            )
        });

        Self {
            title: v["title"].as_str().unwrap_or("EkkoJS").to_string(),
            width: v["width"].as_u64().unwrap_or(800) as u32,
            height: v["height"].as_u64().unwrap_or(600) as u32,
            min_width: v["minWidth"].as_u64().map(|n| n as u32),
            min_height: v["minHeight"].as_u64().map(|n| n as u32),
            max_width: v["maxWidth"].as_u64().map(|n| n as u32),
            max_height: v["maxHeight"].as_u64().map(|n| n as u32),
            x: v["x"].as_i64().map(|n| n as i32),
            y: v["y"].as_i64().map(|n| n as i32),
            resizable: v["resizable"].as_bool().unwrap_or(true),
            minimizable: v["minimizable"].as_bool().unwrap_or(true),
            maximizable: v["maximizable"].as_bool().unwrap_or(true),
            closable: v["closable"].as_bool().unwrap_or(true),
            decorations: v["decorations"].as_bool().unwrap_or(true),
            transparent: v["transparent"].as_bool().unwrap_or(false),
            always_on_top: v["alwaysOnTop"].as_bool().unwrap_or(false),
            fullscreen: v["fullscreen"].as_bool().unwrap_or(false),
            maximized: v["maximized"].as_bool().unwrap_or(false),
            icon: v["icon"].as_str().map(|p| resolve_path(p)),
            theme: v["theme"].as_str().map(|s| s.to_string()),
            background_color: bg,
            content,
        }
    }
}
