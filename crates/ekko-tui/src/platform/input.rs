// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use crossterm::event::{self, Event, KeyCode, KeyModifiers};
use crate::events::{Key, KeyEvent, MouseButton, MouseEvent, TuiEvent};
use std::time::Duration;

pub fn poll_event(timeout: Duration) -> Option<TuiEvent> {
    if !event::poll(timeout).unwrap_or(false) {
        return None;
    }
    match event::read() {
        Ok(Event::Key(k)) if k.kind == event::KeyEventKind::Press => Some(TuiEvent::Key(map_key_event(k))),
        Ok(Event::Key(_)) => None,
        Ok(Event::Mouse(m)) => Some(TuiEvent::Mouse(map_mouse_event(m))),
        Ok(Event::Resize(w, h)) => Some(TuiEvent::Resize(w, h)),
        _ => None,
    }
}

fn map_key_event(k: event::KeyEvent) -> KeyEvent {
    let ctrl = k.modifiers.contains(KeyModifiers::CONTROL);
    let alt = k.modifiers.contains(KeyModifiers::ALT);
    let shift = k.modifiers.contains(KeyModifiers::SHIFT);

    match k.code {
        KeyCode::Char(c) => KeyEvent { key: Key::Char, ch: c, ctrl, alt, shift },
        KeyCode::Enter => KeyEvent::of(Key::Enter, ctrl, alt, shift),
        KeyCode::Tab => KeyEvent::of(Key::Tab, ctrl, alt, shift),
        KeyCode::Backspace => KeyEvent::of(Key::Backspace, ctrl, alt, shift),
        KeyCode::Esc => KeyEvent::of(Key::Esc, ctrl, alt, shift),
        KeyCode::Up => KeyEvent::of(Key::Up, ctrl, alt, shift),
        KeyCode::Down => KeyEvent::of(Key::Down, ctrl, alt, shift),
        KeyCode::Left => KeyEvent::of(Key::Left, ctrl, alt, shift),
        KeyCode::Right => KeyEvent::of(Key::Right, ctrl, alt, shift),
        KeyCode::Home => KeyEvent::of(Key::Home, ctrl, alt, shift),
        KeyCode::End => KeyEvent::of(Key::End, ctrl, alt, shift),
        KeyCode::PageUp => KeyEvent::of(Key::PageUp, ctrl, alt, shift),
        KeyCode::PageDown => KeyEvent::of(Key::PageDown, ctrl, alt, shift),
        KeyCode::Insert => KeyEvent::of(Key::Insert, ctrl, alt, shift),
        KeyCode::Delete => KeyEvent::of(Key::Delete, ctrl, alt, shift),
        KeyCode::F(1) => KeyEvent::of(Key::F1, ctrl, alt, shift),
        KeyCode::F(2) => KeyEvent::of(Key::F2, ctrl, alt, shift),
        KeyCode::F(3) => KeyEvent::of(Key::F3, ctrl, alt, shift),
        KeyCode::F(4) => KeyEvent::of(Key::F4, ctrl, alt, shift),
        KeyCode::F(5) => KeyEvent::of(Key::F5, ctrl, alt, shift),
        KeyCode::F(6) => KeyEvent::of(Key::F6, ctrl, alt, shift),
        KeyCode::F(7) => KeyEvent::of(Key::F7, ctrl, alt, shift),
        KeyCode::F(8) => KeyEvent::of(Key::F8, ctrl, alt, shift),
        KeyCode::F(9) => KeyEvent::of(Key::F9, ctrl, alt, shift),
        KeyCode::F(10) => KeyEvent::of(Key::F10, ctrl, alt, shift),
        KeyCode::F(11) => KeyEvent::of(Key::F11, ctrl, alt, shift),
        KeyCode::F(12) => KeyEvent::of(Key::F12, ctrl, alt, shift),
        _ => KeyEvent::default(),
    }
}

fn map_mouse_event(m: event::MouseEvent) -> MouseEvent {
    use event::MouseEventKind;
    let (button, pressed, released) = match m.kind {
        MouseEventKind::Down(b) => (map_button(b), true, false),
        MouseEventKind::Up(b) => (map_button(b), false, true),
        MouseEventKind::Drag(b) => (map_button(b), true, false),
        MouseEventKind::Moved => (MouseButton::None, false, false),
        MouseEventKind::ScrollUp => (MouseButton::WheelUp, true, false),
        MouseEventKind::ScrollDown => (MouseButton::WheelDown, true, false),
        _ => (MouseButton::None, false, false),
    };
    MouseEvent { button, x: m.column, y: m.row, pressed, released }
}

fn map_button(b: event::MouseButton) -> MouseButton {
    match b {
        event::MouseButton::Left => MouseButton::Left,
        event::MouseButton::Right => MouseButton::Right,
        event::MouseButton::Middle => MouseButton::Middle,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn map_char_key() {
        let ct = event::KeyEvent::new(KeyCode::Char('a'), KeyModifiers::NONE);
        let e = map_key_event(ct);
        assert_eq!(e.key, Key::Char);
        assert_eq!(e.ch, 'a');
        assert!(!e.ctrl);
    }

    #[test]
    fn map_ctrl_c() {
        let ct = event::KeyEvent::new(KeyCode::Char('c'), KeyModifiers::CONTROL);
        let e = map_key_event(ct);
        assert_eq!(e.key, Key::Char);
        assert_eq!(e.ch, 'c');
        assert!(e.ctrl);
    }

    #[test]
    fn map_arrow_with_shift() {
        let ct = event::KeyEvent::new(KeyCode::Up, KeyModifiers::SHIFT);
        let e = map_key_event(ct);
        assert_eq!(e.key, Key::Up);
        assert!(e.shift);
    }

    #[test]
    fn map_function_keys() {
        for n in 1..=12u8 {
            let ct = event::KeyEvent::new(KeyCode::F(n), KeyModifiers::NONE);
            let e = map_key_event(ct);
            let expected = match n {
                1 => Key::F1, 2 => Key::F2, 3 => Key::F3, 4 => Key::F4,
                5 => Key::F5, 6 => Key::F6, 7 => Key::F7, 8 => Key::F8,
                9 => Key::F9, 10 => Key::F10, 11 => Key::F11, 12 => Key::F12,
                _ => Key::None,
            };
            assert_eq!(e.key, expected);
        }
    }

    #[test]
    fn map_mouse_down() {
        let ct = event::MouseEvent {
            kind: event::MouseEventKind::Down(event::MouseButton::Left),
            column: 5,
            row: 10,
            modifiers: KeyModifiers::NONE,
        };
        let e = map_mouse_event(ct);
        assert_eq!(e.button, MouseButton::Left);
        assert_eq!(e.x, 5);
        assert_eq!(e.y, 10);
        assert!(e.pressed);
        assert!(!e.released);
    }

    #[test]
    fn map_mouse_scroll() {
        let ct = event::MouseEvent {
            kind: event::MouseEventKind::ScrollUp,
            column: 0,
            row: 0,
            modifiers: KeyModifiers::NONE,
        };
        let e = map_mouse_event(ct);
        assert_eq!(e.button, MouseButton::WheelUp);
        assert!(e.pressed);
    }
}
