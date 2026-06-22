// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { useState } from "@ekko/react";
import { useAtom, useAtomValue } from "ekko:rune/mimir";
import { serverInfoAtom, counterAtom } from "../atoms/app";
import { Card, Button, TextBox, Checkbox, Alert } from "@ekko/asgard";

export function ssr() {
  return {
    title: "Rune App, built with EkkoJS + Asgard",
    __atoms: {
      "app:server": { renderedAt: new Date().toISOString(), runtime: "EkkoJS" },
    },
  };
}

export default function Home() {
  const server = useAtomValue(serverInfoAtom);     
  const [count, setCount] = useAtom(counterAtom);  
  const [name, setName] = useState("");            
  const [agree, setAgree] = useState(false);

  return (
    <section className="container" style={{ padding: "32px 16px", maxWidth: 680, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Welcome to Rune + Asgard</h1>
      <p style={{ opacity: 0.75 }}>
        A minimal full-stack app: server-rendered on first paint, themed with <code>@ekko/asgard</code>, with
        state in Mimir that survives a reload. Edit <code>pages/index.tsx</code> to make it yours.
      </p>

      <div style={{ marginTop: 18 }}>
        <Card variant="outlined">
          <h3 style={{ marginTop: 0 }}>Asgard inputs are controlled</h3>
          <p style={{ opacity: 0.7, marginTop: 0 }}>
            Pass <code>value</code> and an <code>onChange</code> that receives the new value directly, not a
            DOM event.
          </p>
          <TextBox value={name} onChange={setName} placeholder="Your name" />
          <div style={{ marginTop: 12 }}>
            <Checkbox checked={agree} onChange={setAgree} label="I like type-safe runtimes" />
          </div>
          {name ? (
            <div style={{ marginTop: 12 }}>
              <Alert severity="success">Hi, {name}{agree ? " 👋" : ""}!</Alert>
            </div>
          ) : null}
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card variant="filled" type="info">
          <h3 style={{ marginTop: 0 }}>A persisted counter</h3>
          <p style={{ opacity: 0.7, marginTop: 0 }}>
            Seeded on the server (<strong>{server.runtime}</strong>
            {server.renderedAt ? `, rendered ${server.renderedAt}` : ""}). The count is a Mimir atom with
            <code> persist: true</code>, so it survives a full reload: click, then press F5.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button variant="outlined" onClick={() => setCount((c) => c - 1)}>-</Button>
            <strong style={{ minWidth: 36, textAlign: "center", fontSize: "1.2rem" }}>{count}</strong>
            <Button onClick={() => setCount((c) => c + 1)}>+</Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
