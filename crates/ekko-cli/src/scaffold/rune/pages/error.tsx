// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { Link } from "ekko:rune/router";

export default function ErrorPage() {
  return (
    <section className="hero">
      <div className="container hero-inner">
        <h1><span className="brand-title">Something went wrong</span></h1>
        <p className="tagline">An error occurred while rendering this page.</p>
        <div className="hero-cta">
          <Link href="/" className="btn btn-primary">Back home</Link>
        </div>
      </div>
    </section>
  );
}
