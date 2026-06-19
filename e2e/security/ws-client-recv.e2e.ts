// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createServer, WebSocket } from "ekko:web";
import { asserter } from "../_harness";

const t = asserter();
const PORT = 38336;
const app: any = createServer({ host: "127.0.0.1", port: PORT });
app.ws("/echo", (sock: any) => { sock.on("message", (d: string) => sock.send("echo:" + d)); });
app.start();
const url = `ws://127.0.0.1:${PORT}/echo`;

function once(send: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const ws: any = new WebSocket(url);
    ws.onopen = () => ws.send(send);
    ws.onmessage = (ev: any) => { resolve(ev.data); ws.close(); };
    ws.onerror = (e: any) => reject(e);
    setTimeout(() => reject(new Error("ws recv timeout")), 5000);
  });
}

t.group("client WebSocket receives frames (W3.5)");
let got = "", threw = false;
try { got = await once("hello"); } catch (e: any) { threw = true; got = String(e && e.message); }
t.check("client did NOT time out / error waiting for a frame", !threw);
t.eq("client received the server's echo frame", got, "echo:hello");

let got2 = "", threw2 = false;
try { got2 = await once("world"); } catch (e: any) { threw2 = true; got2 = String(e && e.message); }
t.check("second client connection also receives", !threw2);
t.eq("second echo correct", got2, "echo:world");

app.stop();
t.check("reached end — in-process ws round-trip closed, no hang", true);
t.done("web client WebSocket recv (W3.5)");
