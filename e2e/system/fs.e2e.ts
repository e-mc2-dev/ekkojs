// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import {
  readText, read, writeText, write,
  exists, stat, remove, mkdir, readDir, readLines,
  tempDir, tempFile, tempSubdir,
  append, appendBytes, copy, rename,
  chmod, symlink, readlink,
  open, watch,
} from "ekko:fs";
import { asserter, sleep } from "../_harness.ts";

const t = asserter();
const WIN = Ekko.platform === "win32";

const root = tempSubdir("ekko-fs-e2e");
const P = (name: string) => root + "/" + name;
const bytesEq = (a: Uint8Array, b: number[] | Uint8Array) =>
  a.length === b.length && Array.prototype.every.call(a, (v: number, i: number) => v === (b as any)[i]);

async function waitEvent(w: any, namePart: string, maxPolls = 50): Promise<any | null> {
  for (let i = 0; i < maxPolls; i++) {
    const r = w.next();
    if (r && r.done === false && String(r.value.path).includes(namePart)) return r.value;
    await sleep(40);
  }
  return null;
}

(async () => {
  
  t.group("writeText / readText");
  writeText(P("a.txt"), "hello EkkoJS");
  t.eq("readText round-trip", readText(P("a.txt")), "hello EkkoJS");
  t.type("readText returns string", readText(P("a.txt")), "string");
  writeText(P("a.txt"), "short");
  t.eq("writeText truncates on rewrite", readText(P("a.txt")), "short");
  writeText(P("empty.txt"), "");
  t.eq("writeText empty string", readText(P("empty.txt")), "");
  t.eq("empty file size 0", stat(P("empty.txt")).size, 0);
  const ascii = "Pure ASCII 12345 !@#$%^&*()";
  writeText(P("ascii.txt"), ascii);
  t.eq("ASCII fast-path round-trip", readText(P("ascii.txt")), ascii);
  const uni = "héllo 世界 🚀 ñ ü ß";
  writeText(P("uni.txt"), uni);
  t.eq("UTF-8 multibyte round-trip", readText(P("uni.txt")), uni);
  const nl = "line1\nline2\nline3";
  writeText(P("nl.txt"), nl);
  t.eq("newlines preserved", readText(P("nl.txt")), nl);
  
  t.throws("readText missing -> ENOENT", () => readText(P("nope.txt")), /ENOENT/);
  t.throws("readText on directory -> EISDIR/EACCES", () => readText(root), /EISDIR|EACCES/);
  write(P("bad.bin"), new Uint8Array([0xff, 0xfe, 0xfd]));
  t.throws("readText invalid UTF-8 -> EILSEQ", () => readText(P("bad.bin")), /EILSEQ/);
  t.throws("writeText into missing parent -> ENOENT", () => writeText(P("no/such/dir/x.txt"), "x"), /ENOENT/);
  t.throws("writeText onto a directory path -> EISDIR/EACCES", () => writeText(root, "x"), /EISDIR|EACCES/);

  t.group("write / read (binary)");
  write(P("b.dat"), new Uint8Array([0, 1, 2, 254, 255]));
  const rb = read(P("b.dat"));
  t.ok("read returns Uint8Array", rb instanceof Uint8Array);
  t.eq("binary length", rb.length, 5);
  t.eq("binary[0]", rb[0], 0);
  t.eq("binary[3]", rb[3], 254);
  t.eq("binary[4]", rb[4], 255);
  
  const all = new Uint8Array(256);
  for (let i = 0; i < 256; i++) all[i] = i;
  write(P("all.dat"), all);
  t.ok("all-256-bytes round-trip", bytesEq(read(P("all.dat")), all));
  
  write(P("z.dat"), new Uint8Array([]));
  t.eq("empty binary file length 0", read(P("z.dat")).length, 0);
  
  write(P("s.dat"), "AB");
  t.ok("write(string) writes UTF-8 bytes", bytesEq(read(P("s.dat")), [0x41, 0x42]));
  
  const big = new Uint8Array([9, 8, 7, 6, 5]);
  write(P("sub.dat"), big.subarray(1, 4)); 
  t.ok("write(subarray) respects view offset", bytesEq(read(P("sub.dat")), [8, 7, 6]));
  
  const large = new Uint8Array(100_000);
  for (let i = 0; i < large.length; i++) large[i] = i % 256;
  write(P("large.dat"), large);
  const lr = read(P("large.dat"));
  t.eq("large length", lr.length, 100_000);
  t.ok("large round-trip content", lr[0] === 0 && lr[255] === 255 && lr[99_999] === (99_999 % 256));
  
  write(P("ov.dat"), new Uint8Array([1, 2, 3, 4]));
  write(P("ov.dat"), new Uint8Array([9]));
  t.eq("write overwrites/truncates", read(P("ov.dat")).length, 1);
  
  t.throws("read missing -> ENOENT", () => read(P("nope.bin")), /ENOENT/);
  t.throws("read on directory -> EISDIR/EACCES", () => read(root), /EISDIR|EACCES/);
  t.throws("write into missing parent -> ENOENT", () => write(P("no/dir/x"), new Uint8Array([1])), /ENOENT/);

  t.group("exists");
  t.eq("exists file true", exists(P("a.txt")), true);
  t.eq("exists missing false", exists(P("nope.txt")), false);
  t.eq("exists dir true", exists(root), true);
  t.notThrows("exists never throws on missing", () => exists(P("nope.txt")));
  writeText(P("del.txt"), "x");
  remove(P("del.txt"));
  t.eq("exists false after remove", exists(P("del.txt")), false);

  t.group("stat");
  writeText(P("st.txt"), "12345");
  const s = stat(P("st.txt"));
  t.eq("stat.isFile true", s.isFile, true);
  t.eq("stat.isDirectory false", s.isDirectory, false);
  t.eq("stat.size matches bytes", s.size, 5);
  t.eq("stat.name is basename", s.name, "st.txt");
  t.type("stat.size is number", s.size, "number");
  t.deep("stat keys exactly", Object.keys(s), ["name", "size", "isFile", "isDirectory"]);
  const sd = stat(root);
  t.eq("stat dir isDirectory true", sd.isDirectory, true);
  t.eq("stat dir isFile false", sd.isFile, false);
  t.throws("stat missing -> ENOENT", () => stat(P("nope.txt")), /ENOENT/);

  t.group("mkdir / readDir");
  mkdir(P("d1"));
  t.eq("mkdir creates dir", exists(P("d1")), true);
  mkdir(P("d2/deep/nested"));
  t.eq("mkdir -p nested", exists(P("d2/deep/nested")), true);
  t.notThrows("mkdir idempotent on existing", () => mkdir(P("d1")));
  t.eq("mkdir idempotent keeps dir", exists(P("d1")), true);
  
  mkdir(P("rd"));
  writeText(P("rd/f1.txt"), "a");
  writeText(P("rd/f2.txt"), "bb");
  mkdir(P("rd/subdir"));
  const entries = readDir(P("rd"));
  t.ok("readDir returns array", Array.isArray(entries));
  t.eq("readDir length", entries.length, 3);
  t.ok("readDir finds f1 as file", entries.some((e: any) => e.name === "f1.txt" && e.isFile && !e.isDirectory));
  t.ok("readDir finds subdir as dir", entries.some((e: any) => e.name === "subdir" && e.isDirectory && !e.isFile));
  t.deep("readDir entry keys", Object.keys(entries[0]), ["name", "isFile", "isDirectory"]);
  mkdir(P("rd_empty"));
  t.eq("readDir empty dir -> []", readDir(P("rd_empty")).length, 0);
  
  t.throws("readDir missing -> ENOENT", () => readDir(P("nope_dir")), /ENOENT/);
  t.throws("readDir on a file -> ENOTDIR/EACCES/EIO", () => readDir(P("a.txt")), /ENOTDIR|EACCES|EIO/);
  t.throws("mkdir over existing file -> EEXIST", () => mkdir(P("a.txt")), /EEXIST/);

  t.group("readLines");
  writeText(P("lines.txt"), "alpha\nbeta\ngamma");
  const lines = readLines(P("lines.txt"));
  t.ok("readLines returns array", Array.isArray(lines));
  t.eq("readLines count", lines.length, 3);
  t.eq("readLines[0]", lines[0], "alpha");
  t.eq("readLines[2]", lines[2], "gamma");
  writeText(P("trail.txt"), "x\ny\n");
  t.eq("readLines drops trailing-newline empty", readLines(P("trail.txt")).length, 2);
  writeText(P("notrail.txt"), "x\ny");
  t.eq("readLines no-trailing count", readLines(P("notrail.txt")).length, 2);
  writeText(P("emptyl.txt"), "");
  t.eq("readLines empty file -> []", readLines(P("emptyl.txt")).length, 0);
  
  writeText(P("esc.txt"), 'a"quote\nback\\slash');
  const esc = readLines(P("esc.txt"));
  t.eq("readLines preserves quote", esc[0], 'a"quote');
  t.eq("readLines preserves backslash", esc[1], "back\\slash");
  t.throws("readLines missing -> ENOENT", () => readLines(P("nope.txt")), /ENOENT/);

  t.group("append / appendBytes");
  append(P("ap.txt"), "one");
  t.eq("append creates file", readText(P("ap.txt")), "one");
  append(P("ap.txt"), "two");
  t.eq("append concatenates", readText(P("ap.txt")), "onetwo");
  appendBytes(P("ap.txt"), new Uint8Array([0x21])); 
  t.eq("appendBytes appends view", readText(P("ap.txt")), "onetwo!");
  appendBytes(P("apb.txt"), new Uint8Array([0x41, 0x42])); 
  t.eq("appendBytes creates file", readText(P("apb.txt")), "AB");
  
  t.notThrows("appendBytes(string) no-op no-throw", () => appendBytes(P("ap.txt"), "ignored" as any));
  t.eq("appendBytes(string) left file unchanged", readText(P("ap.txt")), "onetwo!");
  t.notThrows("appendBytes(number) no-op", () => appendBytes(P("ap.txt"), 123 as any));
  t.notThrows("appendBytes(null) no-op", () => appendBytes(P("ap.txt"), null as any));
  t.eq("appendBytes non-view never wrote", readText(P("ap.txt")), "onetwo!");
  t.eq("appendBytes(string) did not create file", exists(P("never.txt")), false);
  
  appendBytes(P("never.txt"), "still-no" as any);
  t.eq("appendBytes(string) to new path = no file", exists(P("never.txt")), false);

  t.group("copy / rename");
  writeText(P("src.txt"), "payload");
  copy(P("src.txt"), P("dst.txt"));
  t.eq("copy duplicates content", readText(P("dst.txt")), "payload");
  t.eq("copy leaves src intact", readText(P("src.txt")), "payload");
  writeText(P("src2.txt"), "newer");
  copy(P("src2.txt"), P("dst.txt"));
  t.eq("copy overwrites dst", readText(P("dst.txt")), "newer");
  t.throws("copy missing src -> ENOENT", () => copy(P("nope.txt"), P("x.txt")), /ENOENT/);
  t.throws("copy into missing dst parent -> ENOENT", () => copy(P("src.txt"), P("no/dir/x.txt")), /ENOENT/);
  
  writeText(P("mv-from.txt"), "moved");
  rename(P("mv-from.txt"), P("mv-to.txt"));
  t.eq("rename removes old", exists(P("mv-from.txt")), false);
  t.eq("rename creates new", exists(P("mv-to.txt")), true);
  t.eq("rename preserves content", readText(P("mv-to.txt")), "moved");
  writeText(P("ov-from.txt"), "replacement");
  writeText(P("ov-target.txt"), "old");
  rename(P("ov-from.txt"), P("ov-target.txt"));
  t.eq("rename overwrites dst", readText(P("ov-target.txt")), "replacement");
  t.throws("rename missing src -> ENOENT", () => rename(P("nope.txt"), P("x.txt")), /ENOENT/);

  t.group("tempDir / tempFile / tempSubdir");
  const td = tempDir();
  t.type("tempDir returns string", td, "string");
  t.gt("tempDir non-empty", td.length, 0);
  t.eq("tempDir exists", exists(td), true);
  const tf1 = tempFile();
  const tf2 = tempFile();
  t.eq("tempFile exists", exists(tf1), true);
  t.eq("tempFile is empty", stat(tf1).size, 0);
  t.ne("tempFile unique", tf1, tf2);
  t.notThrows("tempFile writable", () => writeText(tf1, "scratch"));
  t.eq("tempFile holds written data", readText(tf1), "scratch");
  const ts1 = tempSubdir(); 
  const ts2 = tempSubdir("buildx");
  const ts3 = tempSubdir("buildx");
  t.eq("tempSubdir default exists", exists(ts1), true);
  t.ok("tempSubdir default prefix 'ekko-'", ts1.includes("ekko-"));
  t.eq("tempSubdir custom exists", exists(ts2), true);
  t.ok("tempSubdir custom prefix in name", ts2.includes("buildx-"));
  t.ne("tempSubdir unique", ts2, ts3);
  
  remove(tf1); remove(tf2);
  remove(ts1, true); remove(ts2, true); remove(ts3, true);

  t.group("remove semantics + recursive param");
  writeText(P("rm-file.txt"), "x");
  remove(P("rm-file.txt"));
  t.eq("remove file", exists(P("rm-file.txt")), false);
  mkdir(P("rm-empty"));
  remove(P("rm-empty")); 
  t.eq("remove empty dir (no recursive)", exists(P("rm-empty")), false);
  mkdir(P("rm-full"));
  writeText(P("rm-full/inner.txt"), "x");
  t.throws("remove non-empty dir without recursive -> ENOTEMPTY/EACCES/EIO", () => remove(P("rm-full")), /ENOTEMPTY|EACCES|EIO/);
  t.eq("remove failed -> dir still present", exists(P("rm-full")), true);
  remove(P("rm-full"), true);
  t.eq("remove non-empty dir with recursive=true", exists(P("rm-full")), false);
  mkdir(P("rm-full2"));
  writeText(P("rm-full2/x.txt"), "x");
  t.throws("remove(non-empty, recursive=false) -> ENOTEMPTY/EACCES/EIO", () => remove(P("rm-full2"), false), /ENOTEMPTY|EACCES|EIO/);
  t.eq("remove recursive=false left non-empty dir", exists(P("rm-full2")), true);
  remove(P("rm-full2"), true);
  t.eq("remove recursive=true cleared it", exists(P("rm-full2")), false);
  t.throws("remove missing path -> ENOENT", () => remove(P("nope-rm")), /ENOENT/);

  t.group("open: options matrix + errors");
  
  writeText(P("ro.txt"), "readonly");
  const roh = open(P("ro.txt"));
  t.gt("open default _handle > 0", roh._handle, 0);
  t.eq("open default size snapshot", roh.size, 8);
  t.eq("open default can read", readText(P("ro.txt")), "readonly");
  t.throws("open default is read-only (write rejected)", () => roh.write("nope"), /EIO|EACCES|EBADF/);
  roh.close();
  
  const rh = open(P("ro.txt"), { read: true });
  t.eq("open {read} reads", rh.read().length, 8);
  rh.close();
  
  const wh = open(P("created.bin"), { write: true, create: true });
  t.eq("open {write,create} creates file", exists(P("created.bin")), true);
  t.eq("handle.write returns bytes", wh.write(new Uint8Array([1, 2, 3])), 3);
  wh.close();
  t.eq("written file size", stat(P("created.bin")).size, 3);
  
  writeText(P("trunc.txt"), "0123456789");
  const th = open(P("trunc.txt"), { truncate: true });
  th.close();
  t.eq("open {truncate} empties existing", stat(P("trunc.txt")).size, 0);
  const thc = open(P("trunc-new.bin"), { truncate: true });
  thc.close();
  t.eq("open {truncate} also creates", exists(P("trunc-new.bin")), true);
  
  writeText(P("apph.txt"), "base");
  const ah = open(P("apph.txt"), { append: true });
  ah.write("-more");
  ah.close();
  t.eq("open {append} appends", readText(P("apph.txt")), "base-more");
  const ahc = open(P("apph-new.txt"), { append: true });
  ahc.write("created");
  ahc.close();
  t.eq("open {append} also creates", readText(P("apph-new.txt")), "created");
  
  const fb = open(P("ro.txt"), { read: false, write: false, append: false });
  t.eq("open all-false opts falls back to read", fb.read().length, 8);
  fb.close();
  
  t.throws("open missing for read -> ENOENT", () => open(P("ghost.bin")), /ENOENT/);
  t.throws("open {write} no create on missing -> ENOENT", () => open(P("ghost2.bin"), { write: true }), /ENOENT/);

  t.group("handle: write / seek / tell / read");
  const h = open(P("h.bin"), { read: true, write: true, create: true });
  t.eq("handle new size snapshot 0", h.size, 0);
  t.eq("write Uint8Array returns len", h.write(new Uint8Array([10, 20, 30, 40])), 4);
  t.eq("tell after write", h.tell(), 4);
  t.eq("handle.size stays snapshot after write", h.size, 0);
  t.eq("seek start returns 0", h.seek(0, "start"), 0);
  t.eq("tell after seek-start", h.tell(), 0);
  const two = h.read(2);
  t.eq("read(count) bound length", two.length, 2);
  t.eq("read(count)[0]", two[0], 10);
  t.eq("read advances cursor (tell=2)", h.tell(), 2);
  t.eq("seek current +1", h.seek(1, "current"), 3);
  t.eq("seek end returns size", h.seek(0, "end"), 4);
  t.eq("seek negative-from-end", h.seek(-2, "end"), 2);
  t.eq("seek default origin = start", h.seek(1), 1);
  t.eq("seek unknown origin treated as start", h.seek(3, "bogus" as any), 3);
  
  h.seek(1000, "start");
  t.eq("read past EOF returns 0 bytes", h.read(10).length, 0);
  
  h.seek(0, "start");
  t.eq("read() default count reads whole small file", h.read().length, 4);
  
  const h2 = open(P("h2.bin"), { read: true, write: true, create: true });
  t.eq("handle.write(string) returns byte len", h2.write("ABC"), 3);
  h2.seek(0, "start");
  t.ok("handle.write(string) wrote UTF-8", bytesEq(h2.read(3), [0x41, 0x42, 0x43]));
  
  h2.seek(0, "end");
  h2.write(new Uint8Array([0x44]));
  t.eq("sequential write grew file", stat(P("h2.bin")).size, 4);
  h2.close();

  t.group("handle: truncate / flush / close + EBADF");
  const h3 = open(P("h3.bin"), { read: true, write: true, create: true });
  h3.write(new Uint8Array([1, 2, 3, 4, 5, 6]));
  t.notThrows("flush no-throw", () => h3.flush());
  h3.truncate(3); 
  h3.close();
  t.eq("truncate(3) shrank file", stat(P("h3.bin")).size, 3);
  const h4 = open(P("h4.bin"), { read: true, write: true, create: true });
  h4.write(new Uint8Array([1, 2, 3, 4]));
  h4.truncate(); 
  h4.close();
  t.eq("truncate() default empties file", stat(P("h4.bin")).size, 0);
  const h5 = open(P("h5.bin"), { read: true, write: true, create: true });
  h5.write(new Uint8Array([7, 7]));
  h5.truncate(5); 
  h5.close();
  t.eq("truncate(extend) grows file", stat(P("h5.bin")).size, 5);
  const h5r = read(P("h5.bin"));
  t.ok("truncate(extend) zero-fills", h5r[0] === 7 && h5r[1] === 7 && h5r[2] === 0 && h5r[4] === 0);
  
  const hc = open(P("hc.bin"), { read: true, write: true, create: true });
  hc.write(new Uint8Array([1]));
  hc.close();
  t.throws("read after close -> EBADF", () => hc.read(1), /EBADF/);
  t.throws("write after close -> EBADF", () => hc.write("x"), /EBADF/);
  t.throws("seek after close -> EBADF", () => hc.seek(0, "start"), /EBADF/);
  t.throws("tell after close -> EBADF", () => hc.tell(), /EBADF/);
  t.notThrows("flush after close is silent", () => hc.flush());
  t.notThrows("truncate after close is silent", () => hc.truncate(0));
  t.notThrows("close is idempotent", () => hc.close());

  t.group("chmod (platform-conditional)");
  writeText(P("perm.txt"), "x");
  if (WIN) {
    t.notThrows("chmod no-op on Windows", () => chmod(P("perm.txt"), 0o644));
    t.notThrows("chmod missing path no-throw on Windows", () => chmod(P("nope-perm.txt"), 0o600));
    t.notThrows("chmod default mode no-throw on Windows", () => chmod(P("perm.txt")));
  } else {
    t.notThrows("chmod sets 0o644 no-throw", () => chmod(P("perm.txt"), 0o644));
    t.notThrows("chmod sets 0o600 no-throw", () => chmod(P("perm.txt"), 0o600));
    t.notThrows("chmod default mode no-throw", () => chmod(P("perm.txt")));

    t.notThrows("chmod() default keeps file owner-readable (0o644 not 0)", () => readText(P("perm.txt")));
    t.eq("chmod target still statable", stat(P("perm.txt")).isFile, true);
    t.throws("chmod missing path -> ENOENT (unix)", () => chmod(P("nope-perm.txt"), 0o644), /ENOENT/);
  }

  t.group("symlink / readlink (platform-conditional)");
  writeText(P("link-target.txt"), "i am the target");
  if (WIN) {
    
    let made = false;
    try { symlink(P("link-target.txt"), P("the.link")); made = true; } catch { made = false; }
    if (made) {
      t.eq("win symlink: link exists", exists(P("the.link")), true);
      t.eq("win readlink returns target", readlink(P("the.link")), P("link-target.txt"));
    } else {
      t.ok("win symlink unprivileged -> threw (acceptable)", true);
      t.ok("win symlink skipped readlink (no privilege)", true);
    }
    t.throws("readlink on non-link -> EINVAL/ENOENT/EIO", () => readlink(P("link-target.txt")), /EINVAL|ENOENT|EIO/);
  } else {
    symlink(P("link-target.txt"), P("the.link"));
    t.eq("symlink created", exists(P("the.link")), true);
    t.eq("readlink returns target path", readlink(P("the.link")), P("link-target.txt"));
    t.eq("symlink resolves to content", readText(P("the.link")), "i am the target");
    t.throws("readlink on regular file -> EINVAL", () => readlink(P("link-target.txt")), /EINVAL/);
    t.throws("readlink on missing -> ENOENT", () => readlink(P("nope.link")), /ENOENT/);
  }

  t.group("watch (async, tolerant)");
  mkdir(P("w"));
  const w = watch(P("w"), { recursive: true });
  t.type("watch returns object", w, "object");
  t.type("watcher.next is function", w.next, "function");
  t.type("watcher.close is function", w.close, "function");
  t.gt("watcher _watcherId > 0", w._watcherId, 0);
  await sleep(80); 
  
  writeText(P("w/created.txt"), "hi");
  const evC = await waitEvent(w, "created.txt");
  t.ok("watch saw create/modify event", evC !== null);
  if (evC) {
    t.ok("watch event type valid", ["create", "modify", "remove"].includes(evC.type));
    t.ok("watch event path includes filename", String(evC.path).includes("created.txt"));
  } else {
    t.ok("watch create (skipped type check - no event)", true);
    t.ok("watch create (skipped path check - no event)", true);
  }
  
  writeText(P("w/created.txt"), "changed content here");
  const evM = await waitEvent(w, "created.txt");
  t.ok("watch saw modify event", evM !== null);
  
  remove(P("w/created.txt"));
  const evR = await waitEvent(w, "created.txt");
  t.ok("watch saw remove event", evR !== null);

  
  
  mkdir(P("w/sub"));
  await waitEvent(w, "sub");
  await sleep(300);
  writeText(P("w/sub/nested.txt"), "deep");
  const evN = await waitEvent(w, "nested.txt", 75);
  t.ok("watch recursive saw nested change", evN !== null);
  
  w.close();
  await sleep(120);
  
  let terminal: any = w.next();
  for (let i = 0; i < 50 && !(terminal && terminal.done === true); i++) {
    await sleep(40);
    terminal = w.next();
  }
  t.ok("watch after close eventually done:true", terminal && terminal.done === true);
  if (terminal && terminal.done === true) t.eq("watch terminal value undefined", terminal.value, undefined);
  else t.ok("watch terminal (skipped value check)", true);
  
  const wnr = watch(P("w"), { recursive: false });
  t.type("watch {recursive:false} returns object", wnr, "object");
  t.gt("non-recursive watcher id > 0", wnr._watcherId, 0);
  wnr.close();

  t.group("handle: random access + integrity");
  const ra = open(P("ra.bin"), { read: true, write: true, create: true });
  ra.write(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
  t.eq("ra size after write", stat(P("ra.bin")).size, 10);
  ra.seek(4, "start");
  t.eq("ra write-at-offset returns len", ra.write(new Uint8Array([40, 41])), 2);
  ra.seek(0, "start");
  const full = ra.read(10);
  t.eq("ra[3] unchanged before patch", full[3], 3);
  t.eq("ra[4] overwritten", full[4], 40);
  t.eq("ra[5] overwritten", full[5], 41);
  t.eq("ra[6] unchanged after patch", full[6], 6);
  ra.seek(0, "start");
  const c1 = ra.read(3), c2 = ra.read(3), c3 = ra.read(4);
  t.eq("chunk1 len", c1.length, 3);
  t.eq("chunk2 len", c2.length, 3);
  t.eq("chunk3 len", c3.length, 4);
  t.eq("chunk2 continues stream", c2[0], 3);
  t.eq("chunk3 continues stream", c3[0], 6);
  ra.close();
  const ro2 = open(P("ra.bin"), { read: true, write: true });
  t.eq("reopen {read,write} no truncate preserves size", ro2.size, 10);
  t.eq("reopen reads preserved patched byte", ro2.read(10)[4], 40);
  ro2.close();

  t.group("byte-vs-char / ArrayBuffer / integrity");
  writeText(P("e1.txt"), "é"); 
  t.eq("stat.size is bytes not chars (é=2)", stat(P("e1.txt")).size, 2);
  t.eq("readText returns the multibyte char", readText(P("e1.txt")), "é");
  write(P("e3.bin"), new Uint8Array([0xe2, 0x9c, 0x93])); 
  t.eq("3-byte UTF-8 decodes via readText", readText(P("e3.bin")), "✓");
  const abuf = new ArrayBuffer(3);
  const aview = new Uint8Array(abuf);
  aview[0] = 65; aview[1] = 66; aview[2] = 67;
  write(P("e4.bin"), aview);
  t.ok("write from ArrayBuffer-backed view", bytesEq(read(P("e4.bin")), [65, 66, 67]));
  copy(P("all.dat"), P("all-copy.dat"));
  t.ok("copy preserves full 256-byte binary integrity", bytesEq(read(P("all-copy.dat")), all));
  mkdir(P("p1/p2/p3/p4/p5"));
  t.eq("mkdir 5 levels deep", exists(P("p1/p2/p3/p4/p5")), true);
  writeText(P("ae.txt"), "X");
  appendBytes(P("ae.txt"), new Uint8Array([]));
  t.eq("appendBytes empty view appends nothing", readText(P("ae.txt")), "X");
  writeText(P("ow.txt"), "longer original content");
  writeText(P("ow.txt"), "tiny");
  t.eq("writeText fully truncates longer prior content", readText(P("ow.txt")), "tiny");
  t.eq("writeText truncation reflected in size", stat(P("ow.txt")).size, 4);

  t.group("error-code conventions (consolidated)");
  t.throws("ENOENT prefix on readText", () => readText(P("x1")), /^ENOENT/);
  t.throws("ENOENT prefix on read", () => read(P("x2")), /^ENOENT/);
  t.throws("ENOENT prefix on stat", () => stat(P("x3")), /^ENOENT/);
  t.throws("ENOENT prefix on readDir", () => readDir(P("x4")), /^ENOENT/);
  t.throws("ENOENT prefix on open(read)", () => open(P("x5")), /^ENOENT/);
  t.throws("ENOENT prefix on remove(missing)", () => remove(P("x6")), /^ENOENT/);
  t.throws("EILSEQ prefix on bad utf8", () => readText(P("bad.bin")), /^EILSEQ/);

  remove(root, true);
  t.eq("sandbox cleaned up", exists(root), false);

  t.done("ekko:fs");
})().catch((e) => {
  console.log("UNCAUGHT: " + (e && e.message ? e.message : e));
  Ekko.exit(1);
});
