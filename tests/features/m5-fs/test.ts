// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { writeText, readText, exists, stat, remove, mkdir, readDir, write, read } from "ekko:fs";
const c: [string, boolean][] = [];
const d = (Ekko.platform === "win32" ? "C:\\temp" : "/tmp") + "/ekko_test_" + Date.now();
mkdir(d); c.push(["mkdir", exists(d)]);
writeText(d+"/hello.txt","hello EkkoJS"); c.push(["writeText+readText", readText(d+"/hello.txt")==="hello EkkoJS"]);
c.push(["exists true", exists(d+"/hello.txt")]); c.push(["exists false", !exists(d+"/nope.txt")]);
const s=stat(d+"/hello.txt"); c.push(["stat.isFile",s.isFile===true]); c.push(["stat.size>0",s.size>0]);
const data=new Uint8Array([1,2,3,4,5]); write(d+"/bin.dat",data); const rb=read(d+"/bin.dat"); c.push(["binary roundtrip",rb[0]===1&&rb[4]===5&&rb.length===5]);
c.push(["readDir",readDir(d).length>=2]);
remove(d+"/hello.txt"); remove(d+"/bin.dat"); remove(d); c.push(["cleanup",!exists(d)]);
let p=0,f=0;for(const[n,ok]of c){if(ok){p++;console.log("  PASS:",n)}else{f++;console.log("  FAIL:",n)}}console.log(`\n${p}/${p+f} passed`+(f>0?` (${f} FAILED)`:" — ALL PASS"));
