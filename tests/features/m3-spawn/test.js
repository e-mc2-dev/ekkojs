// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

(async()=>{const c=[];const r1=await Ekko.spawn((a,b)=>a*b,[6,7]);c.push(["spawn 6*7=42",r1===42]);const r2=await Ekko.spawn((a,b)=>a+b,{args:[10,20]});c.push(["spawn {args}",r2===30]);const r3=await Ekko.parallel([()=>1,()=>2,()=>3]);c.push(["parallel",JSON.stringify(r3)==="[1,2,3]"]);const r4=await Ekko.spawn(()=>typeof Ekko.version+"|"+typeof performance.now+"|"+typeof setTimeout);c.push(["worker globals",r4==="string|function|function"]);try{await Ekko.spawn(()=>{throw new Error("boom")});c.push(["SpawnError",false])}catch(e){c.push(["SpawnError.name",e.name==="SpawnError"]);c.push(["has cause",typeof e.cause==="object"]);c.push(["stitched stack",e.stack.includes("--- spawned from ---")])}try{await Ekko.spawn(()=>{while(true){}},{timeout:100});c.push(["timeout",false])}catch(e){c.push(["timeout error",String(e).includes("timed out")])}const r5=await Ekko.spawn(async()=>{await Ekko.sleep(5);return"slept"});c.push(["async worker",r5==="slept"]);let p=0,f=0;for(const[n,ok]of c){if(ok){p++;console.log("  PASS:",n)}else{f++;console.log("  FAIL:",n)}}console.log(`\n${p}/${p+f} passed`+(f>0?` (${f} FAILED)`:" — ALL PASS"))})();
