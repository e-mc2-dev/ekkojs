// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



function colorOn(): boolean {
  try {
    
    if (Ekko.env.get("NO_COLOR")) return false;
    
    if (Ekko.env.get("EKKO_E2E_NOCOLOR")) return false;
  } catch {  }
  return true;
}

const C = colorOn();
const sgr = (code: string, s: string) => (C ? "\x1b[" + code + "m" + s + "\x1b[0m" : s);
const c = {
  green: (s: string) => sgr("32", s),
  red: (s: string) => sgr("1;31", s),
  dim: (s: string) => sgr("2", s),
  bold: (s: string) => sgr("1", s),
  cyan: (s: string) => sgr("1;36", s),
  yellow: (s: string) => sgr("33", s),
  gray: (s: string) => sgr("90", s),
};

export interface Asserter {
  check(name: string, cond: boolean): void;
  ok(name: string, v: unknown): void;
  eq<T>(name: string, actual: T, expected: T): void;
  ne<T>(name: string, actual: T, expected: T): void;
  gt(name: string, actual: number, n: number): void;
  gte(name: string, actual: number, n: number): void;
  lt(name: string, actual: number, n: number): void;
  type(name: string, actual: unknown, ty: string): void;
  deep(name: string, actual: unknown, expected: unknown): void;
  throws(name: string, fn: () => void, re: RegExp): void;
  notThrows(name: string, fn: () => void): void;
  
  denied(name: string, fn: () => void): void;
  rejects(name: string, p: () => Promise<unknown>, re: RegExp): Promise<void>;
  group(name: string): void;
  done(label: string): void;
  readonly passed: number;
  readonly failed: number;
}

export function asserter(): Asserter {
  let pass = 0, fail = 0;
  let gName = "";        
  let gPass = 0, gFail = 0;
  let started = false;

  const j = (v: unknown) => { try { return JSON.stringify(v); } catch { return String(v); } };

  const flushGroup = () => {
    if (!gName) return;
    const okAll = gFail === 0;
    const mark = okAll ? c.green("✓") : c.red("✗");
    const tally = okAll
      ? c.dim(gPass + "/" + gPass)
      : c.red(gPass + "/" + (gPass + gFail) + "  (" + gFail + " failed)");
    console.log("   " + mark + " " + c.dim("└─ ") + tally);
  };

  const pp = (name: string) => {
    pass++; gPass++;
    console.log("   " + c.green("✓") + " " + c.dim(name));
  };
  const ff = (name: string) => {
    fail++; gFail++;
    console.log("   " + c.red("✗ " + name));
  };

  const a: Asserter = {
    get passed() { return pass; },
    get failed() { return fail; },
    group(name) {
      if (started) { flushGroup(); console.log(""); }
      started = true;
      gName = name; gPass = 0; gFail = 0;
      console.log(c.cyan("▌ ") + c.bold(name));
    },
    check(name, cond) { cond ? pp(name) : ff(name); },
    ok(name, v) { v ? pp(name) : ff(name + c.gray("  (falsy: " + j(v) + ")")); },
    eq(name, actual, expected) {
      actual === expected ? pp(name) : ff(name + c.gray("  (want " + j(expected) + " got " + j(actual) + ")"));
    },
    ne(name, actual, expected) {
      actual !== expected ? pp(name) : ff(name + c.gray("  (should not equal " + j(expected) + ")"));
    },
    gt(name, actual, n) { actual > n ? pp(name) : ff(name + c.gray("  (" + actual + " !> " + n + ")")); },
    gte(name, actual, n) { actual >= n ? pp(name) : ff(name + c.gray("  (" + actual + " !>= " + n + ")")); },
    lt(name, actual, n) { actual < n ? pp(name) : ff(name + c.gray("  (" + actual + " !< " + n + ")")); },
    type(name, actual, ty) {
      typeof actual === ty ? pp(name) : ff(name + c.gray("  (typeof want " + ty + " got " + typeof actual + ")"));
    },
    deep(name, actual, expected) {
      j(actual) === j(expected) ? pp(name) : ff(name + c.gray("  (deep want " + j(expected) + " got " + j(actual) + ")"));
    },
    throws(name, fn, re) {
      let m = "__nothrow__";
      try { fn(); } catch (e) { m = String((e as Error)?.message ?? e); }
      re.test(m) ? pp(name) : ff(name + c.gray("  (want throw /" + re.source + "/ got: " + m + ")"));
    },
    notThrows(name, fn) {
      try { fn(); pp(name); } catch (e) { ff(name + c.gray("  (unexpected throw: " + String((e as Error)?.message ?? e) + ")")); }
    },
    denied(name, fn) {
      let m = "__nothrow__";
      try { fn(); } catch (e) { m = String((e as Error)?.message ?? e); }
      if (m === "__nothrow__") {
        ff(name + c.gray("  (EXPECTED permission denial, but the operation was ALLOWED — grant too broad? run scoped)"));
      } else if (/PermissionError|access denied/.test(m)) {
        pp(name);
      } else {
        ff(name + c.gray("  (EXPECTED a PermissionError, got a different error: " + m + ")"));
      }
    },
    async rejects(name, p, re) {
      let m = "__noreject__";
      try { await p(); } catch (e) { m = String((e as Error)?.message ?? e); }
      re.test(m) ? pp(name) : ff(name + c.gray("  (want reject /" + re.source + "/ got: " + m + ")"));
    },
    done(label) {
      flushGroup();
      const total = pass + fail;
      const allPass = fail === 0;
      const w = 44;
      const bar = (ch: string) => ch.repeat(w);
      const title = " " + label + (allPass ? "  —  ALL PASS " : "  —  " + fail + " FAILED ");
      const pad = Math.max(0, w - title.length);
      console.log("");
      console.log((allPass ? c.green : c.red)("╭" + bar("─") + "╮"));
      console.log((allPass ? c.green : c.red)("│") + c.bold(title) + " ".repeat(pad) + (allPass ? c.green : c.red)("│"));
      console.log((allPass ? c.green : c.red)("├" + bar("─") + "┤"));
      console.log((allPass ? c.green : c.red)("│") + "  " + c.green("✓ " + pass + " passed") + " ".repeat(Math.max(0, w - 2 - ("✓ " + pass + " passed").length)) + (allPass ? c.green : c.red)("│"));
      console.log((allPass ? c.green : c.red)("│") + "  " + (fail ? c.red("✗ " + fail + " failed") : c.dim("✗ 0 failed")) + " ".repeat(Math.max(0, w - 2 - ("✗ " + fail + " failed").length)) + (allPass ? c.green : c.red)("│"));
      console.log((allPass ? c.green : c.red)("│") + "  " + c.dim("Σ " + total + " assertions") + " ".repeat(Math.max(0, w - 2 - ("Σ " + total + " assertions").length)) + (allPass ? c.green : c.red)("│"));
      console.log((allPass ? c.green : c.red)("╰" + bar("─") + "╯"));
      
      console.log("ASSERTIONS " + pass + " " + fail);
      
      Ekko.exit(fail > 0 ? 1 : 0);
    },
  };
  return a;
}

export const sleep = (ms: number): Promise<void> => new Promise<void>((r) => setTimeout(r, ms));
