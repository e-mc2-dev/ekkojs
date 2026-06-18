// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { fetch } from "ekko:web";

const E: any = (globalThis as any).Ekko;
const envInt = (k: string, d: number) => { try { const v = parseInt(E.env.get(k) || "", 10); return Number.isFinite(v) && v > 0 ? v : d; } catch { return d; } };
const BASE = (() => { try { return E.env.get("ECHO_BASE") || "http://127.0.0.1:38470"; } catch { return "http://127.0.0.1:38470"; } })();
const SECONDS = envInt("SOAK_SECONDS", 86400);
const QPS = envInt("SOAK_QPS", 4);
const GAP_MS = Math.max(1, Math.floor(1000 / QPS));

console.log(`[load] base=${BASE} duration=${SECONDS}s qps=${QPS} (gap=${GAP_MS}ms) — expecting ~${SECONDS * QPS} requests`);

let sent = 0, ok = 0, fail = 0, noteId = 0;
const failKinds: Record<string, number> = Object.create(null);
const heapStart = E.metrics().heap.usedBytes;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

async function hit(spec: { path: string; method?: string; body?: string; want: (j: any) => boolean }): Promise<void> {
  sent++;
  try {
    await withTimeout((async () => {
      const opts: any = spec.method && spec.method !== "GET" ? { method: spec.method, body: spec.body, headers: { "content-type": "application/json" } } : undefined;
      const r: any = await fetch(BASE + spec.path, opts);
      try {
        if (!r || r.status !== 200) throw new Error("status " + (r && r.status));
        const j = await r.json();
        if (!spec.want(j)) throw new Error("bad payload");
        ok++;
      } finally {
        try { r && r.dispose(); } catch {  }
      }
    })(), 8000);
  } catch (e) {
    fail++;
    const k = String(e && (e as any).message || e).slice(0, 40);
    failKinds[k] = (failKinds[k] || 0) + 1;
  }
}

function nextRequest(i: number): { path: string; method?: string; body?: string; want: (j: any) => boolean } {
  switch (i % 8) {
    case 0: return { path: "/echo?msg=hello-" + i, want: (j) => j.echo === "hello-" + i };
    case 1: return { path: "/echo", method: "POST", body: JSON.stringify({ n: i }), want: (j) => typeof j.echo === "string" };
    case 2: return { path: "/users", method: "POST", body: JSON.stringify({ name: "user" + i, email: `u${i}@soak.local` }), want: (j) => !!j.inserted && j.total >= 1 };
    case 3: return { path: "/users", want: (j) => Array.isArray(j.users) };
    case 4: return { path: "/notes", method: "POST", body: "note-body-" + i, want: (j) => { if (j.id) noteId = j.id; return !!j.id; } };
    case 5: return { path: "/note?id=" + (noteId || 1), want: (j) => typeof j.content === "string" || j.error != null };
    case 6: return { path: "/stats", want: (j) => typeof j.served === "number" };
    default: return { path: "/echo?msg=ping", want: (j) => j.echo === "ping" };
  }
}

const startedAt = Date.now();
const deadline = startedAt + SECONDS * 1000;
let lastReport = startedAt;
let i = 0;

while (Date.now() < deadline) {
  const tick = Date.now();
  await hit(nextRequest(i));
  i++;

  if (tick - lastReport >= 300000) {
    const heap = E.metrics().heap.usedBytes;
    const elapsed = ((tick - startedAt) / 1000) | 0;
    console.log(`[load] t=${elapsed}s sent=${sent} ok=${ok} fail=${fail} heapΔ=${((heap - heapStart) / 1048576).toFixed(2)}MB`);
    lastReport = tick;
  }

  const spent = Date.now() - tick;
  if (spent < GAP_MS) await E.sleep(GAP_MS - spent);
}

const heapEnd = E.metrics().heap.usedBytes;
const heapDeltaMB = (heapEnd - heapStart) / 1048576;
const elapsedS = ((Date.now() - startedAt) / 1000) | 0;
console.log(`[load] FINAL elapsed=${elapsedS}s sent=${sent} ok=${ok} fail=${fail} heapΔ=${heapDeltaMB.toFixed(2)}MB`);
if (fail > 0) console.log(`[load] failure breakdown: ${JSON.stringify(failKinds)}`);

const HEAP_BOUND_MB = 64; 
const passed = fail === 0 && heapDeltaMB < HEAP_BOUND_MB;
console.log(`ECHO-LOAD: requests=${sent} ok=${ok} fail=${fail} heapDeltaMB=${heapDeltaMB.toFixed(2)} bound=${HEAP_BOUND_MB}`);
console.log(passed ? "ECHO-LOAD-DONE PASS" : "ECHO-LOAD-DONE FAIL");
if (!passed) E.exit(1);
