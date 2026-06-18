// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Key {
    None,
    Char,
    Enter,
    Tab,
    Backspace,
    Esc,
    Space,
    Up,
    Down,
    Left,
    Right,
    Home,
    End,
    PageUp,
    PageDown,
    Insert,
    Delete,
    F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct KeyEvent {
    pub key: Key,
    pub ch: char,
    pub ctrl: bool,
    pub alt: bool,
    pub shift: bool,
}

impl KeyEvent {
    
    pub fn of_char(c: char, ctrl: bool, alt: bool) -> Self {
        KeyEvent { key: Key::Char, ch: c, ctrl, alt, shift: false }
    }

    pub fn of(k: Key, ctrl: bool, alt: bool, shift: bool) -> Self {
        KeyEvent { key: k, ch: '\0', ctrl, alt, shift }
    }

    pub fn simple(k: Key) -> Self {
        KeyEvent { key: k, ch: '\0', ctrl: false, alt: false, shift: false }
    }
}

impl Default for KeyEvent {
    fn default() -> Self {
        KeyEvent { key: Key::None, ch: '\0', ctrl: false, alt: false, shift: false }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MouseButton {
    None,
    Left,
    Middle,
    Right,
    WheelUp,
    WheelDown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MouseEvent {
    pub button: MouseButton,
    pub x: u16,
    pub y: u16,
    pub pressed: bool,
    pub released: bool,
}

impl Default for MouseEvent {
    fn default() -> Self {
        MouseEvent { button: MouseButton::None, x: 0, y: 0, pressed: false, released: false }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TuiEvent {
    Key(KeyEvent),
    Mouse(MouseEvent),
    Resize(u16, u16),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_event_of_char() {
        let e = KeyEvent::of_char('a', false, false);
        assert_eq!(e.key, Key::Char);
        assert_eq!(e.ch, 'a');
        assert!(!e.ctrl);
    }

    #[test]
    fn key_event_ctrl_char() {
        let e = KeyEvent::of_char('c', true, false);
        assert!(e.ctrl);
        assert_eq!(e.ch, 'c');
    }

    #[test]
    fn key_event_of() {
        let e = KeyEvent::of(Key::Up, true, false, true);
        assert_eq!(e.key, Key::Up);
        assert!(e.ctrl);
        assert!(e.shift);
        assert!(!e.alt);
    }

    #[test]
    fn mouse_event_default() {
        let e = MouseEvent::default();
        assert_eq!(e.button, MouseButton::None);
        assert!(!e.pressed);
    }

    #[test]
    fn tui_event_variants() {
        let k = TuiEvent::Key(KeyEvent::simple(Key::Enter));
        let m = TuiEvent::Mouse(MouseEvent { button: MouseButton::Left, x: 5, y: 10, pressed: true, released: false });
        let r = TuiEvent::Resize(120, 40);
        assert!(matches!(k, TuiEvent::Key(_)));
        assert!(matches!(m, TuiEvent::Mouse(_)));
        assert!(matches!(r, TuiEvent::Resize(120, 40)));
    }
}
