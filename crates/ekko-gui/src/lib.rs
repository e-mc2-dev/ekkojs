// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

mod bridge;
mod events;
mod protocol;
mod window;

use std::collections::HashMap;
use std::path::PathBuf;
use std::time::Duration;

use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoopBuilder, EventLoopProxy};

use bridge::GuiBridge;
use events::GuiEvent;
use window::GuiWindow;

pub fn run(file: PathBuf, title: String) -> anyhow::Result<()> {
    launch(file, title, None)
}

pub fn run_dev(file: PathBuf, title: String, project_dir: PathBuf) -> anyhow::Result<()> {
    launch(file, title, Some(project_dir))
}

pub fn run_from_vfs(code: String, filename: String, title: String, package_name: String) -> anyhow::Result<()> {
    launch_vfs(code, filename, title, package_name)
}

fn launch(file: PathBuf, _title: String, watch_dir: Option<PathBuf>) -> anyhow::Result<()> {
    let dev = watch_dir.is_some();
    let abs_file = std::fs::canonicalize(&file).unwrap_or_else(|_| file.clone());
    let code = std::fs::read_to_string(&abs_file)?;
    let filename = abs_file.to_string_lossy().to_string();

    let code = if ekko_core::parsers::swc_transform::needs_transpile(&filename) {
        ekko_core::parsers::swc_transform::transpile(&code, &filename)?
    } else {
        code
    };

    let project_dir = abs_file.parent().unwrap_or(std::path::Path::new(".")).to_path_buf();
    let _ = std::env::set_current_dir(&project_dir);

    ekko_core::packages::workspace::init_workspace(&abs_file);

    let (ipc_tx, ipc_rx) = tokio::sync::mpsc::unbounded_channel::<String>();

    let event_loop = EventLoopBuilder::<GuiEvent>::with_user_event().build();
    let proxy = event_loop.create_proxy();

    let gui_bridge = GuiBridge::new(proxy.clone(), project_dir.clone());
    ekko_core::bridges::gui_bridge::init(Box::new(gui_bridge), ipc_rx);

    if let Some(dir) = watch_dir {
        start_file_watcher(dir, proxy.clone());
    }

    let mut windows: HashMap<u32, GuiWindow> = HashMap::new();
    let mut _tray: Option<tray_icon::TrayIcon> = None;
    let mut _menu: Option<muda::Menu> = None;
    let ipc_tx_clone = ipc_tx.clone();
    let mut v8_started = false;
    let code_clone = code.clone();
    let filename_clone = filename.clone();

    
    let perms = ekko_core::engine::v8_runtime::get_permissions();

    #[cfg(target_os = "linux")]
    {
        gtk::init().ok();
    }

    event_loop.run(move |event, event_loop_target, control_flow| {
        if !v8_started {
            v8_started = true;
            let c = code_clone.clone();
            let f = filename_clone.clone();
            let p = perms.clone();
            std::thread::spawn(move || {
                ekko_core::engine::v8_runtime::set_permissions(p);
                let rt = tokio::runtime::Builder::new_multi_thread()
                    .enable_all()
                    .build()
                    .expect("failed to create tokio runtime");
                if let Err(e) = rt.block_on(ekko_core::engine::v8_runtime::execute_module_async(&c, &f)) {
                    eprintln!("\x1b[31mekko:gui error: {}\x1b[0m", e);
                }
            });
        }
        *control_flow = ControlFlow::Wait;

        if _menu.is_some() {
            if let Ok(menu_event) = muda::MenuEvent::receiver().try_recv() {
                let msg = serde_json::json!({
                    "type": "menu",
                    "id": menu_event.id.0
                });
                let _ = ipc_tx_clone.send(msg.to_string());
            }
        }

        if let Ok(tray_event) = tray_icon::TrayIconEvent::receiver().try_recv() {
            let event_type = match tray_event {
                tray_icon::TrayIconEvent::Click { button, .. } => {
                    match button {
                        tray_icon::MouseButton::Left => "click",
                        tray_icon::MouseButton::Right => "right-click",
                        _ => "click",
                    }
                }
                tray_icon::TrayIconEvent::DoubleClick { .. } => "double-click",
                _ => "other",
            };
            let msg = serde_json::json!({
                "type": "tray",
                "event": event_type
            });
            let _ = ipc_tx_clone.send(msg.to_string());
        }

        match event {
            Event::UserEvent(gui_event) => match gui_event {
                GuiEvent::CreateWindow { config, ack } => {
                    let win_config = if dev {
                        let mut c = config;
                        c.title = format!("{} [dev]", c.title);
                        c
                    } else {
                        config
                    };
                    match window::create_window_and_webview(
                        event_loop_target,
                        &win_config,
                        ipc_tx.clone(),
                    ) {
                        Ok(w) => {
                            let id = w.id;
                            if let Some(ref menu) = _menu {
                                let single = std::iter::once(&w);
                                init_menu_for_iter(menu, single);
                            }
                            windows.insert(id, w);
                            let _ = ack.send(id);
                        }
                        Err(e) => {
                            eprintln!("\x1b[31mFailed to create window: {}\x1b[0m", e);
                        }
                    }
                }
                GuiEvent::EvalScript { window_id, js } => {
                    if let Some(w) = windows.get(&window_id) {
                        let _ = w.webview.evaluate_script(&js);
                    }
                }
                GuiEvent::EvalScriptAll(js) => {
                    for w in windows.values() {
                        let _ = w.webview.evaluate_script(&js);
                    }
                }
                GuiEvent::SetTitle { window_id, title } => {
                    if let Some(w) = windows.get(&window_id) {
                        w.window.set_title(&title);
                    }
                }
                GuiEvent::CloseWindow(window_id) => {
                    windows.remove(&window_id);
                    if windows.is_empty() {
                        *control_flow = ControlFlow::Exit;
                    }
                }
                GuiEvent::SetAlwaysOnTop { window_id, value } => {
                    if let Some(w) = windows.get(&window_id) {
                        w.window.set_always_on_top(value);
                    }
                }
                GuiEvent::CloseAll => {
                    windows.clear();
                    *control_flow = ControlFlow::Exit;
                }
                GuiEvent::CreateTray(config_json) => {
                    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| build_tray(&config_json, &project_dir))) {
                        Ok(Ok(t)) => { _tray = Some(t); }
                        Ok(Err(e)) => eprintln!("\x1b[33m[gui] Tray error: {}\x1b[0m", e),
                        Err(_) => eprintln!("\x1b[33m[gui] Tray creation skipped (platform init pending)\x1b[0m"),
                    }
                }
                GuiEvent::SetMenu(config_json) => {
                    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| build_menu(&config_json))) {
                        Ok(Ok(menu)) => {
                            init_menu_for_windows(&menu, &windows);
                            _menu = Some(menu);
                        }
                        Ok(Err(e)) => eprintln!("\x1b[33m[gui] Menu error: {}\x1b[0m", e),
                        Err(_) => eprintln!("\x1b[33m[gui] Menu creation skipped (platform init pending)\x1b[0m"),
                    }
                }
            },
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                window_id,
                ..
            } => {
                let gui_id = windows.iter()
                    .find(|(_, w)| w.window.id() == window_id)
                    .map(|(&id, _)| id);
                if let Some(id) = gui_id {
                    windows.remove(&id);
                }
                if windows.is_empty() {
                    *control_flow = ControlFlow::Exit;
                }
            }
            _ => {}
        }
    })
}

fn launch_vfs(code: String, filename: String, _title: String, package_name: String) -> anyhow::Result<()> {
    let (ipc_tx, ipc_rx) = tokio::sync::mpsc::unbounded_channel::<String>();

    let event_loop = EventLoopBuilder::<GuiEvent>::with_user_event().build();
    let proxy = event_loop.create_proxy();

    let gui_bridge = GuiBridge::new_vfs(proxy.clone(), package_name);
    ekko_core::bridges::gui_bridge::init(Box::new(gui_bridge), ipc_rx);

    let mut windows: HashMap<u32, GuiWindow> = HashMap::new();
    let mut _tray: Option<tray_icon::TrayIcon> = None;
    let mut _menu: Option<muda::Menu> = None;
    let ipc_tx_clone = ipc_tx.clone();
    let mut v8_started = false;
    let code_clone = code;
    let filename_clone = filename;
    let empty_dir = std::path::PathBuf::new();
    
    let perms = ekko_core::engine::v8_runtime::get_permissions();

    #[cfg(target_os = "linux")]
    {
        gtk::init().ok();
    }

    event_loop.run(move |event, event_loop_target, control_flow| {
        if !v8_started {
            v8_started = true;
            let c = code_clone.clone();
            let f = filename_clone.clone();
            let p = perms.clone();
            std::thread::spawn(move || {
                ekko_core::engine::v8_runtime::set_permissions(p);
                let rt = tokio::runtime::Builder::new_multi_thread()
                    .enable_all()
                    .build()
                    .expect("failed to create tokio runtime");
                if let Err(e) = rt.block_on(ekko_core::engine::v8_runtime::execute_module_async(&c, &f)) {
                    eprintln!("\x1b[31mekko:gui error: {}\x1b[0m", e);
                }
            });
        }
        *control_flow = ControlFlow::Wait;

        if _menu.is_some() {
            if let Ok(menu_event) = muda::MenuEvent::receiver().try_recv() {
                let msg = serde_json::json!({
                    "type": "menu",
                    "id": menu_event.id.0
                });
                let _ = ipc_tx_clone.send(msg.to_string());
            }
        }

        if let Ok(tray_event) = tray_icon::TrayIconEvent::receiver().try_recv() {
            let event_type = match tray_event {
                tray_icon::TrayIconEvent::Click { button, .. } => {
                    match button {
                        tray_icon::MouseButton::Left => "click",
                        tray_icon::MouseButton::Right => "right-click",
                        _ => "click",
                    }
                }
                tray_icon::TrayIconEvent::DoubleClick { .. } => "double-click",
                _ => "other",
            };
            let msg = serde_json::json!({
                "type": "tray",
                "event": event_type
            });
            let _ = ipc_tx_clone.send(msg.to_string());
        }

        match event {
            Event::UserEvent(gui_event) => match gui_event {
                GuiEvent::CreateWindow { config, ack } => {
                    match window::create_window_and_webview(
                        event_loop_target,
                        &config,
                        ipc_tx.clone(),
                    ) {
                        Ok(w) => {
                            let id = w.id;
                            if let Some(ref menu) = _menu {
                                let single = std::iter::once(&w);
                                init_menu_for_iter(menu, single);
                            }
                            windows.insert(id, w);
                            let _ = ack.send(id);
                        }
                        Err(e) => {
                            eprintln!("\x1b[31mFailed to create window: {}\x1b[0m", e);
                        }
                    }
                }
                GuiEvent::EvalScript { window_id, js } => {
                    if let Some(w) = windows.get(&window_id) {
                        let _ = w.webview.evaluate_script(&js);
                    }
                }
                GuiEvent::EvalScriptAll(js) => {
                    for w in windows.values() {
                        let _ = w.webview.evaluate_script(&js);
                    }
                }
                GuiEvent::SetTitle { window_id, title } => {
                    if let Some(w) = windows.get(&window_id) {
                        w.window.set_title(&title);
                    }
                }
                GuiEvent::CloseWindow(window_id) => {
                    windows.remove(&window_id);
                    if windows.is_empty() {
                        *control_flow = ControlFlow::Exit;
                    }
                }
                GuiEvent::SetAlwaysOnTop { window_id, value } => {
                    if let Some(w) = windows.get(&window_id) {
                        w.window.set_always_on_top(value);
                    }
                }
                GuiEvent::CloseAll => {
                    windows.clear();
                    *control_flow = ControlFlow::Exit;
                }
                GuiEvent::CreateTray(config_json) => {
                    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| build_tray(&config_json, &empty_dir))) {
                        Ok(Ok(t)) => { _tray = Some(t); }
                        Ok(Err(e)) => eprintln!("\x1b[33m[gui] Tray error: {}\x1b[0m", e),
                        Err(_) => eprintln!("\x1b[33m[gui] Tray creation skipped (platform init pending)\x1b[0m"),
                    }
                }
                GuiEvent::SetMenu(config_json) => {
                    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| build_menu(&config_json))) {
                        Ok(Ok(menu)) => {
                            init_menu_for_windows(&menu, &windows);
                            _menu = Some(menu);
                        }
                        Ok(Err(e)) => eprintln!("\x1b[33m[gui] Menu error: {}\x1b[0m", e),
                        Err(_) => eprintln!("\x1b[33m[gui] Menu creation skipped (platform init pending)\x1b[0m"),
                    }
                }
            },
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                window_id,
                ..
            } => {
                let gui_id = windows.iter()
                    .find(|(_, w)| w.window.id() == window_id)
                    .map(|(&id, _)| id);
                if let Some(id) = gui_id {
                    windows.remove(&id);
                }
                if windows.is_empty() {
                    *control_flow = ControlFlow::Exit;
                }
            }
            _ => {}
        }
    })
}

fn init_menu_for_windows(menu: &muda::Menu, windows: &HashMap<u32, GuiWindow>) {
    init_menu_for_iter(menu, windows.values());
}

fn init_menu_for_iter<'a>(menu: &muda::Menu, windows: impl Iterator<Item = &'a GuiWindow>) {
    #[cfg(target_os = "windows")]
    {
        use tao::platform::windows::WindowExtWindows;
        for w in windows {
            unsafe { let _ = menu.init_for_hwnd(w.window.hwnd() as _); }
        }
    }
    #[cfg(target_os = "linux")]
    {
        use tao::platform::unix::WindowExtUnix;
        for w in windows {
            let gtk_win = w.window.gtk_window();
            let _ = menu.init_for_gtk_window(gtk_win, None::<&gtk::Box>);
        }
    }
    #[cfg(target_os = "macos")]
    {
        let _ = windows; 
        let _ = menu.init_for_nsapp();
    }
}

fn build_tray(
    config_json: &str,
    project_dir: &std::path::Path,
) -> anyhow::Result<tray_icon::TrayIcon> {
    let v: serde_json::Value = serde_json::from_str(config_json)?;

    let tooltip = v["tooltip"].as_str().unwrap_or("EkkoJS");

    let icon = if let Some(icon_path) = v["icon"].as_str() {
        let full = if std::path::Path::new(icon_path).is_relative() {
            project_dir.join(icon_path)
        } else {
            PathBuf::from(icon_path)
        };
        load_tray_icon(&full)?
    } else {
        default_tray_icon()
    };

    let mut builder = tray_icon::TrayIconBuilder::new()
        .with_tooltip(tooltip)
        .with_icon(icon);

    if let Some(items) = v["menu"].as_array() {
        let menu = tray_icon::menu::Menu::new();
        for item in items {
            let id = item["id"].as_str().unwrap_or("unknown");
            let label = item["label"].as_str().unwrap_or("Item");
            let _ = menu.append(&tray_icon::menu::MenuItem::with_id(id, label, true, None));
        }
        builder = builder.with_menu(Box::new(menu));
    }

    Ok(builder.build()?)
}

fn build_menu(config_json: &str) -> anyhow::Result<muda::Menu> {
    let v: serde_json::Value = serde_json::from_str(config_json)?;
    let menu = muda::Menu::new();

    let items = v.as_array().ok_or_else(|| anyhow::anyhow!("menu must be an array"))?;
    for submenu_def in items {
        let label = submenu_def["label"].as_str().unwrap_or("Menu");
        let submenu = muda::Submenu::new(label, true);

        if let Some(sub_items) = submenu_def["items"].as_array() {
            for item_def in sub_items {
                if item_def["type"].as_str() == Some("separator") {
                    let _ = submenu.append(&muda::PredefinedMenuItem::separator());
                    continue;
                }
                let id = item_def["id"].as_str().unwrap_or("unknown");
                let item_label = item_def["label"].as_str().unwrap_or("Item");
                let accel = item_def["accelerator"].as_str()
                    .and_then(|a| a.parse::<muda::accelerator::Accelerator>().ok());
                let _ = submenu.append(&muda::MenuItem::with_id(
                    muda::MenuId::new(id),
                    item_label,
                    true,
                    accel,
                ));
            }
        }
        let _ = menu.append(&submenu);
    }

    Ok(menu)
}

fn load_tray_icon(path: &std::path::Path) -> anyhow::Result<tray_icon::Icon> {
    let img = image::open(path)?.into_rgba8();
    let (w, h) = img.dimensions();
    let rgba = img.into_raw();
    tray_icon::Icon::from_rgba(rgba, w, h).map_err(|e| anyhow::anyhow!("{}", e))
}

fn default_tray_icon() -> tray_icon::Icon {
    let size = 32u32;
    let mut rgba = vec![0u8; (size * size * 4) as usize];
    for y in 0..size {
        for x in 0..size {
            let i = ((y * size + x) * 4) as usize;
            rgba[i] = 91;     
            rgba[i + 1] = 33; 
            rgba[i + 2] = 182; 
            rgba[i + 3] = 255; 
        }
    }
    tray_icon::Icon::from_rgba(rgba, size, size).unwrap()
}

fn is_reloadable(path: &str) -> bool {
    let ext = path.rsplit('.').next().unwrap_or("");
    matches!(ext,
        "html" | "htm" | "css" | "js" | "mjs" | "ts" | "tsx" | "jsx"
        | "json" | "svg" | "png" | "jpg" | "jpeg" | "gif" | "ico"
        | "woff" | "woff2"
    )
}

fn start_file_watcher(project_dir: PathBuf, proxy: EventLoopProxy<GuiEvent>) {
    use notify::{recommended_watcher, RecursiveMode, Watcher};

    std::thread::spawn(move || {
        let (tx, rx) = std::sync::mpsc::channel::<notify::Result<notify::Event>>();
        let mut watcher = match recommended_watcher(tx) {
            Ok(w) => w,
            Err(e) => {
                eprintln!("\x1b[31m[dev] file watcher failed: {}\x1b[0m", e);
                return;
            }
        };

        if let Err(e) = watcher.watch(&project_dir, RecursiveMode::Recursive) {
            eprintln!("\x1b[31m[dev] cannot watch {}: {}\x1b[0m", project_dir.display(), e);
            return;
        }

        println!("\x1b[36m[dev] watching {} for changes...\x1b[0m", project_dir.display());

        let mut last_reload = std::time::Instant::now();

        loop {
            match rx.recv_timeout(Duration::from_millis(100)) {
                Ok(Ok(event)) => {
                    if last_reload.elapsed() < Duration::from_millis(200) {
                        continue;
                    }

                    let paths: Vec<String> = event.paths.iter()
                        .map(|p| p.to_string_lossy().to_string())
                        .collect();

                    let skip = paths.iter().any(|p| {
                        let norm = p.replace('\\', "/");
                        norm.contains("/.ekko/") || norm.contains("\\.ekko\\")
                    });
                    if skip { continue; }

                    let has_reloadable = paths.iter().any(|p| is_reloadable(p));

                    if has_reloadable {
                        let changed: Vec<&str> = paths.iter()
                            .filter(|p| is_reloadable(p))
                            .filter_map(|p| p.rsplit(['/', '\\']).next())
                            .collect();
                        println!("\x1b[33m[dev] reload: {}\x1b[0m", changed.join(", "));
                        let _ = proxy.send_event(GuiEvent::EvalScriptAll(
                            "location.reload()".to_string()
                        ));
                        last_reload = std::time::Instant::now();
                    }
                }
                Ok(Err(e)) => eprintln!("\x1b[31m[dev] watch error: {}\x1b[0m", e),
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {}
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }
    });
}
