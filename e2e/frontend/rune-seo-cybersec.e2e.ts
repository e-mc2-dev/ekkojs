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
const seo = createSEO({ site: { url: "https://x.com", name: "X", language: "en" } });

t.group("BUG A — structuredData </script> breakout neutralized (XSS)");
{
  const payload = { name: "</script><img src=x onerror=alert(1)>" };
  const out = seo.structuredData(payload);
  
  t.eq("exactly one </script> (the closer)", out.split("</script>").length, 2);
  t.check("no raw <img in script body", !out.slice(0, out.lastIndexOf("</script>")).includes("<img"));
  t.check("< escaped to \\u003c", out.includes("\\u003c"));
  t.check("> escaped to \\u003e", out.includes("\\u003e"));
  const inner = out.slice(out.indexOf(">") + 1, out.lastIndexOf("</script>"));
  t.deep("value still round-trips via JSON.parse", JSON.parse(inner), payload);
}
{
  
  const out = seo.structuredData('{"x":"</script><script>alert(1)</script>"}');
  t.eq("string input: one </script>", out.split("</script>").length, 2);
  t.check("string input: < escaped", out.includes("\\u003c"));
}
{
  const out = seo.structuredData({ a: "x & y", b: "<b>" });
  t.check("ampersand escaped", out.includes("\\u0026"));
  t.deep("ampersand round-trips", JSON.parse(out.slice(out.indexOf(">") + 1, out.lastIndexOf("</script>"))), { a: "x & y", b: "<b>" });
}

t.group("BUG B — headTags og:image width/height attribute breakout neutralized");
{
  const h = seo.headTags({ title: "T", og: { image: "/i.png", imageWidth: '100"><script>alert(1)</script>', imageHeight: '50"onload="x' } });
  t.check("imageWidth not a raw breakout", !h.includes('content="100"><script>'));
  t.check("imageWidth quote escaped", h.includes("&quot;"));
  t.check("imageWidth angle escaped", h.includes("&lt;script&gt;") || h.includes("&lt;"));
  t.check("imageHeight quote escaped (no onload breakout)", !h.includes('content="50"onload='));
}

t.group("BUG C — sitemap child XML injection neutralized");
{
  const s = createSEO({ site: { url: "https://x.com" }, sitemap: { routes: [
    { path: "/a", lastmod: "</loc></url><url><loc>https://evil.com</loc>", changefreq: "</changefreq><x>", priority: "1</priority><y>" },
  ] } });
  const xml = s.sitemapXml();
  t.eq("exactly one <url> entry (no forged url)", xml.split("<url>").length, 2);
  t.eq("exactly one </loc> (the real one)", xml.split("</loc>").length, 2);
  t.check("evil.com not injected as markup", !xml.includes("<loc>https://evil.com</loc>"));
  t.check("lastmod payload escaped", xml.includes("&lt;/loc&gt;"));
  t.check("changefreq payload escaped", xml.includes("&lt;x&gt;"));
  t.check("priority payload escaped", xml.includes("&lt;y&gt;"));
}

t.group("BUG D — sitemap route missing path does not crash");
{
  const s = createSEO({ site: { url: "https://x.com" }, sitemap: { routes: [{ lastmod: "2020-01-01" }] } });
  t.notThrows("missing path → no throw", () => s.sitemapXml());
  const xml = s.sitemapXml();
  t.check("produces valid urlset", xml.includes("<urlset") && xml.trim().endsWith("</urlset>"));
  t.check("loc falls back to baseUrl", xml.includes("<loc>https://x.com</loc>"));
}

t.group("headTags — every input field escaped against \" < > &");
{
  const x = '"><script>alert(1)</script>&';
  const h = seo.headTags({ title: x, description: x, keywords: [x], author: x, canonical: "/" + x, robots: x, og: { image: x, url: x }, twitter: { card: x, site: x, image: x } });
  t.check("no raw <script breakout anywhere", !h.includes("<script>alert(1)</script>"));
  t.check("quotes escaped", h.includes("&quot;"));
  t.check("angle brackets escaped", h.includes("&lt;") && h.includes("&gt;"));
  t.check("ampersand escaped", h.includes("&amp;"));
  
  const metas = h.split("\n").filter((l) => l.includes("content="));
  t.check("all content attrs well-formed (no inner literal quote)", metas.every((l) => /content="[^"]*">$/.test(l)));
}

t.group("robotsTxt — newline directive injection neutralized");
{
  const s = createSEO({ site: { url: "https://x.com" }, robots: { disallow: ["/a\nUser-agent: EvilBot\nDisallow: /"] } });
  const r = s.robotsTxt();
  const lines = r.split("\n");
  t.check("no injected EvilBot user-agent line", lines.indexOf("User-agent: EvilBot") === -1);
  t.eq("only one User-agent line", lines.filter((l) => l.startsWith("User-agent:")).length, 1);
  t.check("payload collapsed onto one Disallow line", r.includes("Disallow: /a User-agent: EvilBot Disallow: /"));
}

t.done("ekko:rune/seo cybersec");
