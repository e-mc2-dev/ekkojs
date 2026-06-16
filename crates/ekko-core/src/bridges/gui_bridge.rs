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
use tokio::sync::{mpsc, Mutex};

pub trait GuiSender: Send + Sync + 'static {
    
    fn create_window(
        &self,
        config_json: String,
        ack: tokio::sync::oneshot::Sender<u32>,
    ) -> Result<(), String>;
    
    fn eval_script(&self, window_id: u32, js: String) -> Result<(), String>;
    
    fn eval_script_all(&self, js: String) -> Result<(), String>;
    
    fn set_title(&self, window_id: u32, title: String) -> Result<(), String>;
    
    fn close_window(&self, window_id: u32) -> Result<(), String>;
    
    fn close_all(&self) -> Result<(), String>;
    
    fn set_always_on_top(&self, window_id: u32, value: bool) -> Result<(), String>;
    
    fn create_tray(&self, config_json: String) -> Result<(), String>;
    
    fn set_menu(&self, config_json: String) -> Result<(), String>;
}

static GUI_SENDER: OnceLock<Box<dyn GuiSender>> = OnceLock::new();
static GUI_IPC_RX: OnceLock<Arc<Mutex<mpsc::Receiver<String>>>> = OnceLock::new();

pub fn init(sender: Box<dyn GuiSender>, rx: mpsc::Receiver<String>) {
    GUI_SENDER.set(sender).ok();
    GUI_IPC_RX.set(Arc::new(Mutex::new(rx))).ok();
}

pub fn is_available() -> bool {
    GUI_SENDER.get().is_some()
}

pub fn sender() -> Option<&'static dyn GuiSender> {
    GUI_SENDER.get().map(|s| s.as_ref())
}

pub fn ipc_rx() -> Option<Arc<Mutex<mpsc::Receiver<String>>>> {
    GUI_IPC_RX.get().cloned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn not_available_by_default() {
        assert!(!is_available());
        assert!(sender().is_none());
        assert!(ipc_rx().is_none());
    }
}
