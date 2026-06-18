// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

(async()=>{const c=[];const ch=Ekko.Channel({capacity:4});ch.trySend(42);c.push(["trySend+tryRecv",ch.tryRecv()===42]);ch.trySend({a:1,b:"hello"});const o=ch.tryRecv();c.push(["object msg",o.a===1&&o.b==="hello"]);const ch2=Ekko.Channel({capacity:1});c.push(["trySend ok",ch2.trySend("x")===true]);c.push(["trySend full",ch2.trySend("y")===false]);ch2.tryRecv();ch2.close();c.push(["trySend closed",ch2.trySend("z")===false]);const ch3=Ekko.Channel({capacity:4});await ch3.send("async");const m=await ch3.recv();c.push(["async send/recv",m==="async"]);const ch4=Ekko.Channel({capacity:4});ch4.trySend(99);const ch4b=Ekko.Channel.fromId(ch4.id);c.push(["fromId",ch4b.tryRecv()===99]);const ch5=Ekko.Channel({capacity:4});ch5.trySend(10);ch5.trySend(20);ch5.close();const items=[];for await(const v of ch5)items.push(v);c.push(["for-await",items.length===2&&items[0]===10]);let p=0,f=0;for(const[n,ok]of c){if(ok){p++;console.log("  PASS:",n)}else{f++;console.log("  FAIL:",n)}}console.log(`\n${p}/${p+f} passed`+(f>0?` (${f} FAILED)`:" — ALL PASS"))})();
