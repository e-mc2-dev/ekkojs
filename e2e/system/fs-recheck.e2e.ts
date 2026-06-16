// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import * as fs from "ekko:fs";
import { asserter } from "../_harness.ts";

const t = asserter();
const WIN = Ekko.platform === "win32";

(async () => {
  const sb = fs.tempSubdir("fs-recheck");
  const j = (n: string) => sb + "/" + n;

  t.group("large I/O (4 MB round-trip, no truncation)");
  const big = "A".repeat(4 * 1024 * 1024);
  fs.writeText(j("big.txt"), big);
  t.eq("4MB readText length", fs.readText(j("big.txt")).length, 4 * 1024 * 1024);
  t.eq("4MB content head/tail intact", fs.readText(j("big.txt")).at(-1), "A");

  t.group("unicode filename lifecycle");
  const uni = j("ünïçödé-文件-😀.txt");
  fs.writeText(uni, "héllo-世界");
  t.eq("unicode filename readText", fs.readText(uni), "héllo-世界");
  t.eq("unicode filename exists", fs.exists(uni), true);
  t.ok("unicode filename appears in readDir", fs.readDir(sb).some((e: any) => String(e?.name ?? e).includes("文件")));

  t.group("readLines edges");
  fs.writeText(j("nl.txt"), "a\nb\nc");          
  t.eq("no-trailing-newline -> 3 lines", fs.readLines(j("nl.txt")).length, 3);
  fs.writeText(j("crlf.txt"), "x\r\ny\r\n");
  t.eq("CRLF -> 2 lines", fs.readLines(j("crlf.txt")).length, 2);
  fs.writeText(j("blank.txt"), "a\n\n\nb\n");
  t.eq("blank lines preserved -> 4", fs.readLines(j("blank.txt")).length, 4);
  fs.writeText(j("empty.txt"), "");
  t.eq("empty file -> 0 lines", fs.readLines(j("empty.txt")).length, 0);

  t.group("binary fidelity (all 256 byte values)");
  const bytes = new Uint8Array(256); for (let i = 0; i < 256; i++) bytes[i] = i;
  fs.write(j("bin"), bytes);
  const rb = fs.read(j("bin"));
  t.eq("256-byte file length", rb.length, 256);
  t.eq("byte[0]==0", rb[0], 0);
  t.eq("byte[200]==200", rb[200], 200);
  t.eq("byte[255]==255", rb[255], 255);

  t.group("concurrency (50 parallel writes + reads)");
  await Promise.all(Array.from({ length: 50 }, (_, i) => Promise.resolve(fs.writeText(j("c" + i + ".txt"), "v" + i))));
  t.ok("50 concurrent writes/reads all correct",
    Array.from({ length: 50 }, (_, i) => fs.readText(j("c" + i + ".txt"))).every((v, i) => v === "v" + i));

  t.group("append accumulation + UTF-8 byte length");
  fs.writeText(j("ap.txt"), "1"); fs.append(j("ap.txt"), "2"); fs.append(j("ap.txt"), "3");
  t.eq("append builds '123'", fs.readText(j("ap.txt")), "123");
  fs.writeText(j("mb.txt"), "Ω");   
  t.eq("multibyte writeText -> 2 raw bytes", fs.read(j("mb.txt")).length, 2);

  t.group("error codes reflect the real error (task 205)");
  fs.mkdir(j("adir"));
  t.throws("read missing -> ENOENT", () => fs.readText(j("ghost.txt")), /ENOENT/);
  t.throws("write into missing parent -> ENOENT", () => fs.writeText(j("no/such/x.txt"), "x"), /ENOENT/);
  t.throws("read a directory -> EISDIR (POSIX) / EACCES (Win)", () => fs.readText(j("adir")), WIN ? /EACCES|EISDIR/ : /EISDIR/);
  t.throws("mkdir over existing file -> EEXIST", () => { fs.writeText(j("f.txt"), "x"); fs.mkdir(j("f.txt")); }, /EEXIST/);

  fs.remove(sb, true);
  t.done("ekko:fs recheck");
})().catch((e) => { console.log("UNCAUGHT: " + String((e as any)?.message ?? e)); Ekko.exit(1); });
