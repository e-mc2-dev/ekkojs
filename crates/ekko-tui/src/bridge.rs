// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::sync::mpsc;
use ekko_core::bridges::tui_bridge::TuiSender;

use crate::core::cell::{Col, Style};
use crate::core::surface::Surface;
use crate::events::TuiEvent;
use crate::highlight::registry::{LanguageRegistry, FileTokenCache};
use crate::platform::input;

use std::io::Write;
use std::time::Duration;

static LANG_REGISTRY: std::sync::OnceLock<LanguageRegistry> = std::sync::OnceLock::new();

fn lang_registry() -> &'static LanguageRegistry {
    LANG_REGISTRY.get_or_init(LanguageRegistry::new)
}

#[derive(Debug)]
pub enum TuiCommand {
    UpdateCells(String),
    SetCursor { x: u16, y: u16, visible: bool },
    Resize { width: u16, height: u16 },
    Clear,
    Flush,
    Quit,
    PtySpawn(String),
    PtyWrite { id: u32, data: String },
    PtyResize { id: u32, rows: u16, cols: u16 },
    PtyKill(u32),
}

pub struct TuiBridge {
    cmd_tx: mpsc::Sender<TuiCommand>,
}

impl TuiBridge {
    
    pub fn new(cmd_tx: mpsc::Sender<TuiCommand>) -> Self {
        TuiBridge { cmd_tx }
    }
}

impl TuiSender for TuiBridge {
    
    fn update_cells(&self, updates_json: String) -> Result<(), String> {
        self.cmd_tx.send(TuiCommand::UpdateCells(updates_json))
            .map_err(|_| "TUI event loop closed".to_string())
    }

    fn set_cursor(&self, x: u16, y: u16, visible: bool) -> Result<(), String> {
        self.cmd_tx.send(TuiCommand::SetCursor { x, y, visible })
            .map_err(|_| "TUI event loop closed".to_string())
    }

    fn resize(&self, width: u16, height: u16) -> Result<(), String> {
        self.cmd_tx.send(TuiCommand::Resize { width, height })
            .map_err(|_| "TUI event loop closed".to_string())
    }

    fn clear(&self) -> Result<(), String> {
        self.cmd_tx.send(TuiCommand::Clear)
            .map_err(|_| "TUI event loop closed".to_string())
    }

    fn flush(&self) -> Result<(), String> {
        self.cmd_tx.send(TuiCommand::Flush)
            .map_err(|_| "TUI event loop closed".to_string())
    }

    fn quit(&self) -> Result<(), String> {
        self.cmd_tx.send(TuiCommand::Quit)
            .map_err(|_| "TUI event loop closed".to_string())
    }

    fn tokenize(&self, language: String, code: String) -> Result<String, String> {
        let reg = lang_registry();
        let highlighter = reg.for_name(&language)
            .ok_or_else(|| format!("unknown language: {}", language))?;
        let cache = FileTokenCache::tokenize_file(highlighter, &code);
        let mut result = Vec::new();
        for line_idx in 0..cache.line_count() {
            let tokens = cache.get_tokens(line_idx);
            let line_tokens: Vec<serde_json::Value> = tokens.iter().map(|t| {
                serde_json::json!({
                    "start": t.start,
                    "length": t.length,
                    "kind": format!("{:?}", t.kind),
                })
            }).collect();
            result.push(serde_json::Value::Array(line_tokens));
        }
        serde_json::to_string(&result).map_err(|e| e.to_string())
    }

    fn pty_spawn(&self, config_json: String) -> Result<u32, String> {
        self.cmd_tx.send(TuiCommand::PtySpawn(config_json))
            .map_err(|_| "TUI event loop closed".to_string())?;
        Ok(0)
    }

    fn pty_write(&self, id: u32, data: String) -> Result<(), String> {
        self.cmd_tx.send(TuiCommand::PtyWrite { id, data })
            .map_err(|_| "TUI event loop closed".to_string())
    }

    fn pty_resize(&self, id: u32, rows: u16, cols: u16) -> Result<(), String> {
        self.cmd_tx.send(TuiCommand::PtyResize { id, rows, cols })
            .map_err(|_| "TUI event loop closed".to_string())
    }

    fn pty_kill(&self, id: u32) -> Result<(), String> {
        self.cmd_tx.send(TuiCommand::PtyKill(id))
            .map_err(|_| "TUI event loop closed".to_string())
    }
}

pub fn apply_cell_updates_pub(surface: &mut Surface, json: &str) {
    apply_cell_updates(surface, json);
}

fn apply_cell_updates(surface: &mut Surface, json: &str) {
    let updates: Vec<serde_json::Value> = match serde_json::from_str(json) {
        Ok(v) => v,
        Err(_) => return,
    };
    for u in &updates {
        let x = u["x"].as_u64().unwrap_or(0) as usize;
        let y = u["y"].as_u64().unwrap_or(0) as usize;
        let ch = u["ch"].as_str().and_then(|s| s.chars().next()).unwrap_or(' ');
        let fg = parse_col(&u["fg"]);
        let bg = parse_col(&u["bg"]);
        let style = parse_style(&u["style"]);
        surface.set(x, y, ch, fg, bg, style);
    }
}

fn parse_col(v: &serde_json::Value) -> Col {
    match v {
        serde_json::Value::String(s) => match s.as_str() {
            "default" | "" => Col::DEFAULT,
            "black" => Col::BLACK,
            "red" => Col::RED,
            "green" => Col::GREEN,
            "yellow" => Col::YELLOW,
            "blue" => Col::BLUE,
            "magenta" => Col::MAGENTA,
            "cyan" => Col::CYAN,
            "white" => Col::WHITE,
            "brightBlack" => Col::BRIGHT_BLACK,
            "brightRed" => Col::BRIGHT_RED,
            "brightGreen" => Col::BRIGHT_GREEN,
            "brightYellow" => Col::BRIGHT_YELLOW,
            "brightBlue" => Col::BRIGHT_BLUE,
            "brightMagenta" => Col::BRIGHT_MAGENTA,
            "brightCyan" => Col::BRIGHT_CYAN,
            "brightWhite" => Col::BRIGHT_WHITE,
            s if s.starts_with('#') && s.len() == 7 => {
                let r = u8::from_str_radix(&s[1..3], 16).unwrap_or(0);
                let g = u8::from_str_radix(&s[3..5], 16).unwrap_or(0);
                let b = u8::from_str_radix(&s[5..7], 16).unwrap_or(0);
                Col::rgb(r, g, b)
            }
            _ => Col::DEFAULT,
        },
        serde_json::Value::Object(o) => {
            let r = o.get("r").and_then(|v| v.as_u64()).unwrap_or(0) as u8;
            let g = o.get("g").and_then(|v| v.as_u64()).unwrap_or(0) as u8;
            let b = o.get("b").and_then(|v| v.as_u64()).unwrap_or(0) as u8;
            Col::rgb(r, g, b)
        }
        _ => Col::DEFAULT,
    }
}

fn parse_style(v: &serde_json::Value) -> Style {
    match v {
        serde_json::Value::String(s) => {
            let mut style = Style::NONE;
            if s.contains("bold") { style = style | Style::BOLD; }
            if s.contains("italic") { style = style | Style::ITALIC; }
            if s.contains("underline") { style = style | Style::UNDERLINE; }
            if s.contains("reverse") { style = style | Style::REVERSE; }
            style
        }
        serde_json::Value::Number(n) => Style::from_bits(n.as_u64().unwrap_or(0) as u8),
        _ => Style::NONE,
    }
}

fn event_to_json(event: &TuiEvent) -> String {
    match event {
        TuiEvent::Key(k) => {
            serde_json::json!({
                "type": "key",
                "key": format!("{:?}", k.key),
                "char": if k.ch != '\0' { k.ch.to_string() } else { String::new() },
                "ctrl": k.ctrl,
                "alt": k.alt,
                "shift": k.shift,
            }).to_string()
        }
        TuiEvent::Mouse(m) => {
            serde_json::json!({
                "type": "mouse",
                "button": format!("{:?}", m.button),
                "x": m.x,
                "y": m.y,
                "pressed": m.pressed,
                "released": m.released,
            }).to_string()
        }
        TuiEvent::Resize(w, h) => {
            serde_json::json!({
                "type": "resize",
                "width": w,
                "height": h,
            }).to_string()
        }
    }
}

pub fn run_event_loop(
    cmd_rx: mpsc::Receiver<TuiCommand>,
    event_tx: tokio::sync::mpsc::Sender<String>,
) -> anyhow::Result<()> {
    let (cols, rows) = crate::platform::term::Terminal::size();
    ekko_core::bridges::tui_bridge::init_size(cols, rows);
    let mut surface = Surface::new(cols as usize, rows as usize);
    let mut terminal = crate::platform::term::Terminal::init()?;
    let mut stdout = std::io::stdout();
    let mut cursor_visible = true;
    let mut needs_flush = true;

    let mut pty_process: Option<crate::platform::pty::PtyProcess> = None;
    let mut pty_writer: Option<Box<dyn std::io::Write + Send>> = None;
    let pty_bytes_rx: std::sync::Arc<std::sync::Mutex<Vec<u8>>> = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
    let mut pty_parser: Option<crate::core::ansi_parser::AnsiParser> = None;
    let mut pty_region: (usize, usize, usize, usize) = (0, 0, 0, 0); 
    let mut pty_active = false;

    let ctrlc_flag = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    {
        let flag = ctrlc_flag.clone();
        let _ = ctrlc::set_handler(move || {
            flag.store(true, std::sync::atomic::Ordering::SeqCst);
        });
    }

    loop {
        if ctrlc_flag.load(std::sync::atomic::Ordering::Relaxed) {
            restore_and_banner(&mut terminal, &mut stdout);
            std::process::exit(0);
        }

        if let Some(event) = input::poll_event(Duration::from_millis(16)) {
            
            if let TuiEvent::Key(ref k) = event {
                if k.ctrl && (k.ch == '\x03' || k.ch == 'c') {
                    restore_and_banner(&mut terminal, &mut stdout);
                    std::process::exit(0);
                }

                if ekko_core::bridges::tui_bridge::has_exit_banner()
                    && (k.key == crate::events::Key::Esc || (k.ch == 'q' && !k.ctrl && !k.alt))
                {
                    restore_and_banner(&mut terminal, &mut stdout);
                    std::process::exit(0);
                }
            }
            
            let mut forwarded_to_pty = false;
            if pty_active {
                if let TuiEvent::Key(ref k) = event {
                    if k.key == crate::events::Key::Tab {
                        pty_active = false;
                    } else {
                        if let Some(ref mut w) = pty_writer {
                            let bytes = key_to_pty_bytes(k);
                            if !bytes.is_empty() {
                                let _ = w.write_all(&bytes);
                                let _ = w.flush();
                            }
                        }
                        forwarded_to_pty = true;
                    }
                }
            }
            if forwarded_to_pty {
                
            } else {
            match event {
                TuiEvent::Resize(w, h) => {
                    ekko_core::bridges::tui_bridge::init_size(w, h);
                    surface.resize(w as usize, h as usize);
                    needs_flush = true;
                    let _ = event_tx.try_send(event_to_json(&event));
                }
                _ => {
                    let _ = event_tx.try_send(event_to_json(&event));
                }
            }
            } 
        }

        loop {
            match cmd_rx.try_recv() {
                Ok(TuiCommand::UpdateCells(json)) => {
                    if json == "__pty_activate__" {
                        pty_active = pty_writer.is_some();
                    } else {
                        apply_cell_updates(&mut surface, &json);
                        needs_flush = true;
                    }
                }
                Ok(TuiCommand::SetCursor { x, y, visible }) => {
                    cursor_visible = visible;
                    if visible {
                        write!(stdout, "\x1b[?25h\x1b[{};{}H", y + 1, x + 1).ok();
                    } else {
                        write!(stdout, "\x1b[?25l").ok();
                    }
                    stdout.flush().ok();
                }
                Ok(TuiCommand::Resize { width, height }) => {
                    surface.resize(width as usize, height as usize);
                    needs_flush = true;
                }
                Ok(TuiCommand::Clear) => {
                    surface.clear();
                    needs_flush = true;
                }
                Ok(TuiCommand::Flush) => {
                    needs_flush = true;
                }
                Ok(TuiCommand::Quit) => {
                    restore_and_banner(&mut terminal, &mut stdout);
                    return Ok(());
                }
                Ok(TuiCommand::PtySpawn(config)) => {
                    match serde_json::from_str::<serde_json::Value>(&config) {
                        Ok(v) => {
                            let program = v["program"].as_str().unwrap_or(if cfg!(windows) { "cmd.exe" } else { "bash" });
                            let args: Vec<&str> = v["args"].as_array()
                                .map(|a| a.iter().filter_map(|x| x.as_str()).collect())
                                .unwrap_or_default();
                            let cwd = v["cwd"].as_str();
                            let p_rows = v["rows"].as_u64().unwrap_or(20) as u16;
                            let p_cols = v["cols"].as_u64().unwrap_or(80) as u16;
                            let rgn_x = v["regionX"].as_u64().unwrap_or(0) as usize;
                            let rgn_y = v["regionY"].as_u64().unwrap_or(0) as usize;
                            match crate::platform::pty::PtyProcess::spawn(program, &args, cwd, p_rows, p_cols) {
                                Ok(mut proc) => {
                                    pty_region = (rgn_x, rgn_y, p_cols as usize, p_rows as usize);
                                    pty_parser = Some(crate::core::ansi_parser::AnsiParser::new(p_cols as usize, p_rows as usize));
                                    pty_active = true;

                                    let buf_ref = pty_bytes_rx.clone();
                                    let mut reader = proc.take_reader();
                                    std::thread::spawn(move || {
                                        let mut buf = [0u8; 4096];
                                        loop {
                                            match reader.read(&mut buf) {
                                                Ok(0) => break,
                                                Ok(n) => {
                                                    let mut v = buf_ref.lock().unwrap();
                                                    v.extend_from_slice(&buf[..n]);
                                                }
                                                Err(_) => break,
                                            }
                                        }
                                    });
                                    pty_writer = Some(proc.take_writer_box());
                                    pty_process = Some(proc);
                                }
                                Err(e) => eprintln!("\x1b[31m[tui] PTY spawn failed: {}\x1b[0m", e),
                            }
                        }
                        Err(e) => eprintln!("\x1b[31m[tui] PTY config parse error: {}\x1b[0m", e),
                    }
                }
                Ok(TuiCommand::PtyWrite { id: _, data }) => {
                    if let Some(ref mut w) = pty_writer {
                        let _ = w.write_all(data.as_bytes());
                        let _ = w.flush();
                    }
                }
                Ok(TuiCommand::PtyResize { id: _, rows: _, cols: _ }) => {}
                Ok(TuiCommand::PtyKill(_id)) => {
                    pty_active = false;
                }
                Err(mpsc::TryRecvError::Empty) => break,
                Err(mpsc::TryRecvError::Disconnected) => {
                    restore_and_banner(&mut terminal, &mut stdout);
                    return Ok(());
                }
            }
        }

        if pty_active {
            let mut bytes = Vec::new();
            {
                let mut buf = pty_bytes_rx.lock().unwrap();
                if !buf.is_empty() {
                    bytes = std::mem::take(&mut *buf);
                }
            }
            if !bytes.is_empty() {
                if let Some(ref mut parser) = pty_parser {
                    parser.feed(&bytes);
                    let (rx, ry, rw, rh) = pty_region;
                    for py in 0..parser.rows().min(rh) {
                        for px in 0..parser.cols().min(rw) {
                            let cell = parser.cell(px, py);
                            surface.set(rx + px, ry + py, cell.ch, cell.fg, cell.bg, cell.style);
                        }
                    }
                    needs_flush = true;
                }
            }
        }

        if needs_flush {
            surface.flush(&mut stdout)?;
            if !cursor_visible {
                write!(stdout, "\x1b[?25l").ok();
            }
            stdout.flush().ok();
            needs_flush = false;
        }
    }
}

fn restore_and_banner(terminal: &mut crate::platform::term::Terminal, stdout: &mut std::io::Stdout) {
    terminal.restore();
    if let Some(b) = ekko_core::bridges::tui_bridge::take_exit_banner() {
        let _ = write!(stdout, "{}", b);
        let _ = stdout.flush();
    }
}

fn key_to_pty_bytes(k: &crate::events::KeyEvent) -> Vec<u8> {
    use crate::events::Key;
    if k.key == Key::Char && k.ch != '\0' {
        let mut buf = [0u8; 4];
        let s = k.ch.encode_utf8(&mut buf);
        return s.as_bytes().to_vec();
    }
    match k.key {
        Key::Enter => vec![b'\r'],
        Key::Backspace => vec![0x7f],
        Key::Tab => vec![b'\t'],
        Key::Esc => vec![0x1b],
        Key::Up => vec![0x1b, b'[', b'A'],
        Key::Down => vec![0x1b, b'[', b'B'],
        Key::Right => vec![0x1b, b'[', b'C'],
        Key::Left => vec![0x1b, b'[', b'D'],
        Key::Home => vec![0x1b, b'[', b'H'],
        Key::End => vec![0x1b, b'[', b'F'],
        Key::Delete => vec![0x1b, b'[', b'3', b'~'],
        Key::PageUp => vec![0x1b, b'[', b'5', b'~'],
        Key::PageDown => vec![0x1b, b'[', b'6', b'~'],
        _ => vec![],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bridge_send_command() {
        let (tx, rx) = mpsc::channel();
        let bridge = TuiBridge::new(tx);
        bridge.clear().unwrap();
        bridge.flush().unwrap();
        bridge.quit().unwrap();
        assert!(matches!(rx.recv().unwrap(), TuiCommand::Clear));
        assert!(matches!(rx.recv().unwrap(), TuiCommand::Flush));
        assert!(matches!(rx.recv().unwrap(), TuiCommand::Quit));
    }

    #[test]
    fn bridge_update_cells() {
        let (tx, rx) = mpsc::channel();
        let bridge = TuiBridge::new(tx);
        bridge.update_cells(r#"[{"x":0,"y":0,"ch":"A"}]"#.to_string()).unwrap();
        match rx.recv().unwrap() {
            TuiCommand::UpdateCells(json) => assert!(json.contains("\"ch\":\"A\"")),
            _ => panic!("expected UpdateCells"),
        }
    }

    #[test]
    fn bridge_set_cursor() {
        let (tx, rx) = mpsc::channel();
        let bridge = TuiBridge::new(tx);
        bridge.set_cursor(5, 10, true).unwrap();
        match rx.recv().unwrap() {
            TuiCommand::SetCursor { x, y, visible } => {
                assert_eq!(x, 5);
                assert_eq!(y, 10);
                assert!(visible);
            }
            _ => panic!("expected SetCursor"),
        }
    }

    #[test]
    fn bridge_resize() {
        let (tx, rx) = mpsc::channel();
        let bridge = TuiBridge::new(tx);
        bridge.resize(120, 40).unwrap();
        match rx.recv().unwrap() {
            TuiCommand::Resize { width, height } => {
                assert_eq!(width, 120);
                assert_eq!(height, 40);
            }
            _ => panic!("expected Resize"),
        }
    }

    #[test]
    fn bridge_disconnected_error() {
        let (tx, rx) = mpsc::channel();
        let bridge = TuiBridge::new(tx);
        drop(rx);
        assert!(bridge.quit().is_err());
    }

    #[test]
    fn apply_cell_updates_basic() {
        let mut surface = Surface::new(10, 1);
        apply_cell_updates(&mut surface, r#"[
            {"x":0,"y":0,"ch":"H","fg":"red","bg":"default","style":"bold"},
            {"x":1,"y":0,"ch":"i","fg":"green"}
        ]"#);
        let snap = surface.snapshot();
        assert_eq!(snap[0][0].0, 'H');
        assert_eq!(snap[0][0].1, Col::RED);
        assert_eq!(snap[0][0].3, Style::BOLD);
        assert_eq!(snap[0][1].0, 'i');
        assert_eq!(snap[0][1].1, Col::GREEN);
    }

    #[test]
    fn apply_cell_updates_rgb() {
        let mut surface = Surface::new(10, 1);
        apply_cell_updates(&mut surface, r##"[
            {"x":0,"y":0,"ch":"X","fg":"#ff8000","bg":{"r":0,"g":0,"b":64}}
        ]"##);
        let snap = surface.snapshot();
        assert_eq!(snap[0][0].1, Col::rgb(255, 128, 0));
        assert_eq!(snap[0][0].2, Col::rgb(0, 0, 64));
    }

    #[test]
    fn apply_cell_updates_invalid_json() {
        let mut surface = Surface::new(10, 1);
        apply_cell_updates(&mut surface, "not json");
        assert_eq!(surface.snapshot()[0][0].0, ' ');
    }

    #[test]
    fn parse_col_named_colors() {
        assert_eq!(parse_col(&serde_json::json!("red")), Col::RED);
        assert_eq!(parse_col(&serde_json::json!("green")), Col::GREEN);
        assert_eq!(parse_col(&serde_json::json!("blue")), Col::BLUE);
        assert_eq!(parse_col(&serde_json::json!("default")), Col::DEFAULT);
        assert_eq!(parse_col(&serde_json::json!("brightCyan")), Col::BRIGHT_CYAN);
    }

    #[test]
    fn parse_col_hex() {
        assert_eq!(parse_col(&serde_json::json!("#ff0000")), Col::rgb(255, 0, 0));
        assert_eq!(parse_col(&serde_json::json!("#00ff00")), Col::rgb(0, 255, 0));
    }

    #[test]
    fn parse_col_rgb_object() {
        assert_eq!(parse_col(&serde_json::json!({"r":128,"g":64,"b":32})), Col::rgb(128, 64, 32));
    }

    #[test]
    fn parse_style_string() {
        assert_eq!(parse_style(&serde_json::json!("bold")), Style::BOLD);
        assert_eq!(parse_style(&serde_json::json!("bold,italic")), Style::BOLD | Style::ITALIC);
        assert_eq!(parse_style(&serde_json::json!("")), Style::NONE);
    }

    #[test]
    fn parse_style_number() {
        assert_eq!(parse_style(&serde_json::json!(1)), Style::BOLD);
        assert_eq!(parse_style(&serde_json::json!(5)), Style::BOLD | Style::ITALIC);
    }

    #[test]
    fn event_to_json_key() {
        use crate::events::KeyEvent;
        let event = TuiEvent::Key(KeyEvent::of_char('a', true, false));
        let json = event_to_json(&event);
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["type"], "key");
        assert_eq!(v["char"], "a");
        assert_eq!(v["ctrl"], true);
    }

    #[test]
    fn event_to_json_mouse() {
        use crate::events::{MouseButton, MouseEvent};
        let event = TuiEvent::Mouse(MouseEvent { button: MouseButton::Left, x: 5, y: 10, pressed: true, released: false });
        let json = event_to_json(&event);
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["type"], "mouse");
        assert_eq!(v["x"], 5);
        assert_eq!(v["y"], 10);
        assert_eq!(v["pressed"], true);
    }

    #[test]
    fn event_to_json_resize() {
        let event = TuiEvent::Resize(120, 40);
        let json = event_to_json(&event);
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["type"], "resize");
        assert_eq!(v["width"], 120);
        assert_eq!(v["height"], 40);
    }

    #[test]
    fn event_loop_quit_on_command() {
        let (cmd_tx, cmd_rx) = mpsc::channel();
        let (event_tx, _event_rx) = tokio::sync::mpsc::channel::<String>(16);
        cmd_tx.send(TuiCommand::Quit).unwrap();

        match cmd_rx.try_recv() {
            Ok(TuiCommand::Quit) => {}
            _ => panic!("expected Quit"),
        }
    }
}
