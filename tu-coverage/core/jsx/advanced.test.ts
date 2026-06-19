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
import { App } from "./fixtures/nested";
import { Status } from "./fixtures/conditional";
import { List } from "./fixtures/fragment";
import { Image, Break, Input } from "./fixtures/self-closing";

describe("JSX advanced features", () => {
  test("App is a function — nested JSX component", () => {
    expect(typeof App).toBe("function");
  });

  test("App() does not crash — map + nested elements", () => {
    const result = App();
    expect(result).not.toBe(undefined);
    expect(typeof result).toBe("object");
  });

  test("Status is a function — conditional rendering", () => {
    expect(typeof Status).toBe("function");
  });

  test("Status({ok:true}) does not crash", () => {
    const result = Status({ ok: true });
    expect(result).not.toBe(undefined);
    expect(typeof result).toBe("object");
  });

  test("Status({ok:false}) does not crash", () => {
    const result = Status({ ok: false });
    expect(result).not.toBe(undefined);
    expect(typeof result).toBe("object");
  });

  test("List is a function — fragment component", () => {
    expect(typeof List).toBe("function");
  });

  test("List() does not crash — fragment rendering", () => {
    const result = List();
    expect(result).not.toBe(undefined);
    expect(typeof result).toBe("object");
  });

  test("Image is a function — self-closing tag", () => {
    expect(typeof Image).toBe("function");
  });

  test("Image({src:'test.png'}) does not crash", () => {
    const result = Image({ src: "test.png" });
    expect(result).not.toBe(undefined);
    expect(typeof result).toBe("object");
  });

  test("Break() does not crash — self-closing br tag", () => {
    const result = Break();
    expect(result).not.toBe(undefined);
    expect(typeof result).toBe("object");
  });

  test("Input({type:'text'}) does not crash — self-closing input tag", () => {
    const result = Input({ type: "text" });
    expect(result).not.toBe(undefined);
    expect(typeof result).toBe("object");
  });

  test("all self-closing tag components work", () => {
    const img = Image({ src: "photo.jpg" });
    const br = Break();
    const input = Input({ type: "password" });
    expect(typeof img).toBe("object");
    expect(typeof br).toBe("object");
    expect(typeof input).toBe("object");
  });
});
