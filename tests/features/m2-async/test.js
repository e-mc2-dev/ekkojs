// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

(async()=>{const c=[];const t0=performance.now();await Ekko.sleep(50);const e=performance.now()-t0;c.push(["sleep(50)",e>=40&&e<300,e.toFixed(1)+"ms"]);const t1=performance.now();await Promise.all([Ekko.sleep(30),Ekko.sleep(30),Ekko.sleep(30)]);const co=performance.now()-t1;c.push(["3x concurrent sleep",co<200,co.toFixed(1)+"ms"]);let tf=false;setTimeout(()=>{tf=true},10);await Ekko.sleep(50);c.push(["setTimeout fires",tf]);let p=0,f=0;for(const[n,ok,d]of c){if(ok){p++;console.log("  PASS:",n,d||"")}else{f++;console.log("  FAIL:",n,d||"")}}console.log(`\n${p}/${p+f} passed`+(f>0?` (${f} FAILED)`:" — ALL PASS"))})();
