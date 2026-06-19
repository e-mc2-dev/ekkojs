// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { describe, test, expect } from "ekko:test";
import { createStyleCollector, createApp } from "ekko:ssr";

describe("createStyleCollector", () => {
  test("createStyleCollector is a function", () => {
    expect(typeof createStyleCollector).toBe("function");
  });

  test("returns collector object", () => {
    const collector = createStyleCollector();
    expect(typeof collector.add).toBe("function");
    expect(typeof collector.getStyles).toBe("function");
    expect(typeof collector.getStylesArray).toBe("function");
    expect(typeof collector.reset).toBe("function");
    expect(typeof collector.has).toBe("function");
  });

  test("add registers a style by id", () => {
    const collector = createStyleCollector();
    collector.add("btn-1", ".btn { color: red; }");
    expect(collector.has("btn-1")).toBe(true);
    expect(collector.has("btn-2")).toBe(false);
  });

  test("getStyles returns <style> tags with data-ekko-styled", () => {
    const collector = createStyleCollector();
    collector.add("btn", ".btn { color: red; }");
    const html = collector.getStyles();
    expect(html.includes("<style")).toBe(true);
    expect(html.includes('data-ekko-styled="btn"')).toBe(true);
    expect(html.includes(".btn { color: red; }")).toBe(true);
    expect(html.includes("</style>")).toBe(true);
  });

  test("multiple styles collected in order", () => {
    const collector = createStyleCollector();
    collector.add("a", ".a { color: red; }");
    collector.add("b", ".b { color: blue; }");
    const html = collector.getStyles();
    expect(html.includes(".a { color: red; }")).toBe(true);
    expect(html.includes(".b { color: blue; }")).toBe(true);
    expect(html.indexOf(".a") < html.indexOf(".b")).toBe(true);
  });

  test("duplicate ids overwrite", () => {
    const collector = createStyleCollector();
    collector.add("btn", ".btn { color: red; }");
    collector.add("btn", ".btn { color: blue; }");
    const html = collector.getStyles();
    expect(html.includes("color: blue")).toBe(true);
    expect((html.match(/data-ekko-styled/g) || []).length).toBe(1);
  });

  test("getStylesArray returns array of {id, css}", () => {
    const collector = createStyleCollector();
    collector.add("x", ".x { display: flex; }");
    collector.add("y", ".y { display: grid; }");
    const arr = collector.getStylesArray();
    expect(arr.length).toBe(2);
    expect(arr[0].id).toBe("x");
    expect(arr[0].css).toBe(".x { display: flex; }");
    expect(arr[1].id).toBe("y");
  });

  test("reset clears all styles", () => {
    const collector = createStyleCollector();
    collector.add("a", ".a {}");
    collector.add("b", ".b {}");
    collector.reset();
    expect(collector.getStyles()).toBe("");
    expect(collector.has("a")).toBe(false);
  });
});

describe("htmlShell with inlineStyles", () => {
  test("inlineStyles injected in head before content", () => {
    const app = createApp({ port: 3000 });
    const collector = createStyleCollector();
    collector.add("hero", ".hero { font-size: 3rem; }");
    const html = app.htmlShell({
      title: "CSS-in-JS Test",
      body: "<div>content</div>",
      inlineStyles: collector.getStyles(),
    });
    expect(html.includes('data-ekko-styled="hero"')).toBe(true);
    expect(html.includes(".hero { font-size: 3rem; }")).toBe(true);
    const stylePos = html.indexOf("data-ekko-styled");
    const bodyPos = html.indexOf("<div>content</div>");
    expect(stylePos < bodyPos).toBe(true);
  });

  test("no FOUC: styles in head, content in body", () => {
    const app = createApp({ port: 3000 });
    const collector = createStyleCollector();
    collector.add("nav", ".nav { background: #333; }");
    const html = app.htmlShell({
      title: "FOUC Test",
      body: "<nav>menu</nav>",
      inlineStyles: collector.getStyles(),
    });
    const headEnd = html.indexOf("</head>");
    const stylePos = html.indexOf("data-ekko-styled");
    expect(stylePos < headEnd).toBe(true);
  });

  test("empty inlineStyles produces no extra tags", () => {
    const app = createApp({ port: 3000 });
    const html = app.htmlShell({ title: "Clean", body: "<p>hi</p>" });
    expect(html.includes("data-ekko-styled")).toBe(false);
  });
});

describe("client hydration dedup", () => {
  test("style tags have unique data-ekko-styled attribute for client dedup", () => {
    const collector = createStyleCollector();
    collector.add("comp-a", ".a { color: red; }");
    collector.add("comp-b", ".b { color: blue; }");
    const html = collector.getStyles();
    expect(html.includes('data-ekko-styled="comp-a"')).toBe(true);
    expect(html.includes('data-ekko-styled="comp-b"')).toBe(true);
  });
});
