// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { createServer, fetch } from "ekko:web";

const c: [string, boolean][] = [];

const server = createServer({ port: 19876 });

let putReceived = false;
let putBody = "";
let getReceived = false;

server.get("/test", (req: any, res: any) => {
  getReceived = true;
  res.json({ ok: true, method: "GET" });
});

server.put("/test", (req: any, res: any) => {
  putReceived = true;
  putBody = req.body || "";
  res.json({ ok: true, method: "PUT", bodyLen: putBody.length });
});

server.start();

await Ekko.sleep(500);

const getResp = await fetch("http://localhost:19876/test");
const getJson = await getResp.json();
c.push(["GET works", getJson.ok === true]);
c.push(["GET method", getJson.method === "GET"]);
c.push(["GET received", getReceived === true]);

const putResp = await fetch("http://localhost:19876/test", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ hello: "world" }),
});
const putJson = await putResp.json();
c.push(["PUT works", putJson.ok === true]);
c.push(["PUT method", putJson.method === "PUT"]);
c.push(["PUT body received", putJson.bodyLen > 0]);
c.push(["PUT received", putReceived === true]);

const binResp = await fetch("http://localhost:19876/test", {
  method: "PUT",
  headers: { "Content-Type": "application/octet-stream" },
  body: "EKKO-test-data",
});
const binJson = await binResp.json();
c.push(["binary PUT works", binJson.ok === true]);
c.push(["binary PUT method", binJson.method === "PUT"]);
c.push(["binary PUT body received", binJson.bodyLen > 0]);

server.stop();

let p=0,f=0;for(const[n,ok]of c){if(ok){p++;console.log("  PASS:",n)}else{f++;console.log("  FAIL:",n)}}console.log(`\n${p}/${p+f} passed`+(f>0?` (${f} FAILED)`:" — ALL PASS"));
