// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createServer, fetch } from "ekko:web";
import { asserter } from "../_harness";

const t = asserter();
const P = 38461;
const base = `http://127.0.0.1:${P}`;

const ALL = new Uint8Array(256);
for (let i = 0; i < 256; i++) ALL[i] = i;
const EXPECT_LEN = 256;
const EXPECT_SUM = 32640;

const app: any = createServer({ host: "127.0.0.1", port: P });

app.post("/bytes", (req: any, res: any) => {
  const b = req.bytes();
  let sum = 0;
  for (let i = 0; i < b.length; i++) sum += b[i];
  res.json({ len: b.length, sum });
});
app.post("/json", (req: any, res: any) => res.json({ got: req.json() }));
app.post("/text", (req: any, res: any) => res.json({ got: req.text() }));
app.start();

async function bytesRoundtrip(ct?: string): Promise<{ len: number; sum: number }> {
  const r = await fetch(base + "/bytes", { method: "POST", headers: ct ? { "content-type": ct } : {}, body: ALL });
  return await r.json();
}

t.group("binary body delivered exactly (base64 path) for non-text content-types");
for (const ct of ["application/octet-stream", "image/png", "image/jpeg", "application/pdf", "multipart/form-data"]) {
  const got = await bytesRoundtrip(ct);
  t.eq(`${ct}: exact length`, got.len, EXPECT_LEN);
  t.eq(`${ct}: exact bytes (checksum)`, got.sum, EXPECT_SUM);
}

t.group("binary body with NO content-type (raw ArrayBuffer fetch) is binary-safe");
{
  const got = await bytesRoundtrip(undefined);
  t.eq("missing content-type: exact length", got.len, EXPECT_LEN);
  t.eq("missing content-type: exact bytes", got.sum, EXPECT_SUM);
}

t.group("text bodies still decode correctly via req.json()/req.text()");
{
  const rj = await fetch(base + "/json", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ k: "héllo-€-✓" }) });
  const j = await rj.json();
  t.eq("application/json → req.json() preserves unicode", j.got?.k, "héllo-€-✓");

  const rt = await fetch(base + "/text", { method: "POST", headers: { "content-type": "text/plain" }, body: "héllo-€-✓" });
  const tx = await rt.json();
  t.eq("text/plain → req.text() preserves unicode", tx.got, "héllo-€-✓");
}

app.stop();
t.check("reached end → server ran in-process, no hang", true);
t.done("web request body fidelity (binary upload fix)");
