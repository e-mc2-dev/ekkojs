# EkkoJS — Final Extensive E2E Test Campaign

**Goal:** A comprehensive end-to-end test suite covering the entire EkkoJS surface — every
`ekko:*` builtin, every `ekko-lib` package, the runtime core, the web/framework stack, and the
packaging/publishing toolchain — with **5,000+ assertions total**, all green on **Linux x64,
Windows x64, and macOS arm64**.

This is the acceptance gate for declaring the library production-complete. No module is exempt.

> **Per-module checklist:** [`_coverage.md`](_coverage.md) tracks every module with three checkboxes
> — **E2E covered**, **E2E Cybersec**, **E2E recheck** (deep edge-case audit). **Every E2E task must
> update it.** A module is only "done" when all three applicable boxes are ✅ on all 3 platforms.

---

## Status

| Metric | Target | Current |
|--------|-------:|--------:|
| **Total assertions** | **5,000+** | **3,158** (full `run-all.sh` verified, 3-platform green — W3 soak harnesses `system/http-soak` 7 + `system/ws-soak` 6 + `system/db-soak` 7 + `system/queue-soak` 6 + W6.4 `system/chaos-faults` 10 + W6.3 `system/metrics` 17 + W3.5 `security/ws-client-recv` 5 + W4 audit suites: `system/auth-deepaudit` 22, `system/rbac-deepaudit` 35, `security/web-csrf` 11, `security/orm-injection` 25, `security/web-header-crlf` 8, `security/web-static-traversal` 16, `system/crypto-kat` 19; also recursion-bomb 23, js-parser-fuzz 9, differential-fuzz 4, structured-clone-fuzz 15, panic-safety 6, isolate-churn 8, channel-load 9, stack-limit 7, inprocess-fetch 5, env-permissions 7, web-bypass 8) |
| Files covered | 55 | **116** (all 33 modules + PTR W1/W2 + W3 soak harnesses http/ws/db/queue + W3.5 ws-client-recv + W6.3 metrics + W6.4 chaos-faults + W4 audit suites) |
| Platforms green | 3 (Linux / Windows / macOS) | **3 ✓ — FULL campaign `run-all.sh` green (Linux 3158 / Windows 3153 / macOS 3158, 116 files, 0 failed)**, verified post W3 soak harnesses (http/ws/db/queue) + W3.5 (over-wire WS+TLS) + W4 (security re-audit) + W6.1/6.2/6.3/6.4/6.5 (integrity, dep+license, observability, chaos, resource-limits) on the rebuilt 3-platform binaries (Win delta = platform-conditional fs/path) |

> PTR W1.5 added `e2e/security/recursion-bomb.e2e.ts` (23 assertions, 3-platform green) — unified
> recursion-bomb regression for every recursive expander; found+fixed 2 HIGH DoS (validate depth, json
> Windows stack-overflow). Auto-discovered by `run-all.sh`.
>
> PTR W4.4 added `e2e/security/orm-injection.e2e.ts` (25 assertions, 3-platform green) — locks the ORM
> SQL-injection fix: `orderBy`/`take`/`skip`/`groupBy` raw-concatenated un-bindable identifiers/dir/limit
> → now `_ormIdent`/`_ormDir`/`_ormInt` guards. Auto-discovered by `run-all.sh`.
>
> PTR W4.4 added `e2e/security/web-header-crlf.e2e.ts` (8 assertions, 3-platform green) — locks the HTTP
> header/CRLF-injection fix: `res.header()`/`res.redirect()`/static-headers now `headerScrub` CR/LF from
> header names+values (response-splitting). Auto-discovered by `run-all.sh`.
>
> PTR W4.4 added `e2e/security/web-static-traversal.e2e.ts` (16 assertions, 3-platform green) — locks the
> static-handler path-traversal guard (rejects `..`/encoded escapes even under a broad fs grant) and, via a
> runtime-created granted sandbox, the Windows fs-grant-for-uncreated-dir fix (`comparable_path`).
>
> PTR W4.2 added `e2e/system/rbac-deepaudit.e2e.ts` (35 assertions, 3-platform green) — locks the RBAC
> cache-poisoning fix: a username equal to an `Object.prototype` key (`__proto__`/`constructor`/…) must DENY
> (not 500); `_cache`/`seen` are now `Object.create(null)`. Re-locks deny-wins + tier precedence + wildcard.
>
> PTR W4.3 added `e2e/security/web-csrf.e2e.ts` (11 assertions, 3-platform green) — locks the CSRF
> constant-time token compare (`_ctEq`; token is stable across failed attempts so raw `===` was a timing
> oracle) + token issuance/enforcement/rotation contract; csrf/rateLimit stores are now null-proto.

Budget below sums to **~5,390** planned assertions across 51 files, aligned to the 33 canonical
`ekko:*` specifiers in `_llm/ekko-modules-llm.md`, to leave headroom over the 5,000 floor.

---

## Conventions

- **Location:** `e2e/<area>/<module>.e2e.ts` — one file per module/feature area.
- **Framework:** the shared self-counting harness `e2e/_harness.ts` (`asserter()` → `t.check/eq/throws/...`).
  NOT `ekko:test` — that counts `test()` cases and calls `Ekko.exit()` itself; the campaign metric is
  assertions, so every `t.*(...)` check counts as one assertion toward the 5K.
- **Self-counting:** each file ends with `t.done(label)`, which prints `ASSERTIONS <pass> <fail>` and
  exits non-zero on any failure; `e2e/run-all.sh` sums those lines across all files.
- **Per-file permissions:** a sidecar `<file>.e2e.ts.allow` (comma/newline-separated caps, e.g. `fs`)
  declares what the runner passes as `--allow`; files with no sidecar run default-deny.
- **Permissions:** each file declares the minimum caps it needs (an `allow` sidecar per the
  feature-harness convention from task 192). Default-deny everywhere else so permission gating is
  itself exercised — see the dedicated `permissions/` area.
- **No mocks for native paths.** DB/ORM/net/web/crypto tests hit the real engine, real sockets, real
  drivers. Cross-platform DB parity uses the shared test containers (pg/mysql/mssql/mongo on
  `141.94.102.23`, see project memory).
- **Determinism:** no wall-clock/random-dependent assertions; seed where randomness is involved.

## Harness

```bash
# Run the whole campaign with a given binary (defaults to `ekko` on PATH)
bash e2e/run-all.sh <path-to-ekko>

# Per platform (all three MUST pass before this campaign is DONE):
bash _build/local/run-remote.sh  e2e-linux.sh      # Linux x64 (server)
# Windows x64: _bin/ekko.exe via download-bin.sh, run e2e/run-all.sh locally
bash _build/local/run-mac.sh     e2e-macos.sh      # macOS arm64 (Mac)
```

`run-all.sh` walks every `*.e2e.ts`, runs it with its declared `--allow`, sums the printed
assertion counts, and fails the run if any file errors or any assertion fails.

---

## Assertion Budget

Counts are planned floors per area. Status: ☐ TODO · ◐ WIP · ☑ DONE (3-platform green).

### Runtime core — 410
| Area | File | Assertions | Status |
|------|------|-----------:|:------:|
| Console / globals / `performance` | `core/globals.e2e.ts` | 60 | ☐ |
| Timers (`setTimeout`/`setInterval`/`queueMicrotask`) | `core/timers.e2e.ts` | 40 | ☐ |
| Async (promises, microtask order, async/await) | `core/async.e2e.ts` | 80 | ☐ |
| Isolate spawn + structured concurrency (`Ekko.spawn`) | `core/spawn.e2e.ts` | 90 | ☐ |
| `Ekko.spawn`/`Ekko.parallel` native-capable workers — dynamic `import()` + native APIs + `allow` gate; reused-thread cross-isolate regression | `system/spawn-native.e2e.ts` | 11 | ☑ 11 |
| Channels (bounded, backpressure, close) | `core/channels.e2e.ts` | 90 | ☐ |
| `select` over channels | `core/select.e2e.ts` | 50 | ☐ |

### Data & formats — 700
| Area | File | Assertions | Status |
|------|------|-----------:|:------:|
| `ekko:text/json` (`json` — parse/parseBytes/stringify/stringifyBytes + streaming reader/writer) | `data/json.e2e.ts` | 80 | ☑ 32 |
| `ekko:text/json` **hardening** — malformed parse/parseBytes/stringify throw cleanly; reader/writer liveness; safe nesting | `data/json-hardening.e2e.ts` | 20 | ☑ 24 |
| `ekko:text/json` **recheck** — writer colon-preservation, reader exact number text (1e400/1e-30), graceful missing-value, camelCase tokens | `data/json-recheck.e2e.ts` | 25 | ☑ 31 |
| `ekko:text/encoding` (base64 / base64url / hex / utf8 / utf16 LE+BE; RFC4648 vectors + 0x00–0xFF fidelity) | `data/encoding.e2e.ts` | 90 | ☑ 68 |
| `ekko:text/encoding` **hardening** — malformed base64/hex throw cleanly (no crash), liveness, 1MB DoS | `data/encoding-hardening.e2e.ts` | 20 | ☑ 23 |
| `ekko:text/encoding` **recheck** — .NET quirks (whitespace/case), utf8/utf16 replacement fallback, odd-length, footgun, empties, determinism | `data/encoding-recheck.e2e.ts` | 25 | ☑ 33 |
| `ekko:text/regex` (`Regex`: test/match/matchAll/replace/split, flags i/m/s/x, named+unnamed groups) | `data/regex.e2e.ts` | 100 | ☑ 39 |
| `ekko:text/regex` **hardening** — invalid patterns throw; ReDoS bounded by 2s MatchTimeout (was a hang); large linear input | `data/regex-hardening.e2e.ts` | 18 | ☑ 17 |
| `ekko:text/regex` **recheck** — match.index UTF-16 alignment, group edges, .NET split-captures, x flag, unicode, instance isolation | `data/regex-recheck.e2e.ts` | 30 | ☑ 31 |
| `ekko:datetime` (`datetime` parse/format/add/diff/epoch + `timezone` IANA convert/info/list) | `data/datetime.e2e.ts` | 150 | ☑ 41 |
| `ekko:datetime` **hardening** — malformed parse/format/zone/overflow throw cleanly | `data/datetime-hardening.e2e.ts` | 18 | ☑ 18 |
| `ekko:datetime` **recheck** — cross-platform IANA TZ (ICU fix), DST, boundaries, precision, determinism | `data/datetime-recheck.e2e.ts` | 30 | ☑ 34 |
| `ekko:compress` (gzip / brotli / deflate; one-shot + streaming, levels, fidelity) | `data/compress.e2e.ts` | 80 | ☑ 38 |
| `ekko:compress` **hardening** — corrupt→throw; decompression bomb capped at 256MB (was unbounded OOM); stream lifecycle | `data/compress-hardening.e2e.ts` | 18 | ☑ 18 |
| `ekko:compress` **recheck** — unicode, determinism, chunk-boundary, streaming↔one-shot, incompressible, footgun | `data/compress-recheck.e2e.ts` | 20 | ☑ 21 |
| `ekko:crypto` (hash/hmac/AES-GCM/RSA/ECDSA/PBKDF2/HKDF/CSPRNG; NIST/RFC KATs) | `system/crypto.e2e.ts` | 200 | ☑ 23 |
| `ekko:crypto` **security** — all 16 fns denied without `--allow=crypto` (incl. ECDSA bypass fix) | `system/crypto-permissions.e2e.ts` | 16 | ☑ 16 |
| `ekko:crypto` **recheck** — AES-GCM tamper/nonce/wrong-key, RSA/ECDSA key isolation, binary, determinism, large | `system/crypto-recheck.e2e.ts` | 20 | ☑ 20 |

> Note: there is **no `ekko:text` module** — `text` is a namespace-only parent. String case/trim/split
> are native JS, not an `ekko:*` module, so they get no e2e file.

### System — 589
| Area | File | Assertions | Status |
|------|------|-----------:|:------:|
| `ekko:fs` (read/write/stat/dir/temp/handle/watch) | `system/fs.e2e.ts` | 200 | ☑ 209/204 |
| `ekko:fs` **security** — scoped `--allow=fs:…`, path-traversal escape blocked | `system/fs-permissions.e2e.ts` | 23 | ☑ 23 |
| `ekko:fs` **security** — ekko runtime folder + package store blocked | `system/fs-protected.e2e.ts` | 16 | ☑ 16 |
| `ekko:fs` **recheck** — 4MB I/O, unicode filenames, readLines edges, binary fidelity, concurrency, append, UTF-8; error codes derived from real io::Error (task 205) | `system/fs-recheck.e2e.ts` | 20 | ☑ 20 |
| `ekko:fs/path` (join/resolve/dirname/basename/extname/isAbsolute/normalize/sep) | `system/path.e2e.ts` | 80 | ☑ 82 |
| `ekko:fs/path` **recheck** — normalize idempotency, join push-semantics, extname dotfiles/multi-dot, platform-specific isAbsolute (task 206) | `system/path-recheck.e2e.ts` | 30 | ☑ 30 |
| `ekko:process` (exec, **interactive spawn**, env/args/cwd/pid; #1/#2/#3 fixed) | `system/process.e2e.ts` | 100 | ☑ 96 |
| `ekko:process` **security** — exec/spawn denied without `--allow=process` | `system/process-permissions.e2e.ts` | 6 | ☑ 4 |
| `ekko:process` **cybersecurity** — env-injection blocklist (LD_PRELOAD/DYLD_*) + no-shell metachar literalness | `system/process-security.e2e.ts` | 12 | ☑ 13 |
| `ekko:process` **lifecycle/stress** — large/interleaved/concurrent exec, spawn cwd/stdin/Uint8Array, late-onExit, idempotency, escape+unicode FFI fidelity | `system/process-lifecycle.e2e.ts` | 40 | ☑ 45 |
| `ekko:net` (DNS + UDP loopback/binary + **TCP echo round-trip** via standalone server onConn) | `system/net.e2e.ts` | 120 | ☑ 33 |
| `ekko:net` **security** — tcp/udp/dns denied without `--allow=net` | `system/net-permissions.e2e.ts` | 6 | ☑ 4 |
| `ekko:net` **cybersec** — host scoping + scope-escape closed (udp.send/tcp.listen enforce host; alt-encodings denied) | `system/net-scope.e2e.ts` | 12 | ☑ 12 |
| `ekko:net` **recheck** — 64KB transfer integrity, 5 concurrent connections, binary fidelity, error edges (task 208) | `system/net-recheck.e2e.ts` | 20 | ☑ 9 |
| `ekko:log` (structured JSON logger: levels/fields/child/setLevel) | `system/log.e2e.ts` | 50 | ☑ 27 |
| `ekko:log` **hardening** — never throws on BigInt/circular/throwing-getter fields (safe serialize) | `system/log-hardening.e2e.ts` | 14 | ☑ 15 |
| `ekko:log` **recheck** — field collisions, unicode/control chars, deep child, value types, ts | `system/log-recheck.e2e.ts` | 12 | ☑ 22 |

### Database & ORM — 900
| Area | File | Assertions | Status |
|------|------|-----------:|:------:|
| `ekko:db` (SQLite: open/DDL/DML/joins/CTE/window/prepared/built-ins/upsert) | `db/db-sqlite.e2e.ts` | 200 | ☑ 140 |
| `ekko:db` **security** — file open denied without `fs`; `:memory:` exempt; ATTACH/VACUUM-INTO/load_extension escapes contained | `db/db-permissions.e2e.ts` | 16 | ☑ 15 |
| `ekko:db` **cybersec scope** — fs scope enforced on open AND the authorizer (in-scope ok, out-of-scope + `..` denied; VACUUM INTO too) | `db/db-scope.e2e.ts` | 12 | ☑ 12 |
| `ekko:db` **recheck** — control-char TEXT round-trip + Inf/NaN→null (serde_json fix), unicode, 1MB text, 10k rows, batch/stmt-reuse | `db/db-recheck.e2e.ts` | 25 | ☑ 38 |
| `ekko:db/orm` core (query builder, relations, tx, pool; ported from ORM v2 suite, :memory:+file) | `db/orm-core.e2e.ts` | 300 | ☑ 123 |
| `ekko:db/orm` **security** — file open inherits fs gate; `:memory:` exempt; injection-safe (values @p, not interpolated) | `db/orm-permissions.e2e.ts` | 12 | ☑ 16 |
| `ekko:db/orm` **recheck** — connect-by-path/scoped-opener, where-null→IS NULL, pool independence + no parent-kill, bool/json/empty-aggregate gotchas | `db/orm-recheck.e2e.ts` | 30 | ☑ 34 |
| ORM driver parity — SQLite | `db/orm-sqlite.e2e.ts` | 80 | ☐ |
| ORM driver parity — Postgres | `db/orm-postgres.e2e.ts` | 80 | ☐ |
| ORM driver parity — MySQL | `db/orm-mysql.e2e.ts` | 80 | ☐ |
| ORM driver parity — MSSQL | `db/orm-mssql.e2e.ts` | 80 | ☐ |
| ORM driver parity — MongoDB | `db/orm-mongo.e2e.ts` | 80 | ☐ |

### Web stack — 1,040
| Area | File | Assertions | Status |
|------|------|-----------:|:------:|
| `ekko:web` (security middleware: cors/helmet/csrf/rateLimit/ipFilter/safePath/secureCookies/validateContentType/bodyLimit/requestId/httpsRedirect/timeout/errorHandler) | `system/web.e2e.ts` | 300 | ☑ 44 |
| `ekko:web` **cybersec** — safePath multi-decode traversal, cookie CRLF injection, bodyLimit actual-size, validateContentType empty-CT, cors/csrf/ipFilter enforcement (bugs A–D fixed task 229) | `system/web-cybersec.e2e.ts` | 60 | ☑ 33 |
| `ekko:web` **recheck** — config variants, csrf keying, sameSite/Secure, content-type charset, timeout clearing, errorHandler prod/dev, httpsRedirect port (middleware standalone; over-the-wire server/WebSocket/TLS need a two-process harness — see net pattern, task 210) + overridable-defaults group | `system/web-recheck.e2e.ts` | 40 | ☑ 32 |
| `ekko:web/validate` (z: scalar/composite schemas, modifiers, refinements, body/query/params middleware) | `frontend/validate.e2e.ts` | 120 | ☑ 48 |
| `ekko:web/validate` **cybersec** — modifiers on composite schemas no longer crash/bypass; refinements enforced on arrays/objects; type-confusion reported; z.body no 500 (bugs A/B/trim fixed task 232) | `frontend/validate-cybersec.e2e.ts` | 30 | ☑ 29 |
| `ekko:web/validate` **recheck** — chained modifiers preserve sub-schema, defaults/nullable/optional combos, nested paths, union of objects, min/max across types, trim ordering | `frontend/validate-recheck.e2e.ts` | 25 | ☑ 29 |
| `ekko:web/graphql` (createGraphQL: queries/args/nesting/lists/mutation/introspection/fragments/errors) | `frontend/graphql.e2e.ts` | 150 | ☑ 17 |
| `ekko:web/graphql` **cybersec** — cyclic-fragment DoS (stack-overflow crash) fixed via active-path guard; fragment-bomb cap; maxDepth on cyclic data; handler payload/query limits (task 231) | `frontend/graphql-cybersec.e2e.ts` | 25 | ☑ 16 |
| `ekko:web/graphql` **recheck** — fragment reuse in disjoint branches, inline nesting, nested `__typename` (fixed), arg coercion (list/input/var), maxDepth boundary | `frontend/graphql-recheck.e2e.ts` | 20 | ☑ 13 |
| `ekko:web/realtime` (createRealtime pub/sub: channel/handleConnection/join/leave/broadcast/to/emit) | `frontend/realtime.e2e.ts` | 120 | ☑ 30 |
| `ekko:web/realtime` **cybersec** — socket-leak/DoS regressions: disconnect frees all joined rooms; unregistered-path connection freed; stale-member broadcast safe (bugs A+B fixed task 230) | `frontend/realtime-cybersec.e2e.ts` | 20 | ☑ 18 |
| `ekko:web/realtime` **recheck** — join idempotency, no-op edges, excludeSelf variants, binary messages, count accuracy, partial disconnect | `frontend/realtime-recheck.e2e.ts` | 18 | ☑ 19 |
| HTTP methods / PUT / TLS | `web/http-methods-tls.e2e.ts` | 80 | ☐ |
| `ekko:auth` (createAuth: password/JWT/session/roles; totp) | `system/auth.e2e.ts` | 150 | ☑ 36 |
| `ekko:auth` **cybersec** — JWT forgery (tamper/alg:none/cross-secret/expired/malformed), password-verify safety + algorithm-persist (lockout) fix, OAuth state-CSRF/PKCE/open-redirect, TOTP replay (bugs A/B fixed task 233) | `system/auth-cybersec.e2e.ts` | 35 | ☑ 25 |
| `ekko:auth` **recheck** — JWT claim edges + unicode (fixed), iteration floor/distinct salts/tamper, session TTL, opt-in Secure cookie, TOTP options | `system/auth-recheck.e2e.ts` | 25 | ☑ 18 |
| `ekko:auth/rbac` (createRBAC: roles/groups/perms/tiers, resolve, middleware; matchPerm) | `system/rbac.e2e.ts` | 120 | ☑ 30 |
| `ekko:auth/rbac` **cybersec** — deny-wins-within-tier (deterministic authz, bug A fixed task 234), tier precedence, deny-by-default, wildcard scoping, middleware 401/403, cache invalidation | `system/rbac-cybersec.e2e.ts` | 25 | ☑ 20 |
| `ekko:auth/rbac` **recheck** — group hierarchy/inheritance, cascade deletes, idempotency, reparenting, resolve dedup, group-tier deny | `system/rbac-recheck.e2e.ts` | 18 | ☑ 15 |

### Frontend & framework — 830
| Area | File | Assertions | Status |
|------|------|-----------:|:------:|
| `ekko:ssr` (renderToString, htmlShell, escapeHtml, serializeProps) | `frontend/ssr.e2e.ts` | 120 | ☑ 33 |
| `ekko:ssr` **cybersec/XSS** — htmlShell data-script breakout + lang/URL escaping; serializeProps validation | `frontend/ssr-cybersec.e2e.ts` | 25 | ☑ 34 |
| `ekko:ssr` **recheck** — escape ordering/unicode, deep render, serialize edges, shell edges | `frontend/ssr-recheck.e2e.ts` | 25 | ☑ 22 |
| `ekko:ssr/css` (compileSass, transform, cssModules, minify) | `frontend/css.e2e.ts` | 100 | ☑ 25 |
| `ekko:ssr/css` **hardening** — malformed→throw; deep-nesting stack-overflow guarded (cap 256) | `frontend/css-hardening.e2e.ts` | 20 | ☑ 15 |
| `ekko:ssr/css` **recheck** — unicode, determinism, idempotency, CSS/Sass features | `frontend/css-recheck.e2e.ts` | 25 | ☑ 21 |
| `ekko:rune` (scanRoutes, readManifest, resolvePageAssets, cssModule, styleCollector, createApp) | `frontend/rune.e2e.ts` | 150 | ☑ 30 |
| `ekko:rune` **cybersec** — static-file/dir ops require fs + reject `..` traversal (LFI fix); no-leak | `frontend/rune-cybersec.e2e.ts` + `rune-scope.e2e.ts` | 18 | ☑ 16 |
| `ekko:rune` **recheck** — route-mapping edges, asset shapes, styleCollector, manifest edges | `frontend/rune-recheck.e2e.ts` | 25 | ☑ 17 |
| `ekko:rune/mimir` (atom, selector, store, hooks) | `frontend/rune-mimir.e2e.ts` | 130 | ☑ 31 |
| `ekko:rune/mimir` **hardening** — circular selector guarded (was crash); reentrancy; large stores | `frontend/rune-mimir-hardening.e2e.ts` | 18 | ☑ 11 |
| `ekko:rune/mimir` **recheck** — selector-subscribe-before-get + transitive deps; initStore/clearSession | `frontend/rune-mimir-recheck.e2e.ts` | 30 | ☑ 16 |
| `ekko:rune/router` (createRouter, matchPath, extractParams, validateUrl, resolve/guards/manifest) | `frontend/rune-router.e2e.ts` | 120 | ☑ 54 |
| `ekko:rune/router` **cybersec** — validateUrl rejects traversal/encoding/injection/bad-query; malicious URL never matches a route; unsafe literal route throws; no regex-DoS | `frontend/rune-router-cybersec.e2e.ts` | 40 | ☑ 43 |
| `ekko:rune/router` **recheck** — whitelist strictness contract; matchPath/extractParams boundaries; query edges; route ordering; guard shapes | `frontend/rune-router-recheck.e2e.ts` | 30 | ☑ 34 |
| `ekko:rune/seo` (createSEO → headTags/robotsTxt/sitemapXml/structuredData) | `frontend/rune-seo.e2e.ts` | 50 | ☑ 49 |
| `ekko:rune/seo` **cybersec** — structuredData `</script>` XSS, headTags attr breakout, sitemap XML injection, missing-path crash, robots.txt newline injection (all fixed task 228) | `frontend/rune-seo-cybersec.e2e.ts` | 35 | ☑ 30 |
| `ekko:rune/seo` **recheck** — baseUrl join, conditional emission, og/twitter fallbacks, falsy-but-defined, default-meta deep override, unicode round-trip | `frontend/rune-seo-recheck.e2e.ts` | 25 | ☑ 22 |
| `ekko:app/cli` (cli command parser + colors) covered+recheck — required enforcement (task 237); prompts need a terminal; cybersec N/A | `frontend/cli.e2e.ts` | 80 | ☑ 28 |
| `ekko:app/gui` export surface (window/tray/menu ops are native — need `ekko gui` host + display; headless asserts the JS contract) | `frontend/gui.e2e.ts` | 80 | ☑ 10 |
| `ekko:app/tui` layout engine (createNode/computeLayout/generateCells/flexbox) covered+recheck — render/input/hooks need `ekko tui` PTY host | `frontend/tui.e2e.ts` | 100 | ☑ 31 |

### Platform & tooling — 750
| Area | File | Assertions | Status |
|------|------|-----------:|:------:|
| `ekko:ffi` (dlopen, types, struct layout, **float ABI** fixed, async) | `platform/ffi.e2e.ts` | 120 | ☑ 111 |
| `ekko:ffi` **security** — allowlist (`ffi:<stem>`/`unsafe`), `native:self` category-only | `platform/ffi-permissions.e2e.ts` | 20 | ☑ 9 |
| `ekko:ffi` **security** — bare `--allow=ffi` denies external native code (no backdoor) | `platform/ffi-bare-perm.e2e.ts` | 4 | ☑ 4 |
| `ekko:ffi` **recheck** — arity limits (float ≤4, total ≤16) clean errors, i64/u64 BigInt boundaries, null/undefined cstring → NULL ptr (task 204) | `platform/ffi-recheck.e2e.ts` | 12 | ☑ 12 |
| `ekko:permissions` (capability gating, child ⊆ parent) | `platform/permissions.e2e.ts` | 150 | ☐ |
| `ekko:test/assert` (assert/Equal/Strict/Deep/Throws/Rejects/Type/fail) covered+recheck — cybersec N/A | `system/test-assert.e2e.ts` | 40 | ☑ 29 |
| `ekko:test` (`expect` matchers + `.not`) covered+recheck — cybersec N/A | `frontend/test.e2e.ts` | 40 | ☑ 40 |
| `ekko:test` runner hooks (afterEach-on-failure + nested inheritance, task 235) — subprocess regression | `system/test-runner.e2e.ts` | 10 | ☑ 8 |
| Module system (resolver, import maps, cache) | `platform/modules.e2e.ts` | 100 | ☐ |
| `ekko:job/cron` (parse/validate + schedule mgmt) covered+recheck — field range validation (task 236); cybersec N/A | `frontend/cron.e2e.ts` | 40 | ☑ 32 |
| `ekko:job/queue` (add/process/concurrency/priority/retries/backoff/counts) covered+recheck — cybersec N/A | `frontend/queue.e2e.ts` | 40 | ☑ 23 |
| EKL packaging (`ekko build` / `.ekl`) | `platform/ekl.e2e.ts` | 80 | ☐ |
| Publish signing | `platform/publish-signing.e2e.ts` | 60 | ☐ |
| Registry (publish / install / TLS) | `platform/registry.e2e.ts` | 80 | ☐ |

### Cross-cutting full-app flows — 210
| Area | File | Assertions | Status |
|------|------|-----------:|:------:|
| Full-stack app (Rune + web + db + auth, SSR→hydrate→navigate) | `flows/fullstack-app.e2e.ts` | 100 | ☐ |
| CLI tool end-to-end (build → run → output) | `flows/cli-tool.e2e.ts` | 60 | ☐ |
| Realtime pub/sub app (web/realtime + channels) | `flows/realtime-app.e2e.ts` | 50 | ☐ |

---

**Grand total (planned): ~5,430 assertions across 53 files / 8 areas.**

Module coverage is aligned to the canonical API surface in `_llm/ekko-modules-llm.md` (33 registered
`ekko:*` specifiers). Use the exact specifiers there in imports — e.g. `ekko:text/json`, `ekko:text/encoding`,
`ekko:text/regex`, `ekko:db/orm`, `ekko:ssr/css`, `ekko:auth/rbac`, `ekko:fs/path`, `ekko:app/{cli,gui,tui}`,
`ekko:rune/{mimir,router,seo}`, `ekko:job/{cron,queue}` — NOT the bare `ekko:json`/`ekko:orm`/`ekko:css` forms.

## Definition of Done

- [ ] All 51 files implemented; aggregate ≥ 5,000 assertions.
- [ ] `e2e/run-all.sh` green on **Linux x64**, **Windows x64**, **macOS arm64** — actual output captured.
- [ ] DB/ORM parity files run against the real shared containers (no inline driver copies).
- [ ] Every bug surfaced during the campaign gets a regression assertion in the relevant file.
- [ ] No skipped/xfail without a filed task explaining why.
