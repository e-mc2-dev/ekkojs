// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use ekko_core::bridges::gui_bridge::GuiSender;
use tao::event_loop::EventLoopProxy;

use crate::events::{GuiEvent, WindowConfig};

pub struct GuiBridge {
    proxy: EventLoopProxy<GuiEvent>,
    project_dir: std::path::PathBuf,
    vfs_package: Option<String>,
}

impl GuiBridge {
    
    pub fn new(proxy: EventLoopProxy<GuiEvent>, project_dir: std::path::PathBuf) -> Self {
        Self { proxy, project_dir, vfs_package: None }
    }

    pub fn new_vfs(proxy: EventLoopProxy<GuiEvent>, package_name: String) -> Self {
        Self { proxy, project_dir: std::path::PathBuf::new(), vfs_package: Some(package_name) }
    }
}

impl GuiSender for GuiBridge {
    
    fn create_window(
        &self,
        config_json: String,
        ack: tokio::sync::oneshot::Sender<u32>,
    ) -> Result<(), String> {
        let config = WindowConfig::from_json(&config_json, &self.project_dir, self.vfs_package.as_deref());
        self.proxy
            .send_event(GuiEvent::CreateWindow { config, ack })
            .map_err(|_| "GUI event loop closed".to_string())
    }

    fn eval_script(&self, window_id: u32, js: String) -> Result<(), String> {
        self.proxy
            .send_event(GuiEvent::EvalScript { window_id, js })
            .map_err(|_| "GUI event loop closed".to_string())
    }

    fn eval_script_all(&self, js: String) -> Result<(), String> {
        self.proxy
            .send_event(GuiEvent::EvalScriptAll(js))
            .map_err(|_| "GUI event loop closed".to_string())
    }

    fn set_title(&self, window_id: u32, title: String) -> Result<(), String> {
        self.proxy
            .send_event(GuiEvent::SetTitle { window_id, title })
            .map_err(|_| "GUI event loop closed".to_string())
    }

    fn close_window(&self, window_id: u32) -> Result<(), String> {
        self.proxy
            .send_event(GuiEvent::CloseWindow(window_id))
            .map_err(|_| "GUI event loop closed".to_string())
    }

    fn close_all(&self) -> Result<(), String> {
        self.proxy
            .send_event(GuiEvent::CloseAll)
            .map_err(|_| "GUI event loop closed".to_string())
    }

    fn set_always_on_top(&self, window_id: u32, value: bool) -> Result<(), String> {
        self.proxy
            .send_event(GuiEvent::SetAlwaysOnTop { window_id, value })
            .map_err(|_| "GUI event loop closed".to_string())
    }

    fn create_tray(&self, config_json: String) -> Result<(), String> {
        self.proxy
            .send_event(GuiEvent::CreateTray(config_json))
            .map_err(|_| "GUI event loop closed".to_string())
    }

    fn set_menu(&self, config_json: String) -> Result<(), String> {
        self.proxy
            .send_event(GuiEvent::SetMenu(config_json))
            .map_err(|_| "GUI event loop closed".to_string())
    }
}
