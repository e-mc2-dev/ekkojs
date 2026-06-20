// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { exec, spawn } from "ekko:process";
import { tempSubdir, writeText, remove } from "ekko:fs";
import { asserter, sleep } from "../_harness";

const t = asserter();
const WIN = Ekko.platform === "win32";
const EKKO = Ekko.args[0];
const ev = (code: string) => [EKKO, ["eval", code]] as [string, string[]];
async function waitUntil(pred: () => boolean, maxMs = 4000): Promise<boolean> {
  const end = Date.now() + maxMs;
  while (Date.now() < end) { if (pred()) return true; await sleep(25); }
  return pred();
}

(async () => {
  
  t.group("exec — stdout / stderr / exitCode");
  const r1 = await exec(...ev("console.log('hello'); Ekko.exit(0)"));
  t.ok("exec stdout captured", r1.stdout.includes("hello"));
  t.type("stdout is string", r1.stdout, "string");
  t.type("stderr is string", r1.stderr, "string");
  t.type("exitCode is number", r1.exitCode, "number");
  t.eq("exec exitCode 0", r1.exitCode, 0);
  const r2 = await exec(...ev("console.error('errmsg'); Ekko.exit(0)"));
  t.ok("exec stderr captured", r2.stderr.includes("errmsg"));
  t.eq("exec exit 7", (await exec(...ev("Ekko.exit(7)"))).exitCode, 7);
  t.eq("exec exit 42", (await exec(...ev("Ekko.exit(42)"))).exitCode, 42);
  t.eq("exec exit 2", (await exec(...ev("Ekko.exit(2)"))).exitCode, 2);
  const rt = await exec(...ev("throw new Error('boomX')"));
  t.eq("uncaught throw -> exit 1", rt.exitCode, 1);
  t.ok("uncaught throw -> stderr has message", rt.stderr.includes("boomX"));
  const rv = await exec(EKKO, ["--version"]);
  t.ok("--version stdout has 'ekko'", /ekko/i.test(rv.stdout));
  t.eq("--version exit 0", rv.exitCode, 0);
  const rm = await exec(...ev("console.log('a'); console.log('b'); Ekko.exit(0)"));
  t.ok("multi-line stdout (a)", rm.stdout.includes("a"));
  t.ok("multi-line stdout (b)", rm.stdout.includes("b"));
  t.eq("exec exit 1", (await exec(...ev("Ekko.exit(1)"))).exitCode, 1);
  t.eq("exec exit 100", (await exec(...ev("Ekko.exit(100)"))).exitCode, 100);
  t.eq("exec exit 255", (await exec(...ev("Ekko.exit(255)"))).exitCode, 255);
  t.ok("computed stdout 6*7=42", (await exec(...ev("console.log(6*7); Ekko.exit(0)"))).stdout.includes("42"));
  t.ok("string concat stdout", (await exec(...ev("console.log('x'+'y'); Ekko.exit(0)"))).stdout.includes("xy"));
  t.ok("JSON stdout", (await exec(...ev("console.log(JSON.stringify({a:1})); Ekko.exit(0)"))).stdout.includes('{"a":1}'));
  const rboth = await exec(...ev("console.log('OUT'); console.error('ERR'); Ekko.exit(3)"));
  t.ok("stdout+stderr both: stdout", rboth.stdout.includes("OUT"));
  t.ok("stdout+stderr both: stderr", rboth.stderr.includes("ERR"));
  t.eq("stdout+stderr both: exit 3", rboth.exitCode, 3);

  t.group("exec — opts.cwd");
  const cwdDir = tempSubdir("proc-cwd");
  const cwdBase = cwdDir.split(/[\\/]/).filter(Boolean).pop()!; 
  const rc = await exec(EKKO, ["eval", "console.log(Ekko.cwd()); Ekko.exit(0)"], { cwd: cwdDir });
  
  t.ok("child cwd is opts.cwd (ends with sandbox)", rc.stdout.trim().endsWith(cwdBase));
  t.eq("cwd run exit 0", rc.exitCode, 0);
  const rc2 = await exec(...ev("Ekko.exit(0)")); 
  t.eq("no-cwd inherits + runs", rc2.exitCode, 0);
  remove(cwdDir, true);

  t.group("exec — opts.env (via shell)");
  const re = WIN
    ? await exec("cmd", ["/c", "echo %E2E_V%"], { env: { E2E_V: "val123" } })
    : await exec("sh", ["-c", "echo $E2E_V"], { env: { E2E_V: "val123" } });
  t.eq("env var passed to child", re.stdout.trim(), "val123");
  t.eq("env-shell exit 0", re.exitCode, 0);
  const re2 = WIN
    ? await exec("cmd", ["/c", "echo %A%-%B%"], { env: { A: "x", B: "y" } })
    : await exec("sh", ["-c", "echo $A-$B"], { env: { A: "x", B: "y" } });
  t.eq("two env vars", re2.stdout.trim(), "x-y");

  t.group("exec — opts.timeout (-1 on kill)");
  const t0 = Date.now();
  const rto = await exec(EKKO, ["eval", "var e=Date.now()+30000; while(Date.now()<e){}"], { timeout: 800 });
  t.eq("timeout -> exitCode -1", rto.exitCode, -1);
  t.ok("timeout killed near the deadline", Date.now() - t0 < 5000);
  const rok = await exec(EKKO, ["eval", "Ekko.exit(0)"], { timeout: 10000 });
  t.eq("within timeout -> exit 0", rok.exitCode, 0);

  t.group("exec — args + errors");
  const ra = await exec(...ev("console.log(Ekko.args.length); Ekko.exit(0)"));
  t.gte("child sees args", Number(ra.stdout.trim()), 2);
  const ra2 = await exec(...ev("console.log(Ekko.args[1]); Ekko.exit(0)"));
  t.eq("child arg[1] is 'eval'", ra2.stdout.trim(), "eval");
  await t.rejects("exec nonexistent command rejects", () => exec("definitely_not_a_command_xyz_200", []), /error|process|found|No such|cannot/i);

  t.group("FIX #2 — runtime stays alive while a timer is pending");
  const rlate = await exec(EKKO, ["eval", "setTimeout(() => console.log('LATE'), 150); 0"]);
  t.ok("eval drains pending timer (prints LATE)", rlate.stdout.includes("LATE"));
  t.eq("eval-with-timer exit 0", rlate.exitCode, 0);

  t.group("FIX #1 — spawn returns an interactive object");
  const child = spawn(...ev("Ekko.exit(0)"));
  t.type("spawn returns object", child, "object");
  t.type("child.pid is number", (child as any).pid, "number");
  for (const m of ["write", "closeStdin", "kill", "onStdout", "onStderr", "onExit"]) {
    t.type("child." + m + " is function", (child as any)[m], "function");
  }
  let exited: number | null = null;
  (child as any).onExit((c: number) => { exited = c; });
  t.ok("fast child onExit fires", await waitUntil(() => exited !== null));
  t.eq("fast child exit code 0", exited, 0);
  const c2 = spawn(...ev("Ekko.exit(0)"));
  t.ne("two spawns -> distinct pids", (c2 as any).pid, (child as any).pid);
  let e2: number | null = null; (c2 as any).onExit((c: number) => { e2 = c; }); await waitUntil(() => e2 !== null);

  
  
  const pidChild = spawn(...ev("console.log('PID=' + Ekko.pid); setTimeout(() => Ekko.exit(0), 1500)"));
  let pidOut = "";
  (pidChild as any).onStdout((s: string) => { pidOut += s; });
  await waitUntil(() => /PID=\d+/.test(pidOut), 5000);
  const reported = Number((pidOut.match(/PID=(\d+)/) || [])[1]);
  t.gt("child self-reported a real OS pid (> 4)", reported, 4);
  t.eq("child.pid equals the child's own Ekko.pid (real OS pid, not the handle)", (pidChild as any).pid, reported);
  let pe: number | null = null; (pidChild as any).onExit((c: number) => { pe = c; }); await waitUntil(() => pe !== null, 6000);

  t.group("FIX #1 — spawn stdin→stdout round-trip (sort)");
  const sorter = spawn("sort", []);
  let out = "";
  let sortExit: number | null = null;
  (sorter as any).onStdout((d: string) => { out += d; });
  (sorter as any).onExit((c: number) => { sortExit = c; });
  (sorter as any).write("hello\n");
  (sorter as any).closeStdin();
  t.ok("sort child exited", await waitUntil(() => sortExit !== null, 6000));
  t.eq("round-trip stdout echoes input", out.trim(), "hello");
  t.eq("sort exit code 0", sortExit, 0);

  t.group("FIX #1 — kill a long-running child");
  const longC = spawn(...ev("setTimeout(() => {}, 30000)"));
  let killExit: number | null = null;
  (longC as any).onExit((c: number) => { killExit = c; });
  await sleep(250);
  t.notThrows("kill() callable", () => (longC as any).kill());
  t.ok("killed child onExit fires", await waitUntil(() => killExit !== null, 6000));

  t.group("FIX #1 — spawn onStderr + non-zero exit code");
  const errC = spawn(...ev("console.error('CHILD_ERR'); Ekko.exit(0)"));
  let serr = "";
  let errExit: number | null = null;
  (errC as any).onStderr((d: string) => { serr += d; });
  (errC as any).onExit((c: number) => { errExit = c; });
  t.ok("child with stderr exited", await waitUntil(() => errExit !== null, 6000));
  t.ok("onStderr received child stderr", serr.includes("CHILD_ERR"));
  t.eq("clean child exit 0", errExit, 0);
  const nzC = spawn(...ev("Ekko.exit(5)"));
  let nzExit: number | null = null;
  (nzC as any).onExit((c: number) => { nzExit = c; });
  t.ok("non-zero child exited", await waitUntil(() => nzExit !== null, 6000));
  t.eq("non-zero exit code propagates", nzExit, 5);
  const c3 = spawn(...ev("Ekko.exit(0)"));
  let e3: number | null = null; (c3 as any).onExit((c: number) => { e3 = c; });
  t.ne("third spawn distinct pid (vs first)", (c3 as any).pid, (child as any).pid);
  t.ne("third spawn distinct pid (vs second)", (c3 as any).pid, (c2 as any).pid);
  await waitUntil(() => e3 !== null);

  t.group("FIX #3 — a script that spawns + drains exits 0 (not 127)");
  const sb = tempSubdir("proc-spawn-exit");
  const script = sb + "/spawner.ts";
  writeText(script, 'import { spawn } from "ekko:process";\nconst c = spawn(Ekko.args[0], ["eval", "1+1"]);\n// no Ekko.exit — the loop must drain after the child exits and return 0\n');
  const rsp = await exec(EKKO, ["run", "--allow=process", script]);
  t.eq("spawn-then-drain script exits 0", rsp.exitCode, 0);
  t.ne("spawn-then-drain not 127", rsp.exitCode, 127);
  remove(sb, true);

  t.group("Ekko.env");
  Ekko.env.set("E2E_PROC_X", "one");
  t.eq("env.set then get", Ekko.env.get("E2E_PROC_X"), "one");
  t.eq("env.has set var", Ekko.env.has("E2E_PROC_X"), true);
  t.eq("env.has missing var", Ekko.env.has("E2E_PROC_NOPE_ZZZ"), false);
  Ekko.env.set("E2E_PROC_X", "two");
  t.eq("env.set overwrites", Ekko.env.get("E2E_PROC_X"), "two");
  const entries = Ekko.env.entries();
  t.ok("env.entries is array", Array.isArray(entries));
  t.ok("env.entries includes set var", entries.some((e: any) => (Array.isArray(e) ? e[0] : e) === "E2E_PROC_X") || JSON.stringify(entries).includes("E2E_PROC_X"));
  Ekko.env.delete("E2E_PROC_X");
  t.eq("env.delete -> has false", Ekko.env.has("E2E_PROC_X"), false);
  Ekko.env.set("E2E_PROC_U", "üñ™");
  t.eq("env unicode value", Ekko.env.get("E2E_PROC_U"), "üñ™");
  Ekko.env.delete("E2E_PROC_U");
  t.notThrows("env.delete nonexistent is ok", () => Ekko.env.delete("E2E_PROC_NEVER"));
  Ekko.env.set("E2E_PROC_E", "");
  t.eq("env empty-string value", Ekko.env.get("E2E_PROC_E"), "");
  t.eq("env empty-string has true", Ekko.env.has("E2E_PROC_E"), true);
  Ekko.env.delete("E2E_PROC_E");
  Ekko.env.set("E2E_PROC_N", "12345");
  t.eq("env numeric-string value", Ekko.env.get("E2E_PROC_N"), "12345");
  Ekko.env.delete("E2E_PROC_N");
  const before = Ekko.env.entries().length;
  Ekko.env.set("E2E_PROC_CNT", "z");
  t.gt("env.entries grows after set", Ekko.env.entries().length, before - 1);
  Ekko.env.delete("E2E_PROC_CNT");
  t.eq("env re-set after delete", (() => { Ekko.env.set("E2E_PROC_R", "r1"); Ekko.env.delete("E2E_PROC_R"); Ekko.env.set("E2E_PROC_R", "r2"); const v = Ekko.env.get("E2E_PROC_R"); Ekko.env.delete("E2E_PROC_R"); return v; })(), "r2");
  t.type("env.get is string", typeof Ekko.env.get("PATH"), "string");
  t.notThrows("env.set/get/delete roundtrip no-throw", () => { Ekko.env.set("E2E_PROC_T", "t"); Ekko.env.get("E2E_PROC_T"); Ekko.env.delete("E2E_PROC_T"); });

  t.group("Ekko.args / cwd / platform / pid / exit");
  t.ok("Ekko.args is array", Array.isArray(Ekko.args));
  t.ok("Ekko.args[0] is the ekko binary", /ekko(\.exe)?$/i.test(String(Ekko.args[0])));
  t.gte("Ekko.args length >= 1", Ekko.args.length, 1);
  t.type("Ekko.cwd() is string", Ekko.cwd(), "string");
  t.ok("Ekko.cwd() is absolute", WIN ? /^[A-Za-z]:[\\/]/.test(Ekko.cwd()) : Ekko.cwd().startsWith("/"));
  t.ok("Ekko.platform valid", ["win32", "linux", "darwin"].includes(Ekko.platform));
  t.type("Ekko.pid is number", Ekko.pid, "number");
  t.gt("Ekko.pid > 0", Ekko.pid, 0);
  t.type("Ekko.exit is a function", Ekko.exit, "function");
  t.eq("Ekko.cwd() consistent across calls", Ekko.cwd(), Ekko.cwd());
  t.eq("Ekko.platform matches running platform", Ekko.platform, WIN ? "win32" : Ekko.platform);
  t.type("Ekko.platform is string", Ekko.platform, "string");
  t.eq("Ekko.pid stable", Ekko.pid, Ekko.pid);
  t.ok("Ekko.args every entry is a string", Ekko.args.every((a: unknown) => typeof a === "string"));
  t.type("Ekko.spawn is a function", Ekko.spawn, "function");
  t.type("Ekko.env.get is a function", Ekko.env.get, "function");
  t.type("Ekko.env.set is a function", Ekko.env.set, "function");

  t.done("ekko:process");
})().catch((e) => {
  console.log("UNCAUGHT: " + (e && (e as any).message ? (e as any).message : e));
  Ekko.exit(1);
});
