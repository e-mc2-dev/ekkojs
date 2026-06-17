// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

(async()=>{const c=[];const ch1=Ekko.Channel({capacity:4});const ch2=Ekko.Channel({capacity:4});ch2.trySend(42);const r=await Ekko.select([ch1,ch2]);c.push(["select ch2",r.channel===1&&r.value===42]);ch1.trySend("hello");const r2=await Ekko.select([ch1,ch2]);c.push(["select ch1",r2.channel===0&&r2.value==="hello"]);let p=0,f=0;for(const[n,ok]of c){if(ok){p++;console.log("  PASS:",n)}else{f++;console.log("  FAIL:",n)}}console.log(`\n${p}/${p+f} passed`+(f>0?` (${f} FAILED)`:" — ALL PASS"))})();
