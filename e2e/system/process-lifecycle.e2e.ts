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
const EKKO = Ekko.args[0];
const ev = (code: string) => [EKKO, ["eval", code]] as [string, string[]];
async function waitUntil(pred: () => boolean, maxMs = 6000): Promise<boolean> {
  const end = Date.now() + maxMs;
  while (Date.now() < end) { if (pred()) return true; await sleep(25); }
  return pred();
}

(async () => {
  
  t.group("exec — large output does not deadlock or truncate");
  
  const big = await exec(...ev("const s='x'.repeat(64); for(let i=0;i<32768;i++) console.log(s); Ekko.exit(0)"));
  t.ok("large stdout result defined (no deadlock)", big !== undefined);
  t.eq("large stdout exit 0", big.exitCode, 0);
  t.gte("large stdout ~2MB captured", big.stdout.length, 32768 * 65);
  t.eq("large stdout line count", big.stdout.split("\n").filter(Boolean).length, 32768);

  t.group("exec — interleaved stdout+stderr does not deadlock");
  const il = await exec(...ev("for(let i=0;i<8000;i++){console.log('O'.repeat(50));console.error('E'.repeat(50));} Ekko.exit(0)"));
  t.ok("interleaved result defined", il !== undefined);
  t.gte("interleaved stdout captured", il.stdout.length, 8000 * 50);
  t.gte("interleaved stderr captured", il.stderr.length, 8000 * 50);
  t.eq("interleaved exit 0", il.exitCode, 0);

  t.group("exec — concurrency (10 parallel execs resolve correctly)");
  const cc = await Promise.all(Array.from({ length: 10 }, (_, i) =>
    exec(...ev("console.log(" + i + "); Ekko.exit(" + i + ")"))));
  t.ok("no concurrent exec returned undefined", cc.every((r) => r !== undefined));
  t.ok("each concurrent exec has its own exit code", cc.every((r, i) => r.exitCode === i));
  t.ok("each concurrent exec has its own stdout", cc.every((r, i) => r.stdout.includes(String(i))));

  t.group("exec — UTF-8 multibyte fidelity through the FFI JSON boundary");
  const uni = await exec(...ev("console.log('héllo-üñ™-😀-Ω'); Ekko.exit(0)"));
  t.ok("unicode stdout round-trips intact", uni.stdout.includes("héllo-üñ™-😀-Ω"));
  t.eq("unicode exec exit 0", uni.exitCode, 0);

  t.group("exec — args with whitespace / escape / unicode survive the FFI JSON boundary");

  const sb = tempSubdir("proc-life");
  const printer = sb + "/printarg.ts";
  
  writeText(printer, "console.log(JSON.stringify(Ekko.args[Ekko.args.length - 1])); Ekko.exit(0);");
  const argRT = async (a: string) => {
    const r = await exec(EKKO, ["run", printer, a]);
    return r === undefined ? undefined : JSON.parse(r.stdout.trim());
  };
  t.eq("space arg literal", await argRT("a b   c"), "a b   c");
  t.eq("tab arg literal (escape decoded)", await argRT("a\tb"), "a\tb");
  t.eq("newline arg literal (escape decoded)", await argRT("x\ny"), "x\ny");
  t.eq("backslash arg literal", await argRT("back\\slash"), "back\\slash");
  t.eq("quote arg literal", await argRT('q"q'), 'q"q');
  t.eq("unicode arg literal", await argRT("üñ™-😀-Ω"), "üñ™-😀-Ω");

  const eprint = sb + "/printenv.ts";
  writeText(eprint, "console.log(JSON.stringify(Ekko.env.get('E2E_LIFE'))); Ekko.exit(0);");
  const envRT = async (v: string) => {
    const r = await exec(EKKO, ["run", "--allow=env", eprint], { env: { E2E_LIFE: v } });
    return r === undefined ? undefined : JSON.parse(r.stdout.trim());
  };
  t.eq("env value with tab+newline survives", await envRT("tab\there\nnl"), "tab\there\nnl");
  t.eq("env value unicode survives", await envRT("üñ™-😀"), "üñ™-😀");

  t.group("spawn — opts.cwd is honored");
  const cwdDir = tempSubdir("proc-life-cwd");
  const cwdBase = cwdDir.split(/[\\/]/).filter(Boolean).pop()!;
  let cwdOut = ""; let cwdExit: number | null = null;
  const cwdChild = spawn(EKKO, ["eval", "console.log(Ekko.cwd()); Ekko.exit(0)"], { cwd: cwdDir } as any);
  (cwdChild as any).onStdout((d: string) => cwdOut += d);
  (cwdChild as any).onExit((c: number) => cwdExit = c);
  t.ok("spawn-cwd child exited", await waitUntil(() => cwdExit !== null));
  t.ok("spawn child cwd is opts.cwd", cwdOut.trim().endsWith(cwdBase));
  t.eq("spawn-cwd exit 0", cwdExit, 0);
  remove(cwdDir, true);

  t.group("spawn — multiple stdin writes stream to the child");
  const sorter = spawn("sort", []);
  let sOut = ""; let sExit: number | null = null;
  (sorter as any).onStdout((d: string) => sOut += d);
  (sorter as any).onExit((c: number) => sExit = c);
  (sorter as any).write("banana\n");
  (sorter as any).write("apple\n");
  (sorter as any).write("cherry\n");
  (sorter as any).closeStdin();
  t.ok("multi-write sort exited", await waitUntil(() => sExit !== null));
  const sortedLines = sOut.split(/\r?\n/).filter(Boolean);
  t.eq("multi-write sort line count", sortedLines.length, 3);
  t.eq("multi-write sort ordering", sortedLines.join(","), "apple,banana,cherry");
  t.eq("multi-write sort exit 0", sExit, 0);

  t.group("spawn — Uint8Array stdin write");
  const u8c = spawn("sort", []);
  let uOut = ""; let uExit: number | null = null;
  (u8c as any).onStdout((d: string) => uOut += d);
  (u8c as any).onExit((c: number) => uExit = c);
  t.notThrows("Uint8Array write accepted", () => (u8c as any).write(new TextEncoder().encode("zed\nant\nmid\n")));
  (u8c as any).closeStdin();
  t.ok("Uint8Array sort exited", await waitUntil(() => uExit !== null));
  t.eq("Uint8Array stdin sorted", uOut.split(/\r?\n/).filter(Boolean).join(","), "ant,mid,zed");

  t.group("spawn — late onExit fires (regression: latched exit code)");

  const fast = spawn(...ev("Ekko.exit(0)"));
  await sleep(1500);
  let lateCode: number | null = null;
  (fast as any).onExit((c: number) => lateCode = c);
  t.ok("late-registered onExit still fires", await waitUntil(() => lateCode !== null, 3000));
  t.eq("late onExit sees correct exit code", lateCode, 0);
  
  const fast5 = spawn(...ev("Ekko.exit(5)"));
  await sleep(1200);
  let late5: number | null = null;
  (fast5 as any).onExit((c: number) => late5 = c);
  t.ok("late onExit fires for non-zero exit", await waitUntil(() => late5 !== null, 3000));
  t.eq("late onExit sees non-zero code", late5, 5);

  t.group("spawn — lifecycle idempotency (no crash on repeated ops)");
  const idem = spawn("sort", []);
  let idemExit: number | null = null;
  (idem as any).onExit((c: number) => idemExit = c);
  (idem as any).write("a\n");
  t.notThrows("closeStdin once", () => (idem as any).closeStdin());
  t.notThrows("closeStdin twice is idempotent", () => (idem as any).closeStdin());
  t.ok("idempotency child exited", await waitUntil(() => idemExit !== null));
  
  t.throws("write after exit throws (catchable)", () => (idem as any).write("late\n"), /error|closed|exit|pipe|i\/o/i);
  t.notThrows("kill after exit is a no-op", () => (idem as any).kill());
  t.notThrows("kill twice is a no-op", () => (idem as any).kill());

  t.group("spawn — killing a long-lived child fires onExit");
  const longC = spawn(...ev("setTimeout(() => {}, 30000)"));
  let killExit: number | null = null;
  (longC as any).onExit((c: number) => killExit = c);
  await sleep(250);
  t.notThrows("kill() callable on live child", () => (longC as any).kill());
  t.ok("killed child onExit fires", await waitUntil(() => killExit !== null));

  t.group("spawn — missing command fails loudly (no silent dead handle)");
  t.throws("spawn nonexistent command throws", () => spawn("definitely_not_a_real_cmd_xyz_201", []), /error|found|No such|cannot|i\/o/i);

  t.group("exec — missing command rejects; bad cwd rejects");
  await t.rejects("exec nonexistent rejects", () => exec("definitely_not_a_real_cmd_xyz_201", []), /error|found|No such|cannot|i\/o/i);

  remove(sb, true);
  t.done("ekko:process lifecycle/stress");
})().catch((e) => { console.log("UNCAUGHT: " + String((e as any)?.message ?? e)); Ekko.exit(1); });
