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
import { createApp } from "ekko:ssr";

describe("renderToString", () => {
  const app = createApp({ port: 3000 });

  test("renderToString with simple element returns HTML", () => {
    const el = _jsx("div", { children: "Hello" });
    const html = app.renderToString(el);
    expect(typeof html).toBe("string");
    expect(html.includes("div")).toBe(true);
  });

  test("string element returns escaped text", () => {
    const el = _jsx("span", { children: "Hello World" });
    const html = app.renderToString(el);
    expect(html.includes("Hello World")).toBe(true);
  });

  test("number element returns string of number", () => {
    const el = _jsx("span", { children: 42 });
    const html = app.renderToString(el);
    expect(html.includes("42")).toBe(true);
  });

  test("null returns empty string", () => {
    const html = app.renderToString(null);
    expect(html).toBe("");
  });

  test("false returns empty string", () => {
    const html = app.renderToString(false);
    expect(html).toBe("");
  });

  test("array of elements joined", () => {
    const els = [
      _jsx("li", { children: "one" }),
      _jsx("li", { children: "two" }),
    ];
    const html = app.renderToString(els);
    expect(html.includes("one")).toBe(true);
    expect(html.includes("two")).toBe(true);
  });

  test("element with className maps to class attribute", () => {
    const el = _jsx("div", { className: "container" });
    const html = app.renderToString(el);
    expect(html.includes('class="container"')).toBe(true);
  });

  test("element with string prop", () => {
    const el = _jsx("a", { href: "/home", children: "Home" });
    const html = app.renderToString(el);
    expect(html.includes('href="/home"')).toBe(true);
  });

  test("element with boolean prop (true) renders attribute present", () => {
    const el = _jsx("input", { disabled: true });
    const html = app.renderToString(el);
    expect(html.includes("disabled")).toBe(true);
  });

  test("element with boolean prop (false) renders attribute absent", () => {
    const el = _jsx("input", { disabled: false });
    const html = app.renderToString(el);
    expect(html.includes("disabled")).toBe(false);
  });

  test("void tag (br) renders self-closing", () => {
    const el = _jsx("br", {});
    const html = app.renderToString(el);
    expect(html.includes("br")).toBe(true);
    
    expect(html.includes("</br>")).toBe(false);
  });

  test("void tag (img) with src", () => {
    const el = _jsx("img", { src: "/logo.png" });
    const html = app.renderToString(el);
    expect(html.includes('src="/logo.png"')).toBe(true);
    expect(html.includes("</img>")).toBe(false);
  });

  test("nested elements", () => {
    const el = _jsx("div", {
      children: _jsx("span", { children: "inner" }),
    });
    const html = app.renderToString(el);
    expect(html.includes("<div>")).toBe(true);
    expect(html.includes("<span>")).toBe(true);
    expect(html.includes("inner")).toBe(true);
  });

  test("element with children string", () => {
    const el = _jsx("p", { children: "paragraph text" });
    const html = app.renderToString(el);
    expect(html.includes("paragraph text")).toBe(true);
    expect(html.includes("<p>")).toBe(true);
    expect(html.includes("</p>")).toBe(true);
  });

  test("element with children array", () => {
    const el = _jsxs("ul", {
      children: [
        _jsx("li", { children: "a" }),
        _jsx("li", { children: "b" }),
      ],
    });
    const html = app.renderToString(el);
    expect(html.includes("<ul>")).toBe(true);
    expect(html.includes("<li>")).toBe(true);
    expect(html.includes("a")).toBe(true);
    expect(html.includes("b")).toBe(true);
  });

  test("component function called with props", () => {
    const MyComp = (props: any) => _jsx("div", { children: props.text });
    const el = _jsx(MyComp, { text: "hello component" });
    const html = app.renderToString(el);
    expect(html.includes("hello component")).toBe(true);
  });

  test("component function return value rendered", () => {
    const Greeting = () => _jsx("h1", { children: "Hi" });
    const el = _jsx(Greeting, {});
    const html = app.renderToString(el);
    expect(html.includes("<h1>")).toBe(true);
    expect(html.includes("Hi")).toBe(true);
  });

  test("escapeHtml in text content", () => {
    const el = _jsx("span", { children: "<script>alert('xss')</script>" });
    const html = app.renderToString(el);
    expect(html.includes("<script>")).toBe(false);
    expect(html.includes("&lt;")).toBe(true);
  });

  test("element with multiple props", () => {
    const el = _jsx("a", { href: "/page", target: "_blank", children: "link" });
    const html = app.renderToString(el);
    expect(html.includes('href="/page"')).toBe(true);
    expect(html.includes('target="_blank"')).toBe(true);
    expect(html.includes("link")).toBe(true);
  });

  test("fragment renders children only", () => {
    const el = _jsxs(Symbol.for("react.fragment"), {
      children: [
        _jsx("span", { children: "a" }),
        _jsx("span", { children: "b" }),
      ],
    });
    const html = app.renderToString(el);
    expect(html.includes("<span>")).toBe(true);
    expect(html.includes("a")).toBe(true);
    expect(html.includes("b")).toBe(true);
  });
});
