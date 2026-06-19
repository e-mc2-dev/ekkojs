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
pub enum TokenKind {
    Plain,
    Keyword,
    Type,
    String,
    Number,
    Comment,
    Operator,
    Punctuation,
    Identifier,
    Function,
    Preprocessor,
    Heading,
    Bold,
    Italic,
    BoldItalic,
    Link,
    CodeSpan,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Token {
    pub start: usize,
    pub length: usize,
    pub kind: TokenKind,
}

impl Token {
    
    pub const fn new(start: usize, length: usize, kind: TokenKind) -> Self {
        Token { start, length, kind }
    }

    pub fn end(&self) -> usize {
        self.start + self.length
    }
}

pub trait Highlighter: Send + Sync {
    fn name(&self) -> &str;
    fn tokenize_line(&self, line: &str, state: &mut i32) -> Vec<Token>;
}

pub struct RegexHighlighter {
    name: String,
    rules: Vec<(fancy_regex::Regex, TokenKind)>,
    has_block_comments: bool,
}

impl RegexHighlighter {
    
    pub fn new(name: &str, rules: Vec<(fancy_regex::Regex, TokenKind)>) -> Self {
        RegexHighlighter {
            name: name.to_string(),
            rules,
            has_block_comments: false,
        }
    }

    pub fn with_block_comments(name: &str, rules: Vec<(fancy_regex::Regex, TokenKind)>) -> Self {
        RegexHighlighter {
            name: name.to_string(),
            rules,
            has_block_comments: true,
        }
    }
}

impl Highlighter for RegexHighlighter {
    
    fn name(&self) -> &str { &self.name }

    fn tokenize_line(&self, line: &str, state: &mut i32) -> Vec<Token> {
        
        if self.has_block_comments {
            if let Some(tokens) = handle_block_comment_state(line, state, &self.rules) {
                return tokens;
            }
        }

        let mut result = Vec::with_capacity(8);
        let mut i = 0;
        while i < line.len() {
            let mut best_start: Option<usize> = None;
            let mut best_len = 0usize;
            let mut best_kind = TokenKind::Plain;

            for (rx, kind) in &self.rules {
                if let Some(m) = rx.find_from_pos(line, i).ok().flatten() {
                    match best_start {
                        None => {
                            best_start = Some(m.start());
                            best_len = m.end() - m.start();
                            best_kind = *kind;
                            if m.start() == i { break; }
                        }
                        Some(bs) if m.start() < bs => {
                            best_start = Some(m.start());
                            best_len = m.end() - m.start();
                            best_kind = *kind;
                            if m.start() == i { break; }
                        }
                        _ => {}
                    }
                }
            }

            match best_start {
                None => break,
                Some(_) if best_len == 0 => { i += 1; continue; }
                Some(bs) => {
                    result.push(Token::new(bs, best_len, best_kind));
                    i = bs + best_len;
                }
            }
        }

        if self.has_block_comments && *state == 0 {
            if let Some(oi) = line.find("/*") {
                if line[oi + 2..].find("*/").is_none() {
                    *state = 1;
                }
            }
        }

        result
    }
}

fn handle_block_comment_state(
    line: &str,
    state: &mut i32,
    rules: &[(fancy_regex::Regex, TokenKind)],
) -> Option<Vec<Token>> {
    if *state != 1 { return None; }

    match line.find("*/") {
        None => {
            *state = 1;
            Some(vec![Token::new(0, line.len(), TokenKind::Comment)])
        }
        Some(close_idx) => {
            let mut tokens = vec![Token::new(0, close_idx + 2, TokenKind::Comment)];

            let remainder = &line[close_idx + 2..];
            if !remainder.is_empty() {
                let tmp = RegexHighlighter::new("_tmp", rules.to_vec());
                let mut rs = 0i32;
                let rt = tmp.tokenize_line(remainder, &mut rs);
                for t in rt {
                    tokens.push(Token::new(t.start + close_idx + 2, t.length, t.kind));
                }
                
                if let Some(ro) = remainder.find("/*") {
                    if remainder[ro + 2..].find("*/").is_none() {
                        *state = 1;
                        return Some(tokens);
                    }
                }
            }

            *state = 0;
            Some(tokens)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_highlighter() -> RegexHighlighter {
        let rules = vec![
            (fancy_regex::Regex::new(r"//[^\n]*").unwrap(), TokenKind::Comment),
            (fancy_regex::Regex::new(r#""[^"]*""#).unwrap(), TokenKind::String),
            (fancy_regex::Regex::new(r"\b\d+\b").unwrap(), TokenKind::Number),
        ];
        RegexHighlighter::new("test", rules)
    }

    #[test]
    fn tokenize_empty_line() {
        let h = make_test_highlighter();
        let mut state = 0;
        let tokens = h.tokenize_line("", &mut state);
        assert!(tokens.is_empty());
    }

    #[test]
    fn tokenize_plain_text() {
        let h = make_test_highlighter();
        let mut state = 0;
        let tokens = h.tokenize_line("hello world", &mut state);
        assert!(tokens.is_empty());
    }

    #[test]
    fn tokenize_comment() {
        let h = make_test_highlighter();
        let mut state = 0;
        let tokens = h.tokenize_line("// this is a comment", &mut state);
        assert_eq!(tokens.len(), 1);
        assert_eq!(tokens[0].kind, TokenKind::Comment);
        assert_eq!(tokens[0].start, 0);
        assert_eq!(tokens[0].length, 20);
    }

    #[test]
    fn tokenize_string() {
        let h = make_test_highlighter();
        let mut state = 0;
        let tokens = h.tokenize_line(r#"let x = "hello""#, &mut state);
        assert!(!tokens.is_empty());
        let string_tok = tokens.iter().find(|t| t.kind == TokenKind::String).unwrap();
        assert_eq!(&r#"let x = "hello""#[string_tok.start..string_tok.end()], r#""hello""#);
    }

    #[test]
    fn tokenize_number() {
        let h = make_test_highlighter();
        let mut state = 0;
        let tokens = h.tokenize_line("value = 42", &mut state);
        let num_tok = tokens.iter().find(|t| t.kind == TokenKind::Number).unwrap();
        assert_eq!(&"value = 42"[num_tok.start..num_tok.end()], "42");
    }

    #[test]
    fn block_comment_state() {
        let rules = vec![
            (fancy_regex::Regex::new(r"//[^\n]*").unwrap(), TokenKind::Comment),
            (fancy_regex::Regex::new(r"/\*.*?\*/").unwrap(), TokenKind::Comment),
            (fancy_regex::Regex::new(r"\b\d+\b").unwrap(), TokenKind::Number),
        ];
        let h = RegexHighlighter::with_block_comments("test", rules);

        let mut state = 0;
        let t1 = h.tokenize_line("/* start of comment", &mut state);
        assert_eq!(state, 1);

        let t2 = h.tokenize_line("still in comment", &mut state);
        assert_eq!(state, 1);
        assert_eq!(t2.len(), 1);
        assert_eq!(t2[0].kind, TokenKind::Comment);
        assert_eq!(t2[0].length, 16);

        let t3 = h.tokenize_line("end */ 42", &mut state);
        assert_eq!(state, 0);
        assert!(t3.iter().any(|t| t.kind == TokenKind::Comment));
    }
}
