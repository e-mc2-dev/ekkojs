// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { asserter } from "../_harness";

const t = asserter();
const env = (Ekko as any).env;

t.group("ekko env — all ops denied without --allow=env (deny-by-default)");
t.denied("env.get denied", () => env.get("PATH"));
t.denied("env.get denied (secret-ish key)", () => env.get("AWS_SECRET_ACCESS_KEY"));
t.denied("env.set denied", () => env.set("EKKO_W45", "x"));
t.denied("env.has denied", () => env.has("PATH"));
t.denied("env.delete denied", () => env.delete("PATH"));
t.denied("env.entries denied (full-env exfiltration)", () => env.entries());
t.check("reached end → env is fully gated by default (no side effect leaked)", true);

t.done("env permissions (W4.5)");
