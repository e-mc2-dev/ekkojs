// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

const checks = [];
checks.push(["Ekko.version", typeof Ekko.version === "string" && Ekko.version.includes(".")]);
checks.push(["Ekko.platform", ["win32","darwin","linux"].includes(Ekko.platform)]);
checks.push(["Ekko.arch", ["x64","arm64"].includes(Ekko.arch)]);
checks.push(["Ekko.pid > 0", typeof Ekko.pid === "number" && Ekko.pid > 0]);
checks.push(["Ekko.args", Array.isArray(Ekko.args)]);
checks.push(["Ekko.cwd()", typeof Ekko.cwd() === "string" && Ekko.cwd().length > 0]);
checks.push(["Ekko.env roundtrip", (() => { Ekko.env.set("EKKO_T","ok"); const r = Ekko.env.get("EKKO_T")==="ok" && Ekko.env.has("EKKO_T"); Ekko.env.delete("EKKO_T"); return r && !Ekko.env.has("EKKO_T"); })()]);
checks.push(["Ekko.env.entries()", Array.isArray(Ekko.env.entries()) && Ekko.env.entries().length > 0]);
checks.push(["Ekko.exit", typeof Ekko.exit === "function"]);
checks.push(["Ekko.sleep", typeof Ekko.sleep === "function"]);
checks.push(["Ekko.spawn", typeof Ekko.spawn === "function"]);
checks.push(["Ekko.parallel", typeof Ekko.parallel === "function"]);
checks.push(["Ekko.select", typeof Ekko.select === "function"]);
checks.push(["Ekko.Channel", typeof Ekko.Channel === "function"]);
let p=0,f=0; for(const[n,ok]of checks){if(ok){p++;console.log("  PASS:",n)}else{f++;console.log("  FAIL:",n)}} console.log(`\n${p}/${p+f} passed`+(f>0?` (${f} FAILED)`:" — ALL PASS"));
