// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



#![cfg(test)]

use std::panic::{catch_unwind, AssertUnwindSafe};
use std::path::PathBuf;

pub(crate) struct Rng(u64);
impl Rng {
    pub fn new(seed: u64) -> Self {
        Rng(if seed == 0 { 0x9E3779B97F4A7C15 } else { seed })
    }
    pub fn next_u64(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.0 = x;
        x.wrapping_mul(0x2545F4914F6CDD1D)
    }
    pub fn below(&mut self, n: usize) -> usize {
        if n == 0 {
            0
        } else {
            (self.next_u64() % n as u64) as usize
        }
    }
}

pub(crate) fn gen_input(rng: &mut Rng, max_len: usize) -> String {
    const META: &[u8] = b"{}();:,.\"'/\\<>%&#@$*+-=[]!?|~^ \t\n\r0123456789abcXYZ_";
    let target = rng.below(max_len.max(1));
    let mut s = String::with_capacity(target);
    while s.len() < target {
        let r = rng.next_u64();
        match r % 16 {
            0..=9 => s.push(META[rng.below(META.len())] as char), 
            10 => {

                let cp = (r as u32) % 0x11_0000;
                s.push(char::from_u32(cp).unwrap_or('\u{FFFD}'));
            }
            11 => s.push(((r % 32) as u8) as char), 
            12 => {
                
                for _ in 0..rng.below(96) {
                    s.push(META[rng.below(META.len())] as char);
                }
            }
            _ => s.push((b'a' + (r % 26) as u8) as char),
        }
    }
    s
}

pub(crate) fn corpus(target: &str) -> Vec<String> {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("fuzz/corpus")
        .join(target);
    let mut out = Vec::new();
    if let Ok(rd) = std::fs::read_dir(&dir) {
        for e in rd.flatten() {
            if let Ok(bytes) = std::fs::read(e.path()) {
                out.push(String::from_utf8_lossy(&bytes).into_owned());
            }
        }
    }
    out
}

fn iters_for(cost: u64) -> (u64, bool) {
    match std::env::var("EKKO_FUZZ_ITERS").ok().and_then(|s| s.parse::<u64>().ok()) {
        Some(n) => (n, true),
        None => (20_000 / cost.max(1), false),
    }
}
fn max_len() -> usize {
    std::env::var("EKKO_FUZZ_MAXLEN")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(4096)
}

pub(crate) fn run_fuzz(name: &str, f: impl Fn(&str)) {
    run_fuzz_cost(name, 1, f)
}

pub(crate) fn run_fuzz_cost(name: &str, cost: u64, f: impl Fn(&str)) {
    let seeds = corpus(name);
    for inp in &seeds {
        if catch_unwind(AssertUnwindSafe(|| f(inp))).is_err() {
            panic!("[fuzz {name}] PANIC on CORPUS input: {inp:?}");
        }
    }
    let (n, explicit) = iters_for(cost);
    let ml = max_len();
    for i in 0..n {
        let seed = 0x9E3779B97F4A7C15u64 ^ i.wrapping_mul(0x100000001B3);
        let mut rng = Rng::new(seed);
        let input = gen_input(&mut rng, ml);
        if catch_unwind(AssertUnwindSafe(|| f(&input))).is_err() {
            panic!("[fuzz {name}] PANIC at iter {i} (seed {seed:#x}); input={input:?}");
        }
    }
    let scaled = if explicit { "EKKO_FUZZ_ITERS".to_string() } else { format!("default 20000/cost{cost}") };
    eprintln!(
        "[fuzz {name}] OK: {} corpus + {} random iters (max_len {}, {})",
        seeds.len(),
        n,
        ml,
        scaled
    );
}
