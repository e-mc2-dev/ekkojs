// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import {
  render, Box, Text, Spacer, CodeView, renderMarkdown, mdWrap,
  useState, useInput, useGlobalKey, useResize, useApp,
} from "ekko:app/tui";
import { readText } from "ekko:fs";

interface TNode { id: number; label: string; topic: string; number?: string; children: TNode[]; }

const bundle: any = JSON.parse(readText("./docs.json"));

let _id = 0;
const parentOf: Record<number, number> = {};
const byNumber: Record<string, TNode> = {};
const topicNode: Record<string, TNode> = {};
function build(label: string, topic: string, number: string | undefined, kids: any[], parent: number): TNode {
  const node: TNode = { id: _id++, label, topic, number, children: [] };
  if (number) byNumber[topic + "/" + number] = node; 
  if (parent >= 0) parentOf[node.id] = parent;
  for (const k of kids || []) node.children.push(build(k.label, topic, k.number, k.children || [], node.id));
  return node;
}
const roots: TNode[] = bundle.topics.map((t: any) => {
  const n = build(t.title, t.key, undefined, bundle.trees[t.key] || [], -1);
  topicNode[t.key] = n;
  return n;
});

interface VRow { node: TNode; depth: number; prefix: string; expandable: boolean; open: boolean; }
function computeVisible(expanded: Record<number, boolean>): VRow[] {
  const out: VRow[] = [];
  const walk = (node: TNode, depth: number, ancLast: boolean[]) => {
    let prefix = "";
    for (let k = 1; k < depth; k++) prefix += ancLast[k] ? "  " : "│ ";
    if (depth >= 1) prefix += ancLast[depth] ? "└─ " : "├─ ";
    const expandable = node.children.length > 0;
    const open = !!expanded[node.id];
    out.push({ node, depth, prefix, expandable, open });
    if (open && expandable) {
      for (let i = 0; i < node.children.length; i++) {
        walk(node.children[i], depth + 1, ancLast.concat(i === node.children.length - 1));
      }
    }
  };
  for (let i = 0; i < roots.length; i++) walk(roots[i], 0, [i === roots.length - 1]);
  return out;
}

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

function initialState() {
  const expanded: Record<number, boolean> = {};
  let target: TNode | null = null;
  const argv: string[] = (typeof Ekko !== "undefined" && Array.isArray(Ekko.args)) ? Ekko.args : [];
  const di = argv.indexOf("doc");
  const rest = (di >= 0 ? argv.slice(di + 1) : []).filter((x) => !x.startsWith("-"));
  let head = rest[0]; let path = rest[1];
  if (head && head.indexOf("/") >= 0) { const p = head.split("/"); head = p[0]; path = p.slice(1).join("/"); }
  const padN = (s: string) => s.padStart(3, "0");
  if (head) {
    if (/^\d+$/.test(head)) {
      
      for (const t of bundle.topics) { const n = byNumber[t.key + "/" + padN(head)]; if (n) { target = n; break; } }
    } else {
      const topic = bundle.topics.find((t: any) => t.key === head || (t.aliases || []).includes(head));
      if (topic) {
        if (path) {
          const dk = /^\d+$/.test(path) ? topic.key + "/" + padN(path) : bundle.by_path[topic.key + "/" + path];
          target = (dk && byNumber[dk]) || null;
        }
        if (!target) { expanded[topicNode[topic.key].id] = true; } 
      }
    }
  }
  let page: string | null = null;
  let cursorId = roots.length ? roots[0].id : 0;
  if (target) {
    page = target.topic + "/" + target.number; 
    cursorId = target.id;
    
    let p: number | undefined = parentOf[target.id];
    while (p !== undefined) { expanded[p] = true; p = parentOf[p]; }
  }
  return { expanded, page, cursorId };
}
const INIT = initialState();
const INIT_VIS = computeVisible(INIT.expanded);

function App() {
  const { columns, rows: termRows } = useResize();
  const { exit } = useApp();
  const [expanded, setExpanded] = useState<Record<number, boolean>>(INIT.expanded);
  const [cur, setCur] = useState(Math.max(0, INIT_VIS.findIndex((v) => v.node.id === INIT.cursorId)));
  const [page, setPage] = useState<string | null>(INIT.page);
  const [scroll, setScrollY] = useState(0);
  const [hscroll, setHscroll] = useState(0);
  const [navW, setNavW] = useState(clamp(Math.floor(columns * 0.32), 22, 48));

  useGlobalKey("ctrl+c", () => exit());
  useGlobalKey("q", () => exit());

  const leftW = clamp(navW, 18, Math.max(18, columns - 24));
  const rightW = Math.max(12, columns - leftW - 1);
  const bodyH = Math.max(3, termRows - 1);
  const viewH = Math.max(3, bodyH - 3);
  const listH = Math.max(1, bodyH - 2);

  const visible = computeVisible(expanded);
  const ci = clamp(cur, 0, Math.max(0, visible.length - 1));

  const docu: any = page ? bundle.docs[page] : null;
  const contentW = Math.max(10, rightW - 2);
  const wrapped = docu ? mdWrap(renderMarkdown(docu.clean), contentW) : [];
  const maxScroll = Math.max(0, wrapped.length - viewH);
  const sc = clamp(scroll, 0, maxScroll);
  
  let maxLineW = 0;
  for (const l of wrapped) { const w = (l.text || "").length; if (w > maxLineW) maxLineW = w; }
  const hmax = Math.max(0, maxLineW - contentW);
  const hsc = clamp(hscroll, 0, hmax);

  const toggle = (n: TNode) => setExpanded({ ...expanded, [n.id]: !expanded[n.id] });

  useInput((_key: any, ev: any) => {
    const big = Math.max(1, viewH - 2);
    if (ev.alt && ev.key === "Left") { setNavW(clamp(leftW - 4, 18, columns - 24)); return; }
    if (ev.alt && ev.key === "Right") { setNavW(clamp(leftW + 4, 18, columns - 24)); return; }
    if (ev.key === "Up") setCur(clamp(ci - 1, 0, visible.length - 1));
    else if (ev.key === "Down") setCur(clamp(ci + 1, 0, visible.length - 1));
    else if (ev.key === "PageUp") setCur(clamp(ci - listH, 0, visible.length - 1));
    else if (ev.key === "PageDown") setCur(clamp(ci + listH, 0, visible.length - 1));
    else if (ev.key === "Enter") {
      const v = visible[ci];
      if (!v) return;
      if (v.expandable) toggle(v.node);
      else if (v.node.number) { setPage(v.node.topic + "/" + v.node.number); setScrollY(0); setHscroll(0); }
    } else if (ev.key === "Right") setHscroll(clamp(hsc + 10, 0, hmax)); 
    else if (ev.key === "Left") setHscroll(clamp(hsc - 10, 0, hmax));
    else if (ev.char === "j") setScrollY(clamp(sc + big, 0, maxScroll));
    else if (ev.char === "k") setScrollY(clamp(sc - big, 0, maxScroll));
    else if (ev.char === "u") setScrollY(clamp(sc + 2, 0, maxScroll));
    else if (ev.char === "i") setScrollY(clamp(sc - 2, 0, maxScroll));
  }, { isGlobal: true });

  const first = ci >= listH ? ci - listH + 1 : 0;
  const win = visible.slice(first, first + listH);

  const posTag = (maxScroll > 0
    ? (sc > 0 ? "  ↑" : "") + (sc < maxScroll ? "  ↓ more (j)" : "  (end)")
    : "") + (hmax > 0 ? "  ←→ " + hsc : "");

  return (
    <Box flexDirection="column" width={columns} height={termRows}>
      <Box height={1} width={columns} bg="blue" flexDirection="row">
        <Text bold color="white"> EkkoJS Docs </Text>
        <Spacer />
        <Text color="brightWhite"> ↑↓ ⏎  ←→ pan  j/k·u/i scroll  Alt+←→ size  q quit </Text>
      </Box>
      <Box flexDirection="row" flex={1}>
        <Box width={leftW} flexDirection="column" border borderStyle="round" borderColor="brightBlack">
          {win.map((v, i) => {
            const isCur = (first + i) === ci;
            const marker = v.expandable ? (v.open ? "▾ " : "▸ ") : "";

            if (isCur) {
              const full = v.depth === 0
                ? marker + v.node.label
                : v.prefix + (v.expandable ? marker + v.node.label : v.node.number + "  " + v.node.label);
              return <Text key={i} inverse bold>{full}</Text>;
            }
            
            if (v.depth === 0) {
              return <Text key={i} bold color="cyan">{marker}{v.node.label}</Text>;
            }
            return (
              <Box key={i} flexDirection="row">
                <Text color="brightBlack">{v.prefix}</Text>
                {v.expandable
                  ? <Text color="brightBlue" bold>{marker}{v.node.label}</Text>
                  : <Text color="brightBlack">{v.node.number}  </Text>}
                {!v.expandable && <Text color="white">{v.node.label}</Text>}
              </Box>
            );
          })}
        </Box>
        <Box width={rightW} flexDirection="column" padding={{ left: 1 }}>
          {docu ? (
            <Box flexDirection="column">
              <Text color="brightBlack">{(docu.crumbs || []).join(" / ")}{posTag}</Text>
              <Text bold color="white">{docu.title}</Text>
              <Text color="brightBlack">{docu.url}</Text>
              <CodeView lines={wrapped} top={sc} height={viewH} left={hsc} width={contentW} />
            </Box>
          ) : (
            <Box flexDirection="column">
              <Text bold color="white">EkkoJS Documentation</Text>
              <Text> </Text>
              <Text color="brightBlack">Pick a page on the left (↑↓, ⏎ to open/fold).</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

render(<App />);
