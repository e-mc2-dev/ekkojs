// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { useAtom, useAtomValue } from "ekko:rune/mimir";
import { serverInfoAtom, counterAtom } from "../atoms/app";

export function ssr() {
  return {
    title: "Rune App, built with EkkoJS",
    __atoms: {
      "app:server": { renderedAt: new Date().toISOString(), runtime: "EkkoJS" },
    },
  };
}

export default function Home() {
  const server = useAtomValue(serverInfoAtom);   
  const [count, setCount] = useAtom(counterAtom); 

  return (
    <section className="hero">
      <div className="container hero-inner">
        <img className="mark" src="/assets/ekko-icon-rounded.svg" alt="EkkoJS" />
        <h1>
          Welcome to <span className="brand-title">Rune</span>
        </h1>
        <p className="tagline">
          A full-stack app in EkkoJS: server-rendered on first paint, then a fast client app, with state that
          crosses the server and the browser cleanly.
        </p>

        <div className="card" style={{ textAlign: "left", marginTop: "12px" }}>
          <h3>Seeded from the server</h3>
          <p className="muted">
            The server stamped this time into a Mimir atom and embedded it in the page. Press F5: the value is
            identical, with no flash.
          </p>
          <p className="kpi">{server.runtime}</p>
          <p className="mono">rendered at {server.renderedAt || "(client only)"}</p>

          <div className="counter-row">
            <button type="button" className="btn btn-ghost" onClick={() => setCount((c) => c - 1)}>-</button>
            <span className="counter-val">{count}</span>
            <button type="button" className="btn btn-primary" onClick={() => setCount((c) => c + 1)}>+</button>
          </div>
          <p className="hint">This counter persists. Click a few times, then press F5.</p>
        </div>
      </div>
    </section>
  );
}
