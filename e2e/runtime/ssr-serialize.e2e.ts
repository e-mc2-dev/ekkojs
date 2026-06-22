// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { serializeProps } from "ekko:ssr";
import { asserter } from "../_harness";

const t = asserter();

t.group("serializeProps — shared references (DAG) serialize, not 'circular'");
const author = { id: 2, name: "Bob" };
const board: any = serializeProps({ rows: [{ author }, { author }, { author }] });
t.eq("all rows kept", board.rows.length, 3);
t.eq("repeated ref serialized each occurrence", board.rows[2].author.name, "Bob");
t.eq("repeated ref carries full value", board.rows[0].author.id, 2);

const leaf = { v: 1 };
const dag: any = serializeProps({ a: { x: leaf }, b: { y: leaf }, c: [leaf, leaf] });
t.eq("dag object branch", dag.a.x.v, 1);
t.eq("dag array branch", dag.c[1].v, 1);
t.notThrows("diamond (two siblings share one child)", () => serializeProps({ l: author, r: author }));

t.group("serializeProps — TRUE cycles are still rejected");
t.throws("direct self-cycle", () => { const c: any = {}; c.self = c; serializeProps(c); }, /circular/);
t.throws("indirect cycle (a→b→a)", () => { const a: any = {}, b: any = { a }; a.b = b; serializeProps({ root: a }); }, /circular/);
t.throws("cycle through an array", () => { const arr: any = []; arr.push({ arr }); serializeProps({ arr }); }, /circular/);

t.group("serializeProps — still rejects unsupported values");
t.throws("function", () => serializeProps({ f: () => 1 }), /function/);
t.throws("BigInt", () => serializeProps({ n: 1n as any }), /BigInt/);

t.done("serializeProps — shared refs vs cycles");
