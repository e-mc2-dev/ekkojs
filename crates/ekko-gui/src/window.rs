// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use tao::dpi::{LogicalPosition, LogicalSize};
use tao::event_loop::EventLoopWindowTarget;
use tao::window::{Fullscreen, Theme, Window, WindowBuilder};
use tokio::sync::mpsc;
use wry::WebView;
use wry::WebViewBuilder;

use crate::events::WindowConfig;
use crate::protocol::make_protocol_handler;

const INIT_SCRIPT: &str = include_str!("init_script.js");

pub struct GuiWindow {
    pub window: Window,
    pub webview: WebView,
    pub id: u32,
}

static NEXT_WINDOW_ID: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(1);

pub fn create_window_and_webview(
    event_loop: &EventLoopWindowTarget<crate::events::GuiEvent>,
    config: &WindowConfig,
    ipc_tx: mpsc::UnboundedSender<String>,
) -> anyhow::Result<GuiWindow> {
    let id = NEXT_WINDOW_ID.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

    let mut builder = WindowBuilder::new()
        .with_title(&config.title)
        .with_inner_size(LogicalSize::new(config.width, config.height))
        .with_resizable(config.resizable)
        .with_minimizable(config.minimizable)
        .with_maximizable(config.maximizable)
        .with_closable(config.closable)
        .with_decorations(config.decorations)
        .with_transparent(config.transparent)
        .with_always_on_top(config.always_on_top)
        .with_maximized(config.maximized);

    if let Some(min_w) = config.min_width {
        let min_h = config.min_height.unwrap_or(0);
        builder = builder.with_min_inner_size(LogicalSize::new(min_w, min_h));
    }
    if let Some(max_w) = config.max_width {
        let max_h = config.max_height.unwrap_or(u32::MAX);
        builder = builder.with_max_inner_size(LogicalSize::new(max_w, max_h));
    }
    if let (Some(x), Some(y)) = (config.x, config.y) {
        builder = builder.with_position(LogicalPosition::new(x, y));
    }
    if config.fullscreen {
        builder = builder.with_fullscreen(Some(Fullscreen::Borderless(None)));
    }
    if let Some(ref theme) = config.theme {
        builder = match theme.as_str() {
            "dark" => builder.with_theme(Some(Theme::Dark)),
            "light" => builder.with_theme(Some(Theme::Light)),
            _ => builder,
        };
    }
    if let Some((r, g, b, a)) = config.background_color {
        builder = builder.with_background_color((r, g, b, a));
    }
    if let Some(ref icon_path) = config.icon {
        if let Ok(icon) = load_icon(icon_path) {
            builder = builder.with_window_icon(Some(icon));
        }
    }

    let window = builder.build(event_loop)?;

    #[cfg(target_os = "macos")]
    if !config.decorations {
        use tao::platform::macos::WindowExtMacOS;
        let ns_win = window.ns_window() as cocoa::base::id;
        unsafe { cocoa::appkit::NSWindow::setMovableByWindowBackground_(ns_win, cocoa::base::YES); }
    }

    let protocol_handler = make_protocol_handler(config.content_source_clone());
    let ipc_window_id = id;

    let webview = WebViewBuilder::new()
        .with_custom_protocol("ekko".into(), protocol_handler)
        .with_ipc_handler(move |request| {
            let body = request.body().clone();
            let msg = serde_json::json!({
                "windowId": ipc_window_id,
                "data": serde_json::from_str::<serde_json::Value>(&body).unwrap_or(serde_json::Value::String(body.clone()))
            });
            let _ = ipc_tx.send(msg.to_string());
        })
        .with_initialization_script(INIT_SCRIPT)
        .with_transparent(config.transparent)
        .with_url(protocol_url())
        .build(&window)?;

    Ok(GuiWindow { window, webview, id })
}

fn protocol_url() -> &'static str {
    if cfg!(target_os = "windows") {
        "http://ekko.localhost"
    } else {
        "ekko://localhost"
    }
}

fn load_icon(path: &std::path::Path) -> anyhow::Result<tao::window::Icon> {
    let img = image::open(path)?.into_rgba8();
    let (w, h) = img.dimensions();
    let rgba = img.into_raw();
    tao::window::Icon::from_rgba(rgba, w, h).map_err(|e| anyhow::anyhow!("{}", e))
}
