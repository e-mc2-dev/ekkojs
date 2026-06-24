// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::io::Write;

pub struct Terminal {
    initialized: bool,
}

impl Terminal {

    pub fn init() -> anyhow::Result<Self> {
        crossterm::terminal::enable_raw_mode()?;

        let mut stdout = std::io::stdout();
        crossterm::execute!(
            stdout,
            crossterm::terminal::EnterAlternateScreen,
            crossterm::cursor::Hide,
            crossterm::event::EnableMouseCapture,
        )?;
        
        stdout.write_all(b"\x1b[48;2;0;0;0m")?;
        crossterm::execute!(
            stdout,
            crossterm::terminal::Clear(crossterm::terminal::ClearType::All),
            crossterm::cursor::MoveTo(0, 0),
        )?;

        let prev_hook = std::panic::take_hook();
        std::panic::set_hook(Box::new(move |info| {
            let _ = Self::restore_raw();
            prev_hook(info);
        }));

        Ok(Terminal { initialized: true })
    }

    
    pub fn restore(&mut self) {
        if !self.initialized { return; }
        self.initialized = false;
        let _ = Self::restore_raw();
    }

    fn restore_raw() -> anyhow::Result<()> {
        let mut stdout = std::io::stdout();
        crossterm::execute!(
            stdout,
            crossterm::event::DisableMouseCapture,
            crossterm::cursor::Show,
            crossterm::terminal::LeaveAlternateScreen,
        )?;

        
        while crossterm::event::poll(std::time::Duration::from_millis(0)).unwrap_or(false) {
            let _ = crossterm::event::read();
        }
        crossterm::terminal::disable_raw_mode()?;
        
        stdout.write_all(b"\x1b[0m")?;
        stdout.flush()?;
        Ok(())
    }

    pub fn size() -> (u16, u16) {
        crossterm::terminal::size().unwrap_or((80, 25))
    }
}

impl Drop for Terminal {
    fn drop(&mut self) {
        self.restore();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn size_returns_valid_dimensions() {
        let (w, h) = Terminal::size();
        assert!(w > 0);
        assert!(h > 0);
    }
}
