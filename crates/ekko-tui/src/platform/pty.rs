// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use portable_pty::{native_pty_system, CommandBuilder, PtySize, Child, MasterPty};
use std::io::{Read, Write};

pub struct PtyProcess {
    master: Box<dyn MasterPty + Send>,
    reader: Option<Box<dyn Read + Send>>,
    writer: Option<Box<dyn Write + Send>>,
    child: Box<dyn Child + Send + Sync>,
}

impl PtyProcess {
    
    pub fn spawn(
        program: &str,
        args: &[&str],
        cwd: Option<&str>,
        rows: u16,
        cols: u16,
    ) -> anyhow::Result<Self> {
        let pty_system = native_pty_system();
        let pair = pty_system.openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        let mut cmd = CommandBuilder::new(program);
        for arg in args { cmd.arg(*arg); }
        if let Some(dir) = cwd { cmd.cwd(dir); }
        cmd.env("TERM", "xterm-256color");

        let child = pair.slave.spawn_command(cmd)?;
        let reader = pair.master.try_clone_reader()?;
        let writer = pair.master.take_writer()?;

        Ok(PtyProcess {
            master: pair.master,
            reader: Some(reader),
            writer: Some(writer),
            child,
        })
    }

    pub fn take_reader(&mut self) -> Box<dyn Read + Send> {
        self.reader.take().expect("reader already taken")
    }

    pub fn take_writer_box(&mut self) -> Box<dyn Write + Send> {
        self.writer.take().expect("writer already taken")
    }

    pub fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        match &mut self.reader {
            Some(r) => r.read(buf),
            None => Ok(0),
        }
    }

    pub fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
        match &mut self.writer {
            Some(w) => w.write(bytes),
            None => Ok(0),
        }
    }

    pub fn resize(&self, rows: u16, cols: u16) -> anyhow::Result<()> {
        self.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;
        Ok(())
    }

    pub fn is_alive(&mut self) -> bool {
        self.child.try_wait().ok().flatten().is_none()
    }

    pub fn kill(&mut self) -> std::io::Result<()> {
        self.child.kill()
    }

    pub fn wait(&mut self) -> std::io::Result<portable_pty::ExitStatus> {
        self.child.wait()
    }
}

impl Drop for PtyProcess {
    fn drop(&mut self) {
        let _ = self.child.kill();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn spawn_echo() {
        let cmd = if cfg!(windows) { "cmd" } else { "echo" };
        let args: &[&str] = if cfg!(windows) { &["/C", "echo hello"] } else { &["hello"] };
        let mut proc = PtyProcess::spawn(cmd, args, None, 24, 80).unwrap();

        let mut buf = [0u8; 1024];
        let mut output = String::new();
        for _ in 0..20 {
            match proc.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => output.push_str(&String::from_utf8_lossy(&buf[..n])),
                Err(_) => break,
            }
            if output.contains("hello") { break; }
        }
        assert!(output.contains("hello"), "Expected 'hello' in output, got: {}", output);
    }

    #[test]
    fn spawn_and_kill() {
        let cmd = if cfg!(windows) { "cmd" } else { "sleep" };
        let args: &[&str] = if cfg!(windows) { &["/C", "timeout /t 30"] } else { &["30"] };
        let mut proc = PtyProcess::spawn(cmd, args, None, 24, 80).unwrap();
        assert!(proc.is_alive());
        proc.kill().unwrap();
        std::thread::sleep(std::time::Duration::from_millis(100));
        assert!(!proc.is_alive());
    }

    #[test]
    fn resize_pty() {
        let cmd = if cfg!(windows) { "cmd" } else { "cat" };
        let args: &[&str] = if cfg!(windows) { &["/C", "echo ok"] } else { &[] };
        let mut proc = PtyProcess::spawn(cmd, args, None, 24, 80).unwrap();
        proc.resize(40, 120).unwrap();
        let _ = proc.kill();
    }
}
