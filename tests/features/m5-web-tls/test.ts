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
import { exists } from "ekko:fs";
import { exec } from "ekko:process";

const c: [string, boolean][] = [];

const tmpDir = Ekko.env.get("TMPDIR") || Ekko.env.get("TEMP") || "/tmp";
const certPath = tmpDir + "/ekko-test-cert.pem";
const keyPath = tmpDir + "/ekko-test-key.pem";
const certReady = exists(certPath) && exists(keyPath);

const httpServer = createServer({ port: 19880 });
httpServer.get("/ping", (req: any, res: any) => res.json({ ok: true }));
httpServer.start();
await Ekko.sleep(1000);
const r1 = await fetch("http://localhost:19880/ping");
c.push(["HTTP backward compat", (await r1.json()).ok === true]);
httpServer.stop();
await Ekko.sleep(500);

if (certReady) {
  
  const httpsServer = createServer({
    port: 19881,
    tls: { cert: certPath, key: keyPath },
  });
  httpsServer.get("/secure", (req: any, res: any) => res.json({ secure: true }));
  httpsServer.start();
  await Ekko.sleep(1000);

  try {
    const curlResult = await exec("curl", ["-sSk", "https://localhost:19881/secure"]);
    const j = JSON.parse(curlResult.stdout || "{}");
    c.push(["HTTPS PEM responds", j.secure === true]);
  } catch (e) {
    c.push(["HTTPS PEM responds", false]);
  }
  httpsServer.stop();
  await Ekko.sleep(500);

  const h2Server = createServer({
    port: 19882,
    tls: { cert: certPath, key: keyPath },
    http2: true,
  });
  h2Server.get("/h2", (req: any, res: any) => res.json({ h2: true }));
  h2Server.start();
  await Ekko.sleep(1000);

  try {
    const curlH2 = await exec("curl", ["-sSk", "--http2", "https://localhost:19882/h2"]);
    c.push(["HTTP/2 responds", JSON.parse(curlH2.stdout || "{}").h2 === true]);
  } catch (e) {
    c.push(["HTTP/2 responds", false]);
  }

  try {
    const curlVer = await exec("curl", ["-sSk", "--http2", "-w", "%{http_version}", "-o", "/dev/null", "https://localhost:19882/h2"]);
    const ver = (curlVer.stdout || "").trim();
    c.push(["HTTP/2 negotiated", ver === "2" || ver === "2.0"]);
  } catch (e) {
    c.push(["HTTP/2 negotiated", false]);
  }
  h2Server.stop();
  await Ekko.sleep(500);

  const wssServer = createServer({
    port: 19883,
    tls: { cert: certPath, key: keyPath },
  });
  wssServer.get("/health", (req: any, res: any) => res.json({ wss: true }));
  wssServer.start();
  await Ekko.sleep(1000);
  try {
    const wssH = await exec("curl", ["-sSk", "https://localhost:19883/health"]);
    c.push(["WSS server HTTPS health", JSON.parse(wssH.stdout || "{}").wss === true]);
  } catch (e) {
    c.push(["WSS server HTTPS health", false]);
  }
  wssServer.stop();
} else {
  console.log("  SKIP: certs not found at " + certPath + " — run openssl to generate");
  console.log("  openssl req -x509 -newkey rsa:2048 -keyout " + keyPath + " -out " + certPath + " -days 1 -nodes -subj '/CN=localhost'");
}

let p=0,f=0;for(const[n,ok]of c){if(ok){p++;console.log("  PASS:",n)}else{f++;console.log("  FAIL:",n)}}console.log(`\n${p}/${p+f} passed`+(f>0?` (${f} FAILED)`:" — ALL PASS"));
