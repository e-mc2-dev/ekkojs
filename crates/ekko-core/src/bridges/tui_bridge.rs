// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::sync::{Arc, OnceLock};
use std::sync::atomic::{AtomicU16, Ordering};
use tokio::sync::{mpsc, Mutex};

pub trait TuiSender: Send + Sync + 'static {
    
    fn update_cells(&self, updates_json: String) -> Result<(), String>;
    
    fn set_cursor(&self, x: u16, y: u16, visible: bool) -> Result<(), String>;
    
    fn resize(&self, width: u16, height: u16) -> Result<(), String>;
    
    fn clear(&self) -> Result<(), String>;
    
    fn flush(&self) -> Result<(), String>;
    
    fn quit(&self) -> Result<(), String>;
    
    fn tokenize(&self, language: String, code: String) -> Result<String, String>;
    
    fn pty_spawn(&self, config_json: String) -> Result<u32, String>;
    
    fn pty_write(&self, id: u32, data: String) -> Result<(), String>;
    
    fn pty_resize(&self, id: u32, rows: u16, cols: u16) -> Result<(), String>;
    
    fn pty_kill(&self, id: u32) -> Result<(), String>;
}

static TUI_SENDER: OnceLock<Box<dyn TuiSender>> = OnceLock::new();
static TUI_EVENT_RX: OnceLock<Arc<Mutex<mpsc::Receiver<String>>>> = OnceLock::new();
static TUI_COLS: AtomicU16 = AtomicU16::new(80);
static TUI_ROWS: AtomicU16 = AtomicU16::new(25);

pub fn init(sender: Box<dyn TuiSender>, rx: mpsc::Receiver<String>) {
    TUI_SENDER.set(sender).ok();
    TUI_EVENT_RX.set(Arc::new(Mutex::new(rx))).ok();
}

pub fn init_size(cols: u16, rows: u16) {
    TUI_COLS.store(cols, Ordering::Relaxed);
    TUI_ROWS.store(rows, Ordering::Relaxed);
}

pub fn get_size() -> (u16, u16) {
    (TUI_COLS.load(Ordering::Relaxed), TUI_ROWS.load(Ordering::Relaxed))
}

pub fn is_available() -> bool {
    TUI_SENDER.get().is_some()
}

pub fn sender() -> Option<&'static dyn TuiSender> {
    TUI_SENDER.get().map(|s| s.as_ref())
}

pub fn event_rx() -> Option<Arc<Mutex<mpsc::Receiver<String>>>> {
    TUI_EVENT_RX.get().cloned()
}

static EXIT_BANNER: OnceLock<std::sync::Mutex<Option<String>>> = OnceLock::new();
fn exit_banner_cell() -> &'static std::sync::Mutex<Option<String>> {
    EXIT_BANNER.get_or_init(|| std::sync::Mutex::new(None))
}

pub fn set_exit_banner(banner: Option<String>) {
    if let Ok(mut g) = exit_banner_cell().lock() {
        *g = banner;
    }
}

pub fn take_exit_banner() -> Option<String> {
    exit_banner_cell().lock().ok().and_then(|mut g| g.take())
}

pub fn has_exit_banner() -> bool {
    exit_banner_cell().lock().map(|g| g.is_some()).unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn not_available_by_default() {
        assert!(!is_available());
        assert!(sender().is_none());
        assert!(event_rx().is_none());
    }

    #[test]
    fn size_defaults() {
        let (c, r) = get_size();
        assert!(c > 0);
        assert!(r > 0);
    }

    #[test]
    fn init_size_updates() {
        init_size(120, 40);
        let (c, r) = get_size();
        assert_eq!(c, 120);
        assert_eq!(r, 40);
        init_size(80, 25); 
    }
}
