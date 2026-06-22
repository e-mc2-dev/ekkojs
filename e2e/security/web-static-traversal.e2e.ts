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
import { writeText, mkdir, exists, remove } from "ekko:fs";
import { asserter } from "../_harness";

const t = asserter();
const ROOT = "e2e/_sectmp/webstatic";
const PUB = ROOT + "/public";

function rm(p: string) { try { if (exists(p)) remove(p); } catch {  } }
rm(ROOT + "/secret.txt"); rm(PUB + "/ok.txt"); rm(PUB + "/sub/nested.txt");

mkdir(PUB + "/sub");
writeText(PUB + "/ok.txt", "PUBLIC_OK");
writeText(PUB + "/sub/nested.txt", "NESTED_OK");
writeText(ROOT + "/secret.txt", "SECRET_LEAK");   

const P = 38333;
const app: any = createServer({ host: "127.0.0.1", port: P });
app.static("/assets", PUB);
app.get("/ping", (_req: any, res: any) => res.json({ ok: 1 }));
app.start();
const base = `http://127.0.0.1:${P}`;

async function get(path: string): Promise<{ status: number; body: string }> {
  const r = await fetch(base + path);
  let body = "";
  try { body = await r.text(); } catch {  }
  return { status: r.status, body };
}

t.group("static serving — legit files (W4.4)");
const ok = await get("/assets/ok.txt");
t.eq("public file served 200", ok.status, 200);
t.eq("public file content", ok.body, "PUBLIC_OK");
const nested = await get("/assets/sub/nested.txt");
t.eq("nested file served 200", nested.status, 200);
t.eq("nested content", nested.body, "NESTED_OK");

t.group("static serving — traversal must NOT leak the sibling secret (W4.4)");

const payloads = [
  "/assets/%2e%2e/secret.txt",         
  "/assets/%252e%252e/secret.txt",     
  "/assets/..%2fsecret.txt",           
  "/assets/%2e%2e%2fsecret.txt",       
  "/assets/sub/%2e%2e/%2e%2e/secret.txt",
];
for (const p of payloads) {
  const r = await get(p);
  t.check("no secret leak via " + p + " (status " + r.status + ")", !r.body.includes("SECRET_LEAK"));
  t.check("blocked (not 200) via " + p, r.status !== 200);
}

t.check("secret exists within the (broad) fs grant", exists(ROOT + "/secret.txt"));

app.stop();
rm(ROOT + "/secret.txt"); rm(PUB + "/ok.txt"); rm(PUB + "/sub/nested.txt");
t.check("reached end — in-process, no hang", true);
t.done("web static path-traversal (W4.4)");
