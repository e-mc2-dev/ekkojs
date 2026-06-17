// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



use ekko_core::engine::v8_runtime::ReplSession;
use rustyline::error::ReadlineError;
use rustyline::DefaultEditor;

pub async fn run_repl(allow: Vec<String>) -> anyhow::Result<()> {
    
    let perms = if allow.is_empty() {
        ekko_core::ffi::ffi_runtime::PermissionSet::new()
    } else {
        ekko_core::ffi::ffi_runtime::PermissionSet::from_flags(&allow)
    };
    ekko_core::engine::v8_runtime::set_permissions(perms);

    let color = crate::banner::stdout_color();
    print!("{}", crate::banner::repl_card(&format!("v{}", ekko_core::VERSION), "interactive REPL", color));
    println!();
    if allow.is_empty() {
        println!("  Type .exit or press Ctrl-D to quit. (native APIs denied, restart with --allow=… to enable)");
    } else {
        println!("  Type .exit or press Ctrl-D to quit.");
    }

    let mut session = ReplSession::new();
    let mut rl = DefaultEditor::new()?;
    let hist = history_path();
    if let Some(ref h) = hist {
        let _ = rl.load_history(h);
    }

    let mut buffer = String::new();
    loop {
        let prompt = if buffer.is_empty() { "> " } else { "... " };
        match rl.readline(prompt) {
            Ok(line) => {
                if buffer.is_empty() {
                    let t = line.trim();
                    if t == ".exit" || t == ".quit" {
                        break;
                    }
                    if t.is_empty() {
                        continue;
                    }
                    buffer = line;
                } else {
                    buffer.push('\n');
                    buffer.push_str(&line);
                }

                if session.is_incomplete(&buffer) {
                    continue;
                }

                let _ = rl.add_history_entry(buffer.as_str());
                match session.eval(&buffer).await {
                    Ok(out) => {
                        if !out.is_empty() {
                            println!("{}", out);
                        }
                    }
                    Err(e) => {
                        
                        eprintln!("\x1b[31m{}\x1b[0m", e);
                    }
                }
                buffer.clear();
            }
            Err(ReadlineError::Interrupted) => {
                
                buffer.clear();
                continue;
            }
            Err(ReadlineError::Eof) => break,
            Err(e) => {
                eprintln!("readline error: {}", e);
                break;
            }
        }
    }

    if let Some(ref h) = hist {
        if let Some(dir) = h.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        let _ = rl.save_history(h);
    }
    Ok(())
}

fn history_path() -> Option<std::path::PathBuf> {
    let base = std::env::var_os("HOME").or_else(|| std::env::var_os("USERPROFILE"))?;
    Some(std::path::PathBuf::from(base).join(".ekko").join("repl_history"))
}
