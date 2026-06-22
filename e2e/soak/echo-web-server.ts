// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createServer } from "ekko:web";
import { Database } from "ekko:db";
import { connect, defineTable, col } from "ekko:db/orm";
import { writeText, readText, exists, mkdir } from "ekko:fs";
import { utf8 } from "ekko:text/encoding";

const E: any = (globalThis as any).Ekko;
const PORT = (() => { try { return parseInt(E.env.get("ECHO_PORT") || "", 10) || 38470; } catch { return 38470; } })();
const NOTES_DIR = (() => { try { return E.env.get("ECHO_NOTES_DIR") || "e2e/soak/_notes"; } catch { return "e2e/soak/_notes"; } })();

if (!exists(NOTES_DIR)) mkdir(NOTES_DIR);

const Users = defineTable("users", {
  id: col.int().primaryKey().autoIncrement(),
  name: col.text(),
  email: col.text(),
});
const db = connect(Database(":memory:"));
db.createTable(Users);

const started = Date.now();
let served = 0;
let notesWritten = 0;

function parseQuery(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof raw !== "string" || raw.length === 0) return out;
  const s = raw[0] === "?" ? raw.slice(1) : raw;
  for (const pair of s.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const k = eq < 0 ? pair : pair.slice(0, eq);
    const v = eq < 0 ? "" : pair.slice(eq + 1);
    try { out[decodeURIComponent(k)] = decodeURIComponent(v); } catch { out[k] = v; }
  }
  return out;
}

function bodyText(body: unknown): string {
  if (body == null) return "";
  if (typeof body === "string") return body;
  if (body instanceof Uint8Array) return utf8.decode(body);
  try { return JSON.stringify(body); } catch { return String(body); }
}

const app: any = createServer({ host: "127.0.0.1", port: PORT });

app.get("/health", (_req: any, res: any) => { res.json({ ok: true }); });

app.get("/echo", (req: any, res: any) => {
  served++;
  const q = parseQuery(req.query);
  res.json({ echo: q.msg ?? "", at: served });
});

app.post("/echo", (req: any, res: any) => {
  served++;
  res.json({ echo: bodyText(req.body), at: served });
});

app.get("/users", (_req: any, res: any) => {
  served++;
  res.json({ users: db.from(Users).orderByDesc("id").take(20).toArray() });
});

app.post("/users", (req: any, res: any) => {
  served++;
  let name = "anon", email = "anon@soak.local";
  try { const o = JSON.parse(bodyText(req.body)); if (o && typeof o === "object") { name = String(o.name ?? name); email = String(o.email ?? email); } } catch {  }
  db.from(Users).insert({ name, email }).exec();
  const row = db.from(Users).where((u: any) => u.email.eq(email)).orderByDesc("id").first();
  res.json({ inserted: row, total: db.from(Users).count() });
});

app.post("/notes", (req: any, res: any) => {
  served++;
  const id = ++notesWritten;
  const path = `${NOTES_DIR}/note-${id}.txt`;
  writeText(path, bodyText(req.body));
  res.json({ id, path });
});

app.get("/note", (req: any, res: any) => {
  served++;
  const q = parseQuery(req.query);
  const id = parseInt(q.id || "0", 10) | 0;
  const path = `${NOTES_DIR}/note-${id}.txt`;
  if (id <= 0 || !exists(path)) { res.status(404).json({ error: "no such note", id }); return; }
  res.json({ id, content: readText(path) });
});

app.get("/stats", (_req: any, res: any) => {
  served++;
  res.json({ users: db.from(Users).count(), notes: notesWritten, served, uptimeMs: Date.now() - started });
});

app.start();
console.log(`ECHO-SERVER READY :${PORT} (notes=${NOTES_DIR})`);

setInterval(() => {
  const m = E.metrics();
  console.log(`[server] served=${served} users=${db.from(Users).count()} notes=${notesWritten} heap=${(m.heap.usedBytes / 1048576).toFixed(1)}MB uptime=${((Date.now() - started) / 1000 | 0)}s`);
}, 60000);
