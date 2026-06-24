// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import "../styles/global.scss"; 
import { useEffect } from "@ekko/react";
import { mimir } from "ekko:rune/mimir";
import { Link } from "ekko:rune/router";

function SessionBridge() {
  useEffect(() => {
    mimir.session("domain");
  }, []);
  return null;
}

export default function RootLayout({ children }: { children?: any }) {
  return (
    <div className="app-shell">
      <SessionBridge />
      <header className="site-header">
        <div className="container bar">
          <Link href="/" className="brand">
            <img src="/assets/ekko-icon-rounded.svg" alt="EkkoJS" />
            <span>Rune App</span>
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="container bar">
          <span>Built with EkkoJS Rune</span>
          <a href="https://ekkojs.com" target="_blank" rel="noreferrer">ekkojs.com</a>
        </div>
      </footer>
    </div>
  );
}
