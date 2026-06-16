// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { exec } from "ekko:process";
import { tempSubdir, writeText, remove } from "ekko:fs";
import { asserter } from "../_harness.ts";

const t = asserter();
const EKKO = Ekko.args[0];

(async () => {
  const sb = tempSubdir("proc-sec");

  t.group("env-injection: dangerous vars are stripped from opts.env");
  
  const reader = sb + "/readenv.ts";
  const keys = ["LD_PRELOAD", "DYLD_INSERT_LIBRARIES", "LD_LIBRARY_PATH", "DYLD_LIBRARY_PATH", "LD_AUDIT", "E2E_SAFE"];
  writeText(reader,
    "const k=" + JSON.stringify(keys) + ";" +
    "console.log(k.map(n => n + '=[' + (Ekko.env.get(n)||'') + ']').join(' '));" +
    "Ekko.exit(0);");
  const injected: Record<string, string> = {
    LD_PRELOAD: "/evil.so",
    DYLD_INSERT_LIBRARIES: "/evil.dylib",
    LD_LIBRARY_PATH: "/evil/lib",
    DYLD_LIBRARY_PATH: "/evil/lib",
    LD_AUDIT: "/evil/audit.so",
    E2E_SAFE: "safe-value",
  };
  const r = await exec(EKKO, ["run", "--allow=env", reader], { env: injected });
  t.eq("readenv child exited 0", r.exitCode, 0);
  const out = r.stdout;
  t.ok("LD_PRELOAD stripped", /LD_PRELOAD=\[\]/.test(out));
  t.ok("DYLD_INSERT_LIBRARIES stripped", /DYLD_INSERT_LIBRARIES=\[\]/.test(out));
  t.ok("LD_LIBRARY_PATH stripped", /LD_LIBRARY_PATH=\[\]/.test(out));
  t.ok("DYLD_LIBRARY_PATH stripped", /DYLD_LIBRARY_PATH=\[\]/.test(out));
  t.ok("LD_AUDIT stripped", /LD_AUDIT=\[\]/.test(out));
  t.ok("safe var IS passed through (control)", out.includes("E2E_SAFE=[safe-value]"));

  
  t.group("no shell: commands run directly, metacharacters are not interpreted");
  
  await t.rejects("'; ' is not a command separator", () => exec("echo hi; echo INJECTED", []), /error|process|found|No such|cannot/i);
  await t.rejects("'&&' is not interpreted", () => exec("echo hi && whoami", []), /error|process|found|No such|cannot/i);
  await t.rejects("'|' pipe is not interpreted", () => exec("echo hi | rm -rf x", []), /error|process|found|No such|cannot/i);
  await t.rejects("backtick/$() is not interpreted in cmd", () => exec("echo $(whoami)", []), /error|process|found|No such|cannot/i);

  const printer = sb + "/printarg.ts";
  writeText(printer, "console.log(Ekko.args[Ekko.args.length - 1]); Ekko.exit(0);");
  const meta = "a;b|c&&d$(whoami)`id`";
  const rp = await exec(EKKO, ["run", printer, meta]);
  t.eq("metacharacter arg passed literally (no substitution)", rp.stdout.trim(), meta);
  t.ok("no command substitution leaked", !/uid=|root|Administrator/.test(rp.stdout));

  remove(sb, true);
  t.done("ekko:process security/hardening");
})().catch((e) => { console.log("UNCAUGHT: " + String((e as any)?.message ?? e)); Ekko.exit(1); });
