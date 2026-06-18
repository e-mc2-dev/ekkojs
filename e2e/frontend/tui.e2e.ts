// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { createNode, computeLayout, generateCells, setScroll } from "ekko:app/tui";
import { asserter } from "../_harness";

const t = asserter();
function mk(type: string, props: any, children: any[] = []) {
  const n = createNode(type, props);
  for (const c of children) { c.parent = n; n.children.push(c); }
  return n;
}
const text = (s: string) => mk("tui-text", { children: s });
const box = (props: any, children: any[] = []) => mk("tui-box", props, children);

t.group("covered — column stacking");
{
  const a = text("AAA"), b = text("BB");
  const root = box({ width: 20, height: 5 }, [a, b]);
  computeLayout(root, 0, 0, 20, 5);
  t.deep("root layout", root.layout, { x: 0, y: 0, width: 20, height: 5 });
  t.eq("first child y=0", a.layout.y, 0);
  t.eq("second child y=1 (stacked)", b.layout.y, 1);
  t.eq("text height 1", a.layout.height, 1);
  t.eq("child width = inner width", a.layout.width, 20);
}

t.group("covered — row layout");
{
  const a = text("X"), b = text("YY");
  const root = box({ width: 20, height: 3, flexDirection: "row" }, [a, b]);
  computeLayout(root, 0, 0, 20, 3);
  t.eq("a at x=0", a.layout.x, 0);
  t.eq("a width = text width 1", a.layout.width, 1);
  t.eq("b after a (x=1)", b.layout.x, 1);
  t.eq("b width = text width 2", b.layout.width, 2);
}

t.group("covered — padding + border offset");
{
  const c = text("Z");
  const root = box({ width: 20, height: 5, padding: 2, border: true }, [c]);
  computeLayout(root, 0, 0, 20, 5);
  t.eq("child x = pad2 + border1", c.layout.x, 3);
  t.eq("child y = pad2 + border1", c.layout.y, 3);
  t.eq("child width = 20 - 2*pad - 2*border", c.layout.width, 14);
}

t.group("covered — flex distribution (row)");
{
  const a = box({ flex: 1 }), b = box({ flex: 1 });
  const root = box({ width: 21, height: 3, flexDirection: "row" }, [a, b]);
  computeLayout(root, 0, 0, 21, 3);
  t.eq("flex sum fills width", a.layout.width + b.layout.width, 21);
  t.check("roughly even split", Math.abs(a.layout.width - b.layout.width) <= 1);
}
{
  const a = box({ flex: 1 }), b = box({ flex: 3 });
  const root = box({ width: 20, height: 3, flexDirection: "row" }, [a, b]);
  computeLayout(root, 0, 0, 20, 3);
  t.check("flex:3 wider than flex:1", b.layout.width > a.layout.width);
  t.eq("flex weighted sum fills", a.layout.width + b.layout.width, 20);
}

t.group("covered — percentage + fixed sizes");
{
  const c = box({ width: "50%", height: 2 });
  const root = box({ width: 20, height: 5 }, [c]);
  computeLayout(root, 0, 0, 20, 5);
  t.eq("50% of 20 = 10", c.layout.width, 10);
  const d = box({ width: 7, height: 3 });
  const root2 = box({ width: 20, height: 5 }, [d]);
  computeLayout(root2, 0, 0, 20, 5);
  t.eq("fixed width respected", d.layout.width, 7);
}

t.group("covered — generateCells");
{
  const t1 = text("Hi");
  const root = box({ width: 10, height: 3 }, [t1]);
  computeLayout(root, 0, 0, 10, 3);
  const cells = generateCells(root);
  const chars = cells.filter((c: any) => c.ch && c.ch.trim()).map((c: any) => c.ch).join("");
  t.check("text content rendered into cells", chars.includes("H") && chars.includes("i"));
  t.check("cells have coordinates", cells.every((c: any) => typeof c.x === "number" && typeof c.y === "number"));
}
{
  
  const root = box({ width: 6, height: 4, border: true });
  computeLayout(root, 0, 0, 6, 4);
  const cells = generateCells(root);
  t.check("bordered box emits cells", cells.length > 0);
}

t.group("recheck — nested + gap + margin + absolute");
{
  const inner = box({ height: 2 }, [text("a")]);
  const root = box({ width: 20, height: 10, padding: 1 }, [inner]);
  computeLayout(root, 0, 0, 20, 10);
  t.eq("nested inner offset by parent padding", inner.layout.x, 1);
  t.eq("nested inner y by padding", inner.layout.y, 1);
}
{
  const a = box({ height: 2 }), b = box({ height: 2 });
  const root = box({ width: 10, height: 10, gap: 2 }, [a, b]);
  computeLayout(root, 0, 0, 10, 10);
  t.eq("gap between stacked children", b.layout.y - (a.layout.y + a.layout.height), 2);
}
{
  const c = text("m");
  const root = box({ width: 20, height: 5, margin: 2 }, [c]);
  computeLayout(root, 0, 0, 20, 5);
  t.eq("margin shifts root x", root.layout.x, 2);
  t.eq("margin shifts root y", root.layout.y, 2);
}
{
  
  t.notThrows("empty box computeLayout", () => computeLayout(box({ width: 5, height: 5 }), 0, 0, 5, 5));
  t.notThrows("zero available size", () => computeLayout(box({}, [text("x")]), 0, 0, 0, 0));
  const tiny = box({ width: 1, height: 1, padding: 5, border: true }, [text("y")]);
  t.notThrows("padding bigger than box clamps", () => computeLayout(tiny, 0, 0, 1, 1));
}

t.group("recheck — setScroll filters cells");
{
  setScroll(0); 
  const root = box({ width: 5, height: 10 }, [text("a"), text("b"), text("c")]);
  computeLayout(root, 0, 0, 5, 10);
  const before = generateCells(root).length;
  t.check("cells generated", before > 0);
  setScroll(0); 
  t.notThrows("setScroll(0) resets", () => generateCells(root));
}

t.done("ekko:app/tui layout covered+recheck");
