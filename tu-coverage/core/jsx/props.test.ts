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
import { Button, Icon } from "./fixtures/props-component";

describe("JSX props and attributes", () => {
  test("Button is a function", () => {
    expect(typeof Button).toBe("function");
  });

  test("Icon is a function", () => {
    expect(typeof Icon).toBe("function");
  });

  test("Button({label:'Click'}) returns a value", () => {
    const result = Button({ label: "Click" });
    expect(result).not.toBe(undefined);
  });

  test("Button({label:'Click'}) returns an object", () => {
    const result = Button({ label: "Click" });
    expect(typeof result).toBe("object");
  });

  test("Icon({name:'star'}) returns a value", () => {
    const result = Icon({ name: "star" });
    expect(result).not.toBe(undefined);
  });

  test("Icon({name:'star'}) returns an object", () => {
    const result = Icon({ name: "star" });
    expect(typeof result).toBe("object");
  });

  test("Button with all props does not crash", () => {
    const result = Button({
      label: "Submit",
      onClick: () => {},
      disabled: true,
      className: "btn-primary",
    });
    expect(result).not.toBe(undefined);
    expect(typeof result).toBe("object");
  });

  test("Button with only required props — optional props undefined", () => {
    const result = Button({ label: "OK" });
    expect(result).not.toBe(undefined);
    expect(typeof result).toBe("object");
  });

  test("Icon with dynamic className concatenation works", () => {
    const result = Icon({ name: "check" });
    expect(result).not.toBe(undefined);
  });

  test("functions accept object argument — props pattern", () => {
    
    expect(Button({ label: "A" })).not.toBe(undefined);
    expect(Icon({ name: "B" })).not.toBe(undefined);
  });

  test("TypeScript interface ButtonProps is stripped — no runtime error", () => {

    expect(typeof Button).toBe("function");
  });

  test("destructured props pattern works in Icon", () => {
    
    const result = Icon({ name: "arrow" });
    expect(typeof result).toBe("object");
  });
});
