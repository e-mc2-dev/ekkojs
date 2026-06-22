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
import { asserter } from "../_harness";

const t = asserter();

t.group("baseUrl + canonical join semantics");
{
  const s = createSEO({ site: { url: "https://x.com/" } });
  t.check("trailing slash stripped in canonical", s.headTags({ canonical: "/p" }).includes('href="https://x.com/p"'));
  const s2 = createSEO({ site: { url: "https://x.com" } });
  t.check("no trailing slash → join still single slash", s2.headTags({ canonical: "/p" }).includes('href="https://x.com/p"'));
  t.check("meta.url used when no canonical", s2.headTags({ url: "https://abs/u" }).includes('rel="canonical" href="https://abs/u"'));
  t.check("no canonical/url → no canonical link", !s2.headTags({ title: "T" }).includes('rel="canonical"'));
}

t.group("og:image width/height conditional emission");
{
  const s = createSEO({ site: { url: "https://x.com" } });
  t.check("no image → no width/height", !s.headTags({ og: { imageWidth: 100 } }).includes("og:image:width"));
  t.check("image without dims → no width", !s.headTags({ og: { image: "/i" } }).includes("og:image:width"));
  t.check("image+width → width emitted", s.headTags({ og: { image: "/i", imageWidth: 800 } }).includes('content="800"'));
}

t.group("robots meta conditional");
{
  const s = createSEO({ site: { url: "https://x.com" } });
  t.check("robots:false suppresses", !s.headTags({ title: "T", robots: false }).includes('name="robots"'));
  t.check("robots default present", s.headTags({ title: "T" }).includes('content="index, follow"'));
  t.check("robots custom string", s.headTags({ title: "T", robots: "noindex, nofollow" }).includes('content="noindex, nofollow"'));
}

t.group("sitemap edges");
{
  const empty = createSEO({ site: { url: "https://x.com" } }).sitemapXml();
  t.check("empty routes → valid empty urlset", empty.includes("<urlset") && empty.trim().endsWith("</urlset>"));
  t.check("empty routes → no <url>", !empty.includes("<url>"));

  const nonArr = createSEO({ site: { url: "https://x.com" }, sitemap: { dynamicRoutes: () => (null as any) } }).sitemapXml();
  t.check("dynamicRoutes non-array ignored (no throw, no url)", !nonArr.includes("<url>"));

  const p0 = createSEO({ site: { url: "https://x.com" }, sitemap: { routes: [{ path: "/a", priority: 0 }] } }).sitemapXml();
  t.check("priority 0 emitted", p0.includes("<priority>0</priority>"));

  const abs = createSEO({ site: { url: "https://x.com" }, sitemap: { routes: [{ path: "http://other/x" }] } }).sitemapXml();
  t.check("absolute http path untouched", abs.includes("<loc>http://other/x</loc>"));
}

t.group("structuredData round-trips");
{
  const seo = createSEO({ site: { url: "https://x.com" } });
  const nested = { "@type": "Org", emp: [{ n: "Zoë" }, { n: "李" }], meta: { a: [1, 2, 3] } };
  const out = seo.structuredData(nested);
  t.deep("nested + unicode round-trips", JSON.parse(out.slice(out.indexOf(">") + 1, out.lastIndexOf("</script>"))), nested);
  const empty = seo.structuredData({});
  t.deep("empty object", JSON.parse(empty.slice(empty.indexOf(">") + 1, empty.lastIndexOf("</script>"))), {});
}

t.group("og / twitter fallbacks + default-meta deep override");
{
  const s = createSEO({ site: { url: "https://x.com", name: "S" }, og: { type: "website" }, twitter: { card: "summary" } });
  const h = s.headTags({ title: "PT", description: "PD", og: { image: "/og.png" } });
  t.check("twitter:image falls back to og.image", h.includes('name="twitter:image" content="/og.png"'));
  t.check("og:title falls back to meta.title", h.includes('property="og:title" content="PT"'));
  t.check("twitter:title falls back to meta.title", h.includes('name="twitter:title" content="PT"'));
}
{
  
  const s = createSEO({ site: { url: "https://x.com" }, og: { type: "website", title: "DEFT" }, twitter: { card: "summary" } });
  const h = s.headTags({ title: "Page", og: { title: "PAGET" } });
  t.check("page og.title overrides default og.title", h.includes('property="og:title" content="PAGET"'));
  t.check("default twitter.card persists", h.includes('name="twitter:card" content="summary"'));
}

t.done("ekko:rune/seo recheck");
