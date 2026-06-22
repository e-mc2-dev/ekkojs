// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

const c=[];const t1=performance.now();const t2=performance.now();c.push(["now() number",typeof t1==="number"]);c.push(["now() > 0",t1>0]);c.push(["monotonic",t2>=t1]);performance.mark("s");let s=0;for(let i=0;i<100000;i++)s+=i;performance.mark("e");const m=performance.measure("w","s","e");c.push(["measure duration>=0",m.duration>=0]);c.push(["getEntriesByName",performance.getEntriesByName("s").length>=1]);c.push(["getEntriesByType",performance.getEntriesByType("mark").length>=2]);let p=0,f=0;for(const[n,ok]of c){if(ok){p++;console.log("  PASS:",n)}else{f++;console.log("  FAIL:",n)}}console.log(`\n${p}/${p+f} passed`+(f>0?` (${f} FAILED)`:" — ALL PASS"));
