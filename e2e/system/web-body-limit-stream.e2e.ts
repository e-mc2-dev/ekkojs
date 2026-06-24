// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createServer, fetch, bodyLimit } from "ekko:web";
import { tcp } from "ekko:net";
import { asserter, sleep } from "../_harness";

const t = asserter();
const P = 38473;
const base = `http://127.0.0.1:${P}`;
const MAX = 16; 

const app: any = createServer({ host: "127.0.0.1", port: P });
app.post("/upload", bodyLimit({ max: MAX }), async (req: any, res: any) => {
  const b = await req.bytes();
  res.json({ len: b.length });
});
app.start();

async function chunkedPost(nBytes: number): Promise<number> {
  const c = await tcp.connect("127.0.0.1", P);
  const body = "a".repeat(nBytes);
  const req =
    "POST /upload HTTP/1.1\r\n" +
    `Host: 127.0.0.1:${P}\r\n` +
    "Content-Type: application/octet-stream\r\n" +
    "Transfer-Encoding: chunked\r\n" +
    "Connection: close\r\n" +
    "\r\n" +
    nBytes.toString(16) + "\r\n" + body + "\r\n" +
    "0\r\n\r\n";
  tcp.write(c, req);
  let raw = "";
  for (let i = 0; i < 8; i++) {
    const d: any = await Promise.race([tcp.read(c, 4096), sleep(800).then(() => null)]);
    if (d == null) break;
    const arr = Array.isArray(d) ? d : Array.from(d as any);
    if (arr.length === 0) break;
    raw += String.fromCharCode.apply(null, arr as number[]);
    if (raw.indexOf("\r\n\r\n") >= 0 && /content-length|connection: close|}\s*$/i.test(raw)) break;
  }
  tcp.close(c);
  const m = raw.match(/^HTTP\/1\.\d (\d{3})/);
  return m ? parseInt(m[1], 10) : 0;
}

t.group("declared (Content-Length) oversize → rejected up front");
{
  
  const r = await fetch(base + "/upload", { method: "POST", body: "x".repeat(MAX + 40) });
  t.eq("honest oversize body → 413", r.status, 413);
}
{
  const r = await fetch(base + "/upload", { method: "POST", body: "x".repeat(MAX - 8) });
  const j = await r.json();
  t.eq("under-limit body → 200", r.status, 200);
  t.eq("handler saw the exact bytes", j.len, MAX - 8);
}

t.group("CHUNKED body (no Content-Length) is capped at drain time, not bypassed");
{
  const status = await chunkedPost(MAX + 64); 
  t.eq("chunked oversize → 413 (drain-time cap)", status, 413);
}
{
  const status = await chunkedPost(MAX - 4); 
  t.eq("chunked under-limit → 200", status, 200);
}

app.stop();
t.check("reached end → server ran in-process, no hang", true);
t.done("web bodyLimit drain-time streaming cap");
