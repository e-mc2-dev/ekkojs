# EkkoJS E2E Coverage Tracker

Single source of truth for **which modules have E2E coverage** in the final pre-prod campaign.
Module list mirrors [`_llm/ekko-modules-llm.md`](../_llm/ekko-modules-llm.md) (33 modules). Detailed
per-file assertion counts live in [`_index.md`](_index.md); this file is the at-a-glance checklist.

**Update this table at the end of every E2E task** — it is the gate for "is this module done?".

## Column meaning (definition of done per column)

| Column | ✅ means |
|--------|---------|
| **E2E covered** | A dedicated `*.e2e.ts` exercises the module's happy-path API surface, green on Linux x64 / Windows x64 / macOS arm64. |
| **E2E Cybersec** | Permission gating + abuse/hardening tested: denied-without-`--allow`, scoped grants, injection / traversal / env-injection / no-shell, tamper, etc. |
| **E2E recheck** | Deliberately re-audited against **production failure modes** beyond happy-path (edge cases, encoding/unicode, concurrency, lifecycle races, large/streaming I/O, idempotency). The "are we sure we have *enough*?" pass — this is where real bugs surface. |

Legend: ✅ done · ◐ partial (see notes) · ⬜ not yet · — not applicable (pure-JS module with no native/permission/abuse surface).

## I/O & System (require permissions)

| Module | E2E covered | E2E Cybersec | E2E recheck |
|--------|:-----------:|:------------:|:-----------:|
| `ekko:fs` | ✅ | ✅ | ✅ |
| `ekko:fs/path` | ✅ | ✅ | ✅ |
<!-- task 275: ekko:fs VFS-as-primary-filesystem mode (read from .ekl / write to real-FS rooted at the run
     root) is integration-tested by `_build/remote/30-ekl-vfs-run.sh` (pack→copy→run --ekl), green on
     Linux x64 / Windows x64 / macOS arm64. In-process `ekko test` has no app-root, so the in-process
     ekko:fs e2e (above) is unchanged (legacy CWD-relative). -->

| `ekko:net` | ✅ | ✅ | ✅ |
| `ekko:crypto` | ✅ | ✅ | ✅ |
| `ekko:process` | ✅ | ✅ | ✅ |
| `ekko:ffi` | ✅ | ✅ | ✅ |

## Database

| Module | E2E covered | E2E Cybersec | E2E recheck |
|--------|:-----------:|:------------:|:-----------:|
| `ekko:db` | ✅ | ✅ | ✅ |
| `ekko:db/orm` | ✅ | ✅ | ✅ |

## Data & Text

| Module | E2E covered | E2E Cybersec | E2E recheck |
|--------|:-----------:|:------------:|:-----------:|
| `ekko:text/encoding` | ✅ | ✅ | ✅ |
| `ekko:text/json` | ✅ | ✅ | ✅ |
| `ekko:text/regex` | ✅ | ✅ | ✅ |
| `ekko:compress` | ✅ | ✅ | ✅ |
| `ekko:image` | ✅ | ✅ | ✅ |
| `ekko:datetime` | ✅ | ✅ | ✅ |
| `ekko:log` | ✅ | ✅ | ✅ |

## Frameworks

| Module | E2E covered | E2E Cybersec | E2E recheck |
|--------|:-----------:|:------------:|:-----------:|
| `ekko:ssr` | ✅ | ✅ | ✅ |
| `ekko:ssr/css` | ✅ | ✅ | ✅ |
| `ekko:rune` | ✅ | ✅ | ✅ |
| `ekko:rune/mimir` | ✅ | ✅ | ✅ |
| `ekko:rune/router` | ✅ | ✅ | ✅ |
| `ekko:rune/seo` | ✅ | ✅ | ✅ |

## Web

| Module | E2E covered | E2E Cybersec | E2E recheck |
|--------|:-----------:|:------------:|:-----------:|
| `ekko:web` | ✅ | ✅ | ✅ |
| `ekko:web/realtime` | ✅ | ✅ | ✅ |
| `ekko:web/graphql` | ✅ | ✅ | ✅ |
| `ekko:web/validate` | ✅ | ✅ | ✅ |

## Auth

| Module | E2E covered | E2E Cybersec | E2E recheck |
|--------|:-----------:|:------------:|:-----------:|
| `ekko:auth` | ✅ | ✅ | ✅ |
| `ekko:auth/rbac` | ✅ | ✅ | ✅ |

## Testing

| Module | E2E covered | E2E Cybersec | E2E recheck |
|--------|:-----------:|:------------:|:-----------:|
| `ekko:test` | ✅³ | — | ✅³ |
| `ekko:test/assert` | ✅ | — | ✅ |

## Jobs

| Module | E2E covered | E2E Cybersec | E2E recheck |
|--------|:-----------:|:------------:|:-----------:|
| `ekko:job/cron` | ✅ | — | ✅ |
| `ekko:job/queue` | ✅ | — | ✅ |

## Application

| Module | E2E covered | E2E Cybersec | E2E recheck |
|--------|:-----------:|:------------:|:-----------:|
| `ekko:app/cli` | ✅ | — | ✅ |
| `ekko:app/gui` | ✅¹ | — | — |
| `ekko:app/tui` | ✅² | — | ✅² |

## Totals

| | E2E covered | E2E Cybersec | E2E recheck |
|--|:-----------:|:------------:|:-----------:|
| **Done** | 33 / 33 | 26 (of applicable; test/* + job/* + app/* cybersec N/A) | 32 / 33 |

¹ `ekko:app/gui` — JS surface (export contract + onMessage) covered headlessly; window/tray/menu ops require a running `ekko gui` host + display (integration, not headless). recheck N/A (thin native shim).
² `ekko:app/tui` — pure layout/cell engine covered + recheck; `render`/`onInput`/hooks/reconciler require an `ekko tui` PTY host (interactive, not headless).
³ `ekko:test` — mocking + fake timers added (task 272): `e2e/runtime/test-mock.e2e.ts` covers `mock.fn`/`method`/`spyOn`+restore/restoreAll, fake timers (advance/runAll/runOnlyPending/setSystemTime/Date shim/runaway guard/useRealTimers), and `mock.module` (dynamic-import scope). recheck: double-restore, restore-with-no-mock, nested fake-timers, non-object factory.

Covered so far: `ekko:fs`, `ekko:fs/path`, `ekko:process`, `ekko:ffi` — **all four are now through the
full recheck pass**. Bugs found via recheck: `ekko:process` (200–203, 4 FFI bugs), `ekko:ffi` (204 —
null-cstring footgun + arity locks), `ekko:fs` (205 — error codes derived from real io::Error),
`ekko:fs/path` (206 — std::path divergences). `ekko:net` (207 DNS+UDP+cybersec, 208 standalone TCP
server connection handler + echo round-trip + recheck — found & fixed: dead `handlerId`/no server
delivery, `tcp.listen` now returns the handle, `udp.recv` `ip`→`address`, `localhost` accepted).
`ekko:net` cybersec also had an **adversarial pass** (209): found + fixed a scope-escape — `udp.send`
and `tcp.listen` ignored the `net:<host>` scope (UDP exfiltration / bind-all-interfaces). Lesson: a
cybersec ✅ needs bypass tests, not just gate-presence. `ekko:crypto` (212): KATs (NIST/RFC) + AES-GCM
auth + RSA/ECDSA + CSPRNG all solid; found + fixed an **ECDSA permission bypass** (generate/sign/verify
skipped `check_perm!`). `ekko:db` (213): SQLite engine solid, but found + fixed a **total permission
bypass** — `db_open` had no gate so file-backed dbs read/wrote disk with NO `--allow`, and even a
`:memory:` db escaped via `ATTACH DATABASE`/`VACUUM … INTO`. Fixed: `check_perm!(fs,path)` on open
(`:memory:` exempt) + a SQLite authorizer gating attach by fs-scope (contains both escapes; verified
incl. VACUUM INTO). Also a **recheck serialization bug**: control-char TEXT + non-finite REAL produced
invalid JSON → `db.query` threw — rebuilt `query_to_json` on serde_json. 205 db assertions
(covered 140 / permissions 15 / scope 12 / recheck 38), 3-platform green. `ekko:db/orm` (214): existing
ORM v2 suite (80/80) is solid over a `Database`-object connect and is SQL-injection-safe (values bind
`@p0`, never interpolated), but the connect-by-path/pool path had 4 real bugs — (1) the `__ekko_db_open`
opener was injected as a GLOBAL then cleared, breaking lazy path-open AND violating the no-global rule;
(2) `connect("<path>")` threw "Unknown driver"; (3) `where({field:null})` emitted `= NULL` (0 rows) not
`IS NULL`; (4) `pool.close()` killed the parent (shared handle). Fixed: orm.js is now a factory receiving
`__ekko_db_open` as a SCOPED parameter (no global, mirrors ssr/web), makeConn string→path fallback,
null→IS_NULL, borrowed-handle flag. 173 orm assertions (core 123 / permissions 16 / recheck 34),
3-platform green; v2 suite non-regressed. `ekko:text/encoding` (215): .NET-backed (EncodingApi); probed
full surface + adversarial malformed input — **no bug** (E2E-only). base64/hex RFC vectors exact; invalid
base64/hex throw cleanly (FormatException → FFI Err → JS throw, never crash); utf8/utf16 use U+FFFD
replacement fallback; 0x00–0xFF binary fidelity perfect. .NET quirks locked (whitespace-tolerant base64,
case-insensitive hex); `extract_bytes` string-to-encode footgun locked. 124 assertions (covered 68 /
hardening 23 / recheck 33), 3-platform green. `ekko:text/json` (216): V8-native parse/stringify correct/strict; found + fixed 3 real
bugs in the .NET streaming JsonApi — writer `Split(':',3)` truncated colon-bearing values/keys
(`valueString:http://x:8080`→`"http"`), reader Number via `GetDecimal()` threw on valid out-of-range JSON
(`1e400`), and `number:key` (missing value) → IndexOutOfRange. Fixed: first-colon split + InvariantCulture
+ graceful missing-value; reader Number → exact UTF-8 value text. Doc corrected (camelCase tokens + real
writer commands). 87 json assertions (covered 32 / hardening 24 / recheck 31), 3-platform green. Also
**filed**: task 217 (json.parse deep-nesting → native stack overflow / process-crash DoS, different layer)
and task 218 (global TextEncoder emits WTF-8 surrogate bytes for astral chars, not valid UTF-8). Next
modules: compress, datetime, log, web, ssr, rune, … `ekko:text/regex` (219): .NET-backed Regex solid
(\d\w\s, named/unnamed groups, match.index UTF-16-aligned, $1/${name}/$$ substitution, .NET
split-includes-captures, correct EscapeJson); found + fixed a **ReDoS DoS** (no MatchTimeout — `(a+)+$`
hung the thread forever, proven exit-124) via a 2s MatchTimeout, plus the ignored `x` flag
(IgnorePatternWhitespace) and the `MatchResult` field name (`match`→`value`, matching the doc). 87 regex
assertions (covered 39 / hardening 17 / recheck 31), 3-platform green.
