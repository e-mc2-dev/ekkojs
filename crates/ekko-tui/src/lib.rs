// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

pub mod bridge;
pub mod core;
pub mod events;
pub mod highlight;
pub mod platform;

#[cfg(test)]
mod vli_tests;

use std::path::PathBuf;

pub fn run(file: PathBuf, title: String) -> anyhow::Result<()> {
    launch(file, title, None)
}

pub fn run_dev(file: PathBuf, title: String, project_dir: PathBuf) -> anyhow::Result<()> {
    launch(file, title, Some(project_dir))
}

pub fn run_from_vfs(code: String, filename: String, _title: String) -> anyhow::Result<()> {
    let (event_tx, event_rx) = tokio::sync::mpsc::channel::<String>(256);
    let (cmd_tx, cmd_rx) = std::sync::mpsc::channel::<bridge::TuiCommand>();

    let tui_bridge = bridge::TuiBridge::new(cmd_tx);
    ekko_core::bridges::tui_bridge::init(Box::new(tui_bridge), event_rx);

    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .expect("failed to create tokio runtime");

        if let Err(e) = rt.block_on(ekko_core::engine::v8_runtime::execute_module_async(&code, &filename)) {
            eprintln!("\x1b[31mekko:tui error: {}\x1b[0m", e);
        }
    });

    bridge::run_event_loop(cmd_rx, event_tx)
}

fn launch(file: PathBuf, _title: String, watch_dir: Option<PathBuf>) -> anyhow::Result<()> {
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

    let (event_tx, event_rx) = tokio::sync::mpsc::channel::<String>(256);
    let (cmd_tx, cmd_rx) = std::sync::mpsc::channel::<bridge::TuiCommand>();

    let tui_bridge = bridge::TuiBridge::new(cmd_tx);
    ekko_core::bridges::tui_bridge::init(Box::new(tui_bridge), event_rx);

    let code_clone = code.clone();
    let filename_clone = filename.clone();

    
    
    let perms = ekko_core::engine::v8_runtime::get_permissions();
    std::thread::spawn(move || {
        ekko_core::engine::v8_runtime::set_permissions(perms);
        let rt = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .expect("failed to create tokio runtime");

        if let Err(e) = rt.block_on(ekko_core::engine::v8_runtime::execute_module_async(
            &code_clone,
            &filename_clone,
        )) {
            eprintln!("\x1b[31mekko:tui error: {}\x1b[0m", e);
        }
    });

    if let Some(dir) = watch_dir {
        start_file_watcher(dir, cmd_tx_for_watcher());
    }

    bridge::run_event_loop(cmd_rx, event_tx)
}

fn cmd_tx_for_watcher() -> std::sync::mpsc::Sender<bridge::TuiCommand> {

    
    let (tx, _rx) = std::sync::mpsc::channel();
    tx
}

fn start_file_watcher(
    project_dir: PathBuf,
    _cmd_tx: std::sync::mpsc::Sender<bridge::TuiCommand>,
) {
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

        let mut last_reload = std::time::Instant::now();

        loop {
            match rx.recv_timeout(std::time::Duration::from_millis(100)) {
                Ok(Ok(event)) => {
                    if last_reload.elapsed() < std::time::Duration::from_millis(200) {
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
                    let changed: Vec<&str> = paths.iter()
                        .filter_map(|p| p.rsplit(['/', '\\']).next())
                        .collect();
                    if !changed.is_empty() {
                        eprintln!("\x1b[33m[dev] changed: {}\x1b[0m", changed.join(", "));
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
