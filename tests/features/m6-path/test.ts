// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { join, resolve, dirname, basename, extname, isAbsolute, normalize, sep } from "ekko:fs/path";
const c: [string, boolean][] = [];
c.push(["join", join("src","utils","index.ts") === "src"+sep+"utils"+sep+"index.ts"]);
c.push(["dirname", dirname("/foo/bar/baz.js")==="/foo/bar" || dirname("C:\\foo\\bar\\baz.js")==="C:\\foo\\bar"]);
c.push(["basename", basename("/foo/bar/baz.js")==="baz.js" || basename("C:\\foo\\bar\\baz.js")==="baz.js"]);
c.push(["basename -ext", basename("/foo/baz.js",".js")==="baz" || basename("C:\\foo\\baz.js",".js")==="baz"]);
c.push(["extname", extname("index.html")===".html"]);
c.push(["isAbsolute relative", !isAbsolute("foo/bar")]);
c.push(["normalize", normalize("/foo/bar/../baz")==="/foo/baz" || normalize("\\foo\\bar\\..\\baz")==="\\foo\\baz"]);
c.push(["sep", sep==="/"||sep==="\\"]);
c.push(["resolve absolute", isAbsolute(resolve("test.txt"))]);
let p=0,f=0;for(const[n,ok]of c){if(ok){p++;console.log("  PASS:",n)}else{f++;console.log("  FAIL:",n)}}console.log(`\n${p}/${p+f} passed`+(f>0?` (${f} FAILED)`:" — ALL PASS"));
