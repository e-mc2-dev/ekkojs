# ekko-core parser fuzzing (PTR W1.1)

Two layers — a stable always-on harness (runs everywhere) and the coverage-guided operational path.

## 1. Stable property-fuzz (always-on, 3-platform) — RUN THIS IN CI

Deterministic, seedable property fuzzing that runs under plain `cargo test` (stable Rust, no nightly). Each
target feeds the committed `corpus/<target>/` seeds plus N random metacharacter-biased inputs to the parser
under `catch_unwind`; **any panic / failed property = a found bug**. Reproducible: the failing seed is printed.

```bash
# default budget (EKKO_FUZZ_ITERS=20000, EKKO_FUZZ_MAXLEN=4096)
# Per-target COST scaling: the default 20000 is divided by each target's per-iteration cost so an
# expensive backend doesn't dominate `cargo test`. css = cost 20 → 1000 iters (5 grass/lightningcss
# compiles/iter); db/path/vfs = cost 1 → 20000. Setting EKKO_FUZZ_ITERS overrides ALL targets verbatim.
cargo test fuzz_ -- --nocapture

# long run (documented, not silent): millions of iterations / larger inputs
EKKO_FUZZ_ITERS=2000000 EKKO_FUZZ_MAXLEN=65536 cargo test fuzz_ -- --nocapture --test-threads=1
```

Targets (`crates/ekko-core/src/fuzz_support.rs` runner):
| Target | Entry points | Property |
|--------|--------------|----------|
| `css`  | `compile_sass`, `transform_css`, `extract_css_modules` | no panic |
| `db`   | `db_exec`/`db_query` (arbitrary SQL + bound values → `query_to_json`) | no panic |
| `path` | `normalize_str` (fs/path) + `normalize_vfs_path` (VFS resolver) | no panic + **idempotent** |

> **Coverage note (no silent cap):** the stable harness is random + corpus-replay, not coverage-guided. CI
> runs the default budget; the full long run above is an operational/nightly step. Iteration count **and the
> scaling applied** are always logged (`[fuzz <target>] OK: N corpus + M random iters (…, default 20000/cost20)`
> vs `(…, EKKO_FUZZ_ITERS)`), so the per-target cost-divided default is visible, never silent.

`datetime IANA` (plan W1.1) is **.NET**, not Rust — fuzzed via the JS path in **W1.2**.

## 2. Coverage-guided cargo-fuzz (operational upgrade)

`cargo-fuzz` (libFuzzer) gives coverage feedback + corpus minimization. Two prerequisites that block it on
the current stable build server:
1. **nightly + cargo-fuzz**: `rustup toolchain install nightly && cargo install cargo-fuzz`.
2. **parser isolation from V8**: cargo-fuzz's default ASan cannot instrument ekko-core's *prebuilt* static
   V8 (rusty_v8). Either run `cargo +nightly fuzz run <t> -- -runs=… --sanitizer none`, or (preferred)
   extract the pure-Rust parsers (`parsers::css`, `db::sqlite_db`, the path normalizers) into a standalone
   `ekko-parsers` crate with no V8 dependency, then fuzz that crate with ASan. The `corpus/` seeds here are
   directly reusable as the libFuzzer corpus.

Target: ≥ 24h/target, 0 crash/OOM/timeout, minimized corpus committed (the W1.1 exit criterion in full).
