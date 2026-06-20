// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import "@ekko/react";              
import "@ekko/react-dom/server";   
import { createApp, scanRoutes, readManifest } from "ekko:rune";
import { createSEO } from "ekko:rune/seo";

import RootLayout from "./pages/layout";
import NotFound from "./pages/not-found";
import ErrorPage from "./pages/error";
import * as Home from "./pages/index";

const SITE_NAME = "Rune App";
const SITE_URL = "http://localhost:3000";

const seo = createSEO({
  site: { name: SITE_NAME, url: SITE_URL, language: "en_US" },
  meta: { description: "A full-stack application built with EkkoJS Rune." },
  favicon: { svg: "/assets/ekko-icon-rounded.svg" },
});

const head =
  `<meta name="viewport" content="width=device-width, initial-scale=1">` +
  `<script>document.documentElement.classList.add('dark')</script>` +
  seo.headTags();

const app = createApp({
  port: 3000,
  manifest: readManifest(),
  layouts: { "": { layouts: [{ render: RootLayout }] } },
  error: ErrorPage, notFound: NotFound, seo, head,
  ssr: "eager", static: "./static", staticPrefix: "/assets",
});

const modules: any = { "/": Home };
for (const r of scanRoutes("pages")) {
  const mod = modules[r.pattern];
  if (mod) app.page(r.pattern, mod, { page: r.pageKey, head });
}

app.start();
console.log(`[${SITE_NAME}] up on ${SITE_URL}`);
