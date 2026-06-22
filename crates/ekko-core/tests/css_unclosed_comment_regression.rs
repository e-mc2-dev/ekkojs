// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



use ekko_core::parsers::css::{compile_sass, SassSyntax};
use std::time::Duration;

fn compile_bounded(input: &str, syntax: SassSyntax) -> Result<Result<String, String>, ()> {
    let (tx, rx) = std::sync::mpsc::channel();
    let inp = input.to_string();
    std::thread::spawn(move || { let _ = tx.send(compile_sass(&inp, syntax)); });
    rx.recv_timeout(Duration::from_secs(10)).map_err(|_| ())
}

#[test]
fn sass_unclosed_comment_does_not_hang() {
    for input in ["a\n/*", "sssL/*!#}", "/*! unclosed", "x\n  /* nope"] {
        let r = compile_bounded(input, SassSyntax::Sass);
        assert!(r.is_ok(), "compile_sass(Sass) HUNG on unclosed comment: {:?}", input);
        assert!(r.unwrap().is_err(), "unclosed comment should be an Err: {:?}", input);
    }
    assert!(compile_sass("a { /* unclosed", SassSyntax::Scss).is_err());
}

#[test]
fn sass_cr_and_control_chars_do_not_hang() {
    
    for input in ["\r \r \r", "a\r\n/*!*/\rb", "\r*\r*\r/*\r*/", "x\r\ty\r\nz"] {
        let r = compile_bounded(input, SassSyntax::Sass);
        assert!(r.is_ok(), "compile_sass(Sass) HUNG on CR/control input: {:?}", input);
    }
    
    let r = compile_bounded("a\0b\nc: d", SassSyntax::Sass);
    assert!(r.is_ok(), "NUL input hung");
}

#[test]
fn valid_css_still_compiles_no_false_positive() {
    
    let crlf = compile_sass("a {\r\n  color: red;\r\n}\r\n", SassSyntax::Scss);
    assert!(crlf.is_ok(), "valid CRLF stylesheet must compile: {:?}", crlf);
    
    assert!(compile_sass("a { color: red; /* note */ }", SassSyntax::Scss).is_ok());
    assert!(compile_sass("a { content: \"/* not a comment\"; }", SassSyntax::Scss).is_ok());
    assert!(compile_sass("a\n  color: red", SassSyntax::Sass).is_ok());
}
