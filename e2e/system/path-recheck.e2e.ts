// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { join, normalize, basename, extname, dirname, isAbsolute, sep } from "ekko:fs/path";
import { asserter } from "../_harness.ts";

const t = asserter();
const WIN = Ekko.platform === "win32";

t.group("normalize — idempotency + edges");
for (const c of ["a//b", "a/./b", "../a/b", "a/b/../c", "/x/y/../z", "./a", "a/b/"]) {
  t.eq("idempotent normalize(" + JSON.stringify(c) + ")", normalize(normalize(c)), normalize(c));
}
t.eq('normalize("") -> ""', normalize(""), "");
t.eq('normalize keeps leading ".." (../b)', normalize("a/../../b").includes(".."), true);

t.group("join — push semantics (absolute later segment resets)");
t.eq("join() -> ''", join(), "");
t.eq('join("a","b") joins with sep', join("a", "b"), "a" + sep + "b");
t.eq('join("a","","b") drops empty segment', join("a", "", "b"), "a" + sep + "b");
t.eq('join("a/","/b") -> "/b" (absolute resets — documented footgun)', join("a/", "/b"), "/b");
t.eq('join("a","..","b") does NOT normalize', join("a", "..", "b"), "a" + sep + ".." + sep + "b");

t.group("extname / basename — dotfiles, multi-dot, trailing sep");
t.eq('extname(".gitignore") -> "" (dotfile)', extname(".gitignore"), "");
t.eq('extname("a.b.c") -> ".c"', extname("a.b.c"), ".c");
t.eq('extname("a.") -> "."', extname("a."), ".");
t.eq('extname("noext") -> ""', extname("noext"), "");
t.eq('extname("a/b.txt/c") -> "" (ext only on last segment)', extname("a/b.txt/c"), "");
t.eq('basename("a/b/") -> "b" (trailing sep ignored)', basename("a/b/"), "b");
t.eq('basename(".gitignore") -> ".gitignore"', basename(".gitignore"), ".gitignore");

t.group("dirname — no-parent → '.'");
t.eq('dirname("a") -> "."', dirname("a"), ".");
t.eq('dirname("") -> "."', dirname(""), ".");
t.eq('dirname("a/b/") -> "a"', dirname("a/b/"), "a");

t.group("isAbsolute — platform-specific (std::path)");
t.eq('isAbsolute("") -> false', isAbsolute(""), false);
t.eq('isAbsolute("a") -> false', isAbsolute("a"), false);
t.eq('isAbsolute("C:") -> false (no separator)', isAbsolute("C:"), false);
if (WIN) {
  t.eq('win: isAbsolute("/a") -> false (needs a drive)', isAbsolute("/a"), false);
  t.eq('win: isAbsolute("C:/a") -> true', isAbsolute("C:/a"), true);
  t.eq('win: isAbsolute("C:\\a") -> true', isAbsolute("C:\\a"), true);
} else {
  t.eq('posix: isAbsolute("/a") -> true', isAbsolute("/a"), true);
  t.eq('posix: isAbsolute("C:/a") -> false (no leading /)', isAbsolute("C:/a"), false);
  t.eq('posix: isAbsolute("a/b") -> false', isAbsolute("a/b"), false);
}

t.done("ekko:fs/path recheck");
