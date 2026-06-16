// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createServer, WebSocket } from "ekko:web";
import { asserter } from "../_harness.ts";

const t = asserter();
const E: any = (globalThis as any).Ekko;
let MSGS = 400;   
let CYCLES = 5;   
try { const v = E.env.get("EKKO_WS_SOAK_MSGS"); if (v) MSGS = Math.max(50, parseInt(v, 10) | 0); } catch {  }
try { const v = E.env.get("EKKO_WS_SOAK_CYCLES"); if (v) CYCLES = Math.max(2, parseInt(v, 10) | 0); } catch {  }
console.log(`[ws-soak] ${CYCLES} cycles x ${MSGS} msgs = ${CYCLES * MSGS} echoes (scale via EKKO_WS_SOAK_MSGS/CYCLES + duration)`);

const P = 38401;
const app: any = createServer({ host: "127.0.0.1", port: P });
app.ws("/echo", (sock: any) => { sock.on("message", (d: string) => sock.send(d)); });
app.start();
const url = `ws://127.0.0.1:${P}/echo`;

function cycle(): Promise<number> {
  return new Promise((resolve, reject) => {
    let received = 0;
    const ws: any = new WebSocket(url);
    const to = setTimeout(() => reject(new Error(`ws-soak timeout: got ${received}/${MSGS}`)), 15000);
    ws.onopen = () => { for (let i = 0; i < MSGS; i++) ws.send("m" + i); };
    ws.onmessage = () => {
      received++;
      if (received >= MSGS) { clearTimeout(to); ws.close(); resolve(received); }
    };
    ws.onerror = (e: any) => { clearTimeout(to); reject(e); };
  });
}
const heapUsed = () => E.metrics().heap.usedBytes as number;

t.group(`WebSocket soak — no loss + bounded memory (W3.2, ${CYCLES}x${MSGS})`);

let total = 0;
try { total += await cycle(); } catch (e: any) { t.check("cycle 1 completed (no loss/timeout): " + (e && e.message), false); }
const heapBase = heapUsed();
t.eq("cycle 1: all messages echoed back (no loss)", total, MSGS);

let failed = 0;
for (let c = 2; c <= CYCLES; c++) {
  try { const got = await cycle(); total += got; if (got !== MSGS) failed++; }
  catch { failed++; }
}
const heapEnd = heapUsed();
const deltaMB = (heapEnd - heapBase) / 1048576;
console.log(`[ws-soak] total echoes=${total}/${CYCLES * MSGS}, heap base=${(heapBase / 1048576).toFixed(1)}MB end=${(heapEnd / 1048576).toFixed(1)}MB delta=${deltaMB.toFixed(2)}MB`);

t.eq("every cycle delivered all messages (no loss across reconnects)", failed, 0);
t.eq("grand total echoes == cycles x msgs", total, CYCLES * MSGS);
t.check("heap does not climb across connect/pump/close cycles (no per-conn leak)", (heapEnd - heapBase) < 16 * 1024 * 1024);
t.check("heap stays under V8 limit", heapEnd < E.metrics().heap.limitBytes);

app.stop();
t.check("reached end — realtime soak survived, no hang/crash", true);
t.done("WebSocket realtime soak (W3.2 CI-budget)");
