// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createSEO } from "ekko:rune/seo";
import { asserter } from "../_harness.ts";

const t = asserter();

const seo = createSEO({
  site: { url: "https://example.com/", name: "Example", language: "en_US" },
  meta: { author: "Acme" },
  og: { type: "website" },
  twitter: { card: "summary_large_image", site: "@ex" },
  favicon: { ico: "/f.ico", svg: "/f.svg", apple: "/apple.png" },
});

t.group("headTags — core meta");
{
  const h = seo.headTags({ title: "Home", description: "Welcome", keywords: ["a", "b"], canonical: "/home" });
  t.check("title tag", h.includes("<title>Home</title>"));
  t.check("description meta", h.includes('<meta name="description" content="Welcome">'));
  t.check("keywords array joined", h.includes('<meta name="keywords" content="a, b">'));
  t.check("author from default meta", h.includes('<meta name="author" content="Acme">'));
  t.check("default robots index,follow", h.includes('<meta name="robots" content="index, follow">'));
  t.check("canonical joins baseUrl (trailing slash stripped)", h.includes('<link rel="canonical" href="https://example.com/home">'));
}
{
  const h = seo.headTags({ title: "T", keywords: "x,y", robots: "noindex" });
  t.check("keywords string passthrough", h.includes('content="x,y"'));
  t.check("custom robots", h.includes('<meta name="robots" content="noindex">'));
}
{
  const h = seo.headTags({ title: "T", robots: false });
  t.check("robots:false suppresses robots meta", !h.includes('name="robots"'));
}

t.group("headTags — favicons");
{
  const h = seo.headTags({ title: "T" });
  t.check("ico favicon", h.includes('<link rel="icon" href="/f.ico" sizes="32x32">'));
  t.check("svg favicon", h.includes('<link rel="icon" href="/f.svg" type="image/svg+xml">'));
  t.check("apple touch icon", h.includes('<link rel="apple-touch-icon" href="/apple.png">'));
}

t.group("headTags — Open Graph");
{
  const h = seo.headTags({ title: "OG T", description: "OG D", canonical: "/p", og: { image: "/i.png", imageWidth: 1200, imageHeight: 630 } });
  t.check("og:type from default", h.includes('<meta property="og:type" content="website">'));
  t.check("og:title falls back to title", h.includes('<meta property="og:title" content="OG T">'));
  t.check("og:description falls back to description", h.includes('<meta property="og:description" content="OG D">'));
  t.check("og:image", h.includes('<meta property="og:image" content="/i.png">'));
  t.check("og:image:width", h.includes('<meta property="og:image:width" content="1200">'));
  t.check("og:image:height", h.includes('<meta property="og:image:height" content="630">'));
  t.check("og:url from canonical", h.includes('<meta property="og:url" content="https://example.com/p">'));
  t.check("og:site_name", h.includes('<meta property="og:site_name" content="Example">'));
  t.check("og:locale from language", h.includes('<meta property="og:locale" content="en_US">'));
}

t.group("headTags — Twitter");
{
  const h = seo.headTags({ title: "TW", description: "TWD", og: { image: "/og.png" } });
  t.check("twitter:card from default", h.includes('<meta name="twitter:card" content="summary_large_image">'));
  t.check("twitter:site from default", h.includes('<meta name="twitter:site" content="@ex">'));
  t.check("twitter:title falls back to title", h.includes('<meta name="twitter:title" content="TW">'));
  t.check("twitter:description falls back", h.includes('<meta name="twitter:description" content="TWD">'));
  t.check("twitter:image falls back to og.image", h.includes('<meta name="twitter:image" content="/og.png">'));
}

t.group("robotsTxt");
{
  const r = seo.robotsTxt();
  t.check("User-agent: *", r.includes("User-agent: *"));
  t.check("default Allow: /", r.includes("Allow: /"));
  t.check("derived sitemap", r.includes("Sitemap: https://example.com/sitemap.xml"));
}
{
  const s2 = createSEO({ site: { url: "https://x.com" }, robots: { allow: ["/", "/public"], disallow: ["/admin"], crawlDelay: 10, sitemap: "https://x.com/sm.xml", agents: { Googlebot: { allow: ["/g"], disallow: ["/no"], crawlDelay: 5 } } } });
  const r = s2.robotsTxt();
  t.check("custom allow", r.includes("Allow: /public"));
  t.check("custom disallow", r.includes("Disallow: /admin"));
  t.check("crawl-delay", r.includes("Crawl-delay: 10"));
  t.check("explicit sitemap overrides derived", r.includes("Sitemap: https://x.com/sm.xml"));
  t.check("per-agent block", r.includes("User-agent: Googlebot"));
  t.check("per-agent allow", r.includes("Allow: /g"));
  t.check("per-agent crawl-delay", r.includes("Crawl-delay: 5"));
}

t.group("sitemapXml");
{
  const s2 = createSEO({ site: { url: "https://x.com" }, sitemap: { routes: [
    { path: "/", lastmod: "2024-01-01", changefreq: "daily", priority: 1.0 },
    { path: "https://abs.com/x", changefreq: "weekly" },
  ], dynamicRoutes: () => [{ path: "/blog/1", priority: 0.8 }] } });
  const xml = s2.sitemapXml();
  t.check("xml declaration", xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  t.check("urlset namespace", xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
  t.check("static loc joined to baseUrl", xml.includes("<loc>https://x.com/</loc>"));
  t.check("absolute loc not prefixed", xml.includes("<loc>https://abs.com/x</loc>"));
  t.check("lastmod emitted", xml.includes("<lastmod>2024-01-01</lastmod>"));
  t.check("changefreq emitted", xml.includes("<changefreq>daily</changefreq>"));
  t.check("priority emitted", xml.includes("<priority>1</priority>"));
  t.check("dynamic route included", xml.includes("<loc>https://x.com/blog/1</loc>"));
  t.check("dynamic priority", xml.includes("<priority>0.8</priority>"));
  t.check("closes urlset", xml.trim().endsWith("</urlset>"));
}

t.group("structuredData");
{
  const sd = seo.structuredData({ "@context": "https://schema.org", "@type": "Article", name: "Hi" });
  t.check("ld+json script tag", sd.startsWith('<script type="application/ld+json">'));
  t.check("closes script", sd.endsWith("</script>"));
  const inner = sd.slice(sd.indexOf(">") + 1, sd.lastIndexOf("</script>"));
  t.deep("round-trips via JSON.parse", JSON.parse(inner), { "@context": "https://schema.org", "@type": "Article", name: "Hi" });
}

t.done("ekko:rune/seo covered");
