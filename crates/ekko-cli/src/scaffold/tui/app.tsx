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
import { readDir, readText } from "ekko:fs";

interface TNode {
  id: number;
  label: string;
  path: string;          
  isPage: boolean;
  body?: string;         
  children: TNode[];
}

let _nextId = 0;

function prettify(name: string): string {
  return name
    .replace(/^\d+[-_]/, "")            
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function firstHeading(md: string): string | null {
  for (const line of md.split("\n")) {
    const m = /^#\s+(.+?)\s*$/.exec(line);
    if (m) return m[1];
  }
  return null;
}

function buildTree(dir: string): TNode[] {
  const entries = readDir(dir)
    .filter((e: any) => e.isDirectory || e.name.endsWith(".md"))
    .sort((a: any, b: any) => (a.name < b.name ? -1 : 1));

  return entries.map((e: any) => {
    const path = dir + "/" + e.name;
    if (e.isDirectory) {
      return { id: _nextId++, label: prettify(e.name), path, isPage: false, children: buildTree(path) };
    }
    const body = readText(path);
    return { id: _nextId++, label: firstHeading(body) || e.name, path, isPage: true, body, children: [] };
  });
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

let ROOTS: TNode[] = [];
let LOAD_ERROR: string | null = null;
try {
  ROOTS = buildTree("docs");
} catch (err) {
  LOAD_ERROR = String((err as any)?.message || err);
}

interface VRow { node: TNode; depth: number; prefix: string; expandable: boolean; open: boolean; }
function computeVisible(expanded: Record<number, boolean>): VRow[] {
  const out: VRow[] = [];
  const walk = (node: TNode, depth: number, ancestorIsLast: boolean[]) => {
    let prefix = "";
    for (let k = 1; k < depth; k++) prefix += ancestorIsLast[k] ? "  " : "│ ";
    if (depth >= 1) prefix += ancestorIsLast[depth] ? "└─ " : "├─ ";

    const expandable = node.children.length > 0;
    const open = !!expanded[node.id];
    out.push({ node, depth, prefix, expandable, open });

    if (open && expandable) {
      for (let i = 0; i < node.children.length; i++) {
        walk(node.children[i], depth + 1, ancestorIsLast.concat(i === node.children.length - 1));
      }
    }
  };
  for (let i = 0; i < ROOTS.length; i++) walk(ROOTS[i], 0, [i === ROOTS.length - 1]);
  return out;
}

function App() {
  const { columns, rows } = useResize();
  const { exit } = useApp();

  
  const [expanded, setExpanded] = useState<Record<number, boolean>>(
    ROOTS.length ? { [ROOTS[0].id]: true } : {},
  );
  const [cur, setCur] = useState(0);          
  const [page, setPage] = useState<TNode | null>(null);
  const [scroll, setScroll] = useState(0);    
  const [hscroll, setHscroll] = useState(0);  
  const [navW, setNavW] = useState(clamp(Math.floor(columns * 0.34), 24, 46));

  useGlobalKey("q", () => exit());
  useGlobalKey("ctrl+c", () => exit());

  const leftW = clamp(navW, 18, Math.max(18, columns - 24));
  const rightW = Math.max(12, columns - leftW - 1);
  const bodyH = Math.max(3, rows - 1);      
  const viewH = Math.max(3, bodyH - 4);     
  const listH = Math.max(1, bodyH - 2);     
  const contentW = Math.max(10, rightW - 2);

  const visible = computeVisible(expanded);
  const ci = clamp(cur, 0, Math.max(0, visible.length - 1));

  const wrapped = page && page.body ? mdWrap(renderMarkdown(page.body), contentW) : [];
  const maxScroll = Math.max(0, wrapped.length - viewH);
  const sc = clamp(scroll, 0, maxScroll);

  let widest = 0;
  for (const l of wrapped) { const w = (l.text || "").length; if (w > widest) widest = w; }
  const hmax = Math.max(0, widest - contentW);
  const hsc = clamp(hscroll, 0, hmax);

  const toggle = (n: TNode) => setExpanded({ ...expanded, [n.id]: !expanded[n.id] });

  useInput((_key: any, ev: any) => {
    if (ev.key === "Esc") { exit(); return; }
    const big = Math.max(1, viewH - 2);

    if (ev.alt && ev.key === "Left")  { setNavW(clamp(leftW - 4, 18, columns - 24)); return; }
    if (ev.alt && ev.key === "Right") { setNavW(clamp(leftW + 4, 18, columns - 24)); return; }

    if (ev.key === "Up")        setCur(clamp(ci - 1, 0, visible.length - 1));
    else if (ev.key === "Down") setCur(clamp(ci + 1, 0, visible.length - 1));
    else if (ev.key === "Enter") {
      const v = visible[ci];
      if (!v) return;
      if (v.expandable) toggle(v.node);                 
      else if (v.node.isPage) { setPage(v.node); setScroll(0); setHscroll(0); }  
    } else if (ev.key === "Right") setHscroll(clamp(hsc + 10, 0, hmax)); 
    else if (ev.key === "Left")    setHscroll(clamp(hsc - 10, 0, hmax));
    else if (ev.char === "j") setScroll(clamp(sc + big, 0, maxScroll));
    else if (ev.char === "k") setScroll(clamp(sc - big, 0, maxScroll));
    else if (ev.char === "u") setScroll(clamp(sc + 2, 0, maxScroll));
    else if (ev.char === "i") setScroll(clamp(sc - 2, 0, maxScroll));
  }, { isGlobal: true });

  const first = ci >= listH ? ci - listH + 1 : 0;
  const win = visible.slice(first, first + listH);

  const posTag =
    (maxScroll > 0 ? (sc > 0 ? "  ↑" : "") + (sc < maxScroll ? "  ↓ more (j)" : "  (end)") : "") +
    (hmax > 0 ? "  ←→ " + hsc : "");

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      {}
      <Box height={1} width={columns} bg="blue" flexDirection="row">
        <Text bold color="white"> {{NAME}} docs </Text>
        <Spacer />
        <Text color="brightWhite"> ↑↓ move  ⏎ fold/open  j/k·u/i scroll  ←→ pan  q quit </Text>
      </Box>

      <Box flexDirection="row" flex={1}>
        {}
        <Box width={leftW} flexDirection="column" border borderStyle="round" borderColor="brightBlack">
          {LOAD_ERROR ? (
            <Text color="red">No docs.</Text>
          ) : visible.length === 0 ? (
            <Text color="brightBlack">No pages found.</Text>
          ) : (
            win.map((v, i) => {
              const isCur = (first + i) === ci;
              const marker = v.expandable ? (v.open ? "▾ " : "▸ ") : "";

              if (isCur) {
                const full = v.depth === 0
                  ? marker + v.node.label
                  : v.prefix + marker + v.node.label;
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
                    : <Text color="white">{v.node.label}</Text>}
                </Box>
              );
            })
          )}
        </Box>

        {}
        <Box width={rightW} flexDirection="column" padding={{ left: 1 }}>
          {LOAD_ERROR ? (
            <Box flexDirection="column">
              <Text bold color="red">Could not read ./docs</Text>
              <Text color="brightBlack">{LOAD_ERROR}</Text>
              <Text> </Text>
              <Text color="brightBlack">Run this app from the project folder: ekko run</Text>
            </Box>
          ) : page ? (
            <Box flexDirection="column">
              <Text color="brightBlack">{page.path}{posTag}</Text>
              <Text bold color="white">{page.label}</Text>
              <Text color="brightBlack">{"─".repeat(Math.min(contentW, 40))}</Text>
              <CodeView lines={wrapped} top={sc} height={viewH} left={hsc} width={contentW} />
            </Box>
          ) : (
            <Box flexDirection="column">
              <Text bold color="white">EkkoJS Documentation</Text>
              <Text> </Text>
              <Text color="brightBlack">Use ↑ / ↓ to move, Enter to fold a category</Text>
              <Text color="brightBlack">open, and Enter on a page to read it.</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

render(<App />);
