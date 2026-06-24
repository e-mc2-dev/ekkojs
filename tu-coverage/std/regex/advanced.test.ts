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
import { Regex } from "ekko:text/regex";

describe("Regex email pattern", () => {
  test("matches valid email addresses", () => {
    const re = Regex("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    expect(re.test("user@example.com")).toBe(true);
    expect(re.test("alice.bob@company.co.uk")).toBe(true);
    expect(re.test("not-an-email")).toBe(false);
    re.dispose();
  });
});

describe("Regex URL pattern", () => {
  test("matches HTTP/HTTPS URLs", () => {
    const re = Regex("https?://[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/[^\\s]*)?");
    expect(re.test("https://example.com")).toBe(true);
    expect(re.test("http://sub.domain.org/path")).toBe(true);
    expect(re.test("ftp://nope.com")).toBe(false);
    re.dispose();
  });
});

describe("Regex phone number pattern", () => {
  test("matches common phone formats", () => {
    const re = Regex("\\+?\\d{1,3}[-.\\s]?\\(?\\d{2,3}\\)?[-.\\s]?\\d{3,4}[-.\\s]?\\d{3,4}");
    expect(re.test("+1-555-123-4567")).toBe(true);
    expect(re.test("555.123.4567")).toBe(true);
    expect(re.test("abc")).toBe(false);
    re.dispose();
  });
});

describe("Regex replace with capture group reference", () => {
  test("swap first and last name using capture groups", () => {
    const re = Regex("(\\w+)\\s(\\w+)");
    const result = re.replace("John Doe", "$2 $1");
    expect(result).toBe("Doe John");
    re.dispose();
  });
});

describe("Regex split by multiple delimiters", () => {
  test("split by comma, semicolon, or whitespace", () => {
    const re = Regex("[,;\\s]+");
    const parts = re.split("a,b;c d  e");
    expect(parts).toHaveLength(5);
    expect(parts[0]).toBe("a");
    expect(parts[1]).toBe("b");
    expect(parts[2]).toBe("c");
    expect(parts[3]).toBe("d");
    expect(parts[4]).toBe("e");
    re.dispose();
  });
});

describe("Regex matchAll (global flag behavior)", () => {
  test("matchAll returns all matches", () => {
    const re = Regex("\\d+");
    const all = re.matchAll("price: 100, discount: 20, total: 80");
    expect(all).toHaveLength(3);
    expect(all[0].value).toBe("100");
    expect(all[1].value).toBe("20");
    expect(all[2].value).toBe("80");
    re.dispose();
  });
});

describe("Regex case insensitive match", () => {
  test("case insensitive flag matches regardless of case", () => {
    const re = Regex("hello world", "i");
    expect(re.test("Hello World")).toBe(true);
    expect(re.test("HELLO WORLD")).toBe(true);
    expect(re.test("hello world")).toBe(true);
    re.dispose();
  });
});

describe("Regex quantifiers", () => {
  test("+ matches one or more", () => {
    const re = Regex("a+");
    expect(re.test("aaa")).toBe(true);
    expect(re.test("a")).toBe(true);
    expect(re.test("bbb")).toBe(false);
    re.dispose();
  });

  test("* matches zero or more", () => {
    const re = Regex("^ba*b$");
    expect(re.test("bb")).toBe(true);
    expect(re.test("bab")).toBe(true);
    expect(re.test("baab")).toBe(true);
    re.dispose();
  });

  test("? matches zero or one", () => {
    const re = Regex("^colou?r$");
    expect(re.test("color")).toBe(true);
    expect(re.test("colour")).toBe(true);
    expect(re.test("colouur")).toBe(false);
    re.dispose();
  });

  test("{n,m} matches between n and m", () => {
    const re = Regex("^a{2,4}$");
    expect(re.test("a")).toBe(false);
    expect(re.test("aa")).toBe(true);
    expect(re.test("aaa")).toBe(true);
    expect(re.test("aaaa")).toBe(true);
    expect(re.test("aaaaa")).toBe(false);
    re.dispose();
  });
});
