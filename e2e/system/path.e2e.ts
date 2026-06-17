// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { join, resolve, dirname, basename, extname, isAbsolute, normalize, sep } from "ekko:fs/path";
import { asserter } from "../_harness";

const t = asserter();
const WIN = Ekko.platform === "win32";
const BS = String.fromCharCode(92); 
const S = (...p: string[]) => p.join(sep); 

t.group("sep");
t.eq("sep matches platform", sep, WIN ? BS : "/");
t.eq("sep length 1", sep.length, 1);
t.type("sep is string", sep, "string");

t.group("join (native separator, no normalization)");
t.eq("join 3 segments", join("a", "b", "c"), S("a", "b", "c"));
t.eq("join 2 segments", join("x", "y"), S("x", "y"));
t.eq("join 4 segments", join("a", "b", "c", "d"), S("a", "b", "c", "d"));
t.eq("join single segment", join("solo"), "solo");
t.eq("join no args -> empty", join(), "");
t.eq("join trailing empty -> trailing sep", join("a", ""), "a" + sep);
t.eq("join does NOT collapse ..", join("a", "..", "c"), S("a", "..", "c"));
t.type("join returns string", join("a"), "string");
t.eq("join leading slash (abs resets on unix, kept on win)", join("/abs", "b"), WIN ? "/abs" + sep + "b" : "/abs/b");
t.eq("join mixed input slashes", join("a/b", "c"), WIN ? "a/b" + BS + "c" : "a/b/c");

t.group("dirname (separator-independent; #1 fixed: single component -> '.')");
t.eq("dirname nested file", dirname("/a/b/c.txt"), "/a/b");
t.eq("dirname two components", dirname("a/b"), "a");
t.eq("dirname three components", dirname("/a/b/c"), "/a/b");
t.eq("dirname single component -> '.' (#1)", dirname("a"), ".");
t.eq("dirname root -> '.'", dirname("/"), ".");
t.eq("dirname empty -> '.'", dirname(""), ".");
t.eq("dirname trailing slash ignored", dirname("a/b/"), "a");
t.eq("dirname '/a' -> '/'", dirname("/a"), "/");
t.eq("dirname deep", dirname("/x/y/z/w.txt"), "/x/y/z");
t.eq("dirname relative nested", dirname("a/b/c"), "a/b");
t.type("dirname returns string", dirname("a/b"), "string");
t.eq("dirname dotfile in dir", dirname("/etc/.bashrc"), "/etc");
t.eq("dirname trailing slash deep", dirname("x/y/z/"), "x/y");
t.eq("dirname four levels", dirname("/p/q/r/s.txt"), "/p/q/r");

t.group("basename (separator-independent)");
t.eq("basename file", basename("/a/b/c.txt"), "c.txt");
t.eq("basename strip ext", basename("/a/b/c.txt", ".txt"), "c");
t.eq("basename trailing slash", basename("/a/b/"), "b");
t.eq("basename root -> ''", basename("/"), "");
t.eq("basename plain", basename("file"), "file");
t.eq("basename strip full ext", basename("file.txt", ".txt"), "file");
t.eq("basename ext no-match -> full", basename("c.txt", ".md"), "c.txt");
t.eq("basename relative", basename("a/b/c"), "c");
t.eq("basename dotfile", basename("/x/.hidden"), ".hidden");
t.eq("basename multi-dot strip last", basename("/a/b.tar.gz", ".gz"), "b.tar");
t.eq("basename empty -> ''", basename(""), "");
t.type("basename returns string", basename("a/b"), "string");

t.group("extname (separator-independent)");
t.eq("extname multi-dot -> last", extname("file.tar.gz"), ".gz");
t.eq("extname none", extname("file"), "");
t.eq("extname dotfile -> ''", extname(".bashrc"), "");
t.eq("extname trailing dot -> '.'", extname("file."), ".");
t.eq("extname dot only in dir -> ''", extname("a/b.c/d"), "");
t.eq("extname file in dotted dir", extname("a/b.c/d.txt"), ".txt");
t.eq("extname simple", extname("archive.tar"), ".tar");
t.eq("extname triple", extname("x.y.z"), ".z");
t.eq("extname html", extname("index.html"), ".html");
t.eq("extname noext word", extname("README"), "");
t.eq("extname absolute path", extname("/a/b/c.json"), ".json");
t.eq("extname four dots -> last", extname("a.b.c.d"), ".d");
t.eq("extname uppercase ext", extname("PHOTO.JPG"), ".JPG");
t.type("extname returns string", extname("a.b"), "string");

t.group("isAbsolute (platform-dependent)");
t.eq("relative not absolute", isAbsolute("a/b"), false);
t.eq("dot-relative not absolute", isAbsolute("./a"), false);
t.eq("empty not absolute", isAbsolute(""), false);
t.eq("bare name not absolute", isAbsolute("file.txt"), false);
t.eq("resolve() output is absolute", isAbsolute(resolve("x")), true);
if (WIN) {
  t.eq("win: drive path absolute", isAbsolute("C:" + BS + "x"), true);
  t.eq("win: leading-slash NOT absolute (no drive)", isAbsolute("/usr/bin"), false);
  t.eq("win: UNC path absolute", isAbsolute(BS + BS + "srv" + BS + "share"), true);
  t.eq("win: bare drive-relative not absolute", isAbsolute("C:x"), false);
} else {
  t.eq("unix: leading-slash absolute", isAbsolute("/usr/bin"), true);
  t.eq("unix: root absolute", isAbsolute("/"), true);
  t.eq("unix: drive path NOT absolute", isAbsolute("C:" + BS + "x"), false);
  t.eq("unix: deep absolute", isAbsolute("/a/b/c"), true);
}

t.group("normalize (#2 keep leading '..'; #3 clamp at root)");
t.eq("normalize collapse .. and .", normalize("a/b/../c/./d"), S("a", "c", "d"));
t.eq("normalize collapse .", normalize("a/./b"), S("a", "b"));
t.eq("normalize trailing ..", normalize("a/b/.."), "a");
t.eq("normalize leading ./", normalize("./a"), "a");
t.eq("normalize double slash", normalize("a//b"), S("a", "b"));
t.eq("normalize empty -> ''", normalize(""), "");
t.eq("normalize stacked .. collapse", normalize("a/b/c/../.."), "a");
t.eq("normalize keep leading .. (#2)", normalize("../a"), S("..", "a"));
t.eq("normalize keep stacked leading .. (#2)", normalize("../../x"), S("..", "..", "x"));
t.eq("normalize clamp at root, stays absolute (#3)", normalize("/a/../../b"), sep + "b");
t.eq("normalize absolute simple", normalize("/a/./b"), sep + S("a", "b"));
t.type("normalize returns string", normalize("a/b"), "string");

t.group("resolve (absolute; #4 does NOT collapse '..')");
t.type("resolve returns string", resolve("a"), "string");
t.eq("resolve output is absolute", isAbsolute(resolve("a", "b")), true);
t.ok("resolve appends segments", resolve("a", "b").endsWith(S("a", "b")));
t.ok("resolve single segment", resolve("x").endsWith(sep + "x"));
t.eq("resolve no-args is absolute", isAbsolute(resolve()), true);
t.gt("resolve no-args non-empty", resolve().length, 0);
t.ok("resolve does NOT collapse .. (#4 accepted)", resolve("a", "..", "b").includes(".."));
if (WIN) {
  t.ok("win: drive segment resets base", resolve("C:" + BS + "x", "y").startsWith("C:"));
} else {
  t.eq("unix: absolute segment resets base", resolve("/x", "y"), "/x/y");
}

t.done("ekko:fs/path");
