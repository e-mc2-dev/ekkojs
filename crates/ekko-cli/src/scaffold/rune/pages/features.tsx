// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { useRouter, Link } from "ekko:rune/router";
import { appData } from "../content/app.data";

function slugFromPath(p?: string): string {
  if (!p || p === "/features" || p === "/features/") return appData.nav[0].slug;
  return p.replace(/^\/features\//, "").replace(/\/+$/, "");
}

export default function Features({ slug: ssrSlug }: { slug?: string } = {}) {
  const router = useRouter();
  const path = router.path;
  const onRealPath = path && path !== "/";
  const slug = onRealPath ? slugFromPath(path) : (ssrSlug ?? appData.nav[0].slug);
  const entry = appData.entries[slug] ?? appData.entries[appData.nav[0].slug];

  return (
    <section className="features">
      <div className="container features-grid">
        <nav className="features-nav" aria-label="Features">
          {appData.nav.map((item) => (
            <Link
              key={item.slug}
              href={"/features/" + item.slug}
              className={item.slug === slug ? "active" : ""}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <article className="features-panel">
          <h2>{entry.title}</h2>
          <p className="body">{entry.body}</p>
          <p style={{ marginTop: "24px" }}>
            <Link href="/" className="btn btn-ghost">Back home</Link>
          </p>
        </article>
      </div>
    </section>
  );
}
