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
  render, Box, Text, Spacer, SelectInput, TextInput, Spinner, ProgressBar,
  Table, SyntaxText, Modal,
  useState, useEffect, useInput, useGlobalKey, useResize, useApp,
} from "ekko:app/tui";

const SELECT_ITEMS = [{ label: "Minimal" }, { label: "Web server" }, { label: "CLI tool" }];

interface Ctx { open: boolean; focused: boolean; text: string; selIdx: number }

function LoadingBar(props: { width: number }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), 90);
    return () => clearInterval(id);   
  }, []);
  const seg = 5;
  const span = props.width + seg;
  const pos = frame % span;
  let bar = "";
  for (let i = 0; i < props.width; i++) bar += (i >= pos - seg && i < pos) ? "█" : "░";
  return <Text color="cyan">{bar}</Text>;
}

function LayoutScreen() {
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Box + Text + Spacer</Text>
      <Text> </Text>
      <Box flexDirection="row">
        {}
        <Box border borderStyle="round" borderColor="green" width={11} padding={{ left: 1 }}><Text color="green">round</Text></Box>
        <Box border borderStyle="double" borderColor="magenta" width={12} padding={{ left: 1 }}><Text color="magenta">double</Text></Box>
        <Box border borderStyle="bold" borderColor="yellow" width={10} padding={{ left: 1 }}><Text color="yellow">bold</Text></Box>
      </Box>
      <Text> </Text>
      <Box flexDirection="row" width={40}>
        <Text color="brightBlack">left</Text>
        <Spacer />
        <Text color="brightBlack">Spacer pushes these apart</Text>
      </Box>
    </Box>
  );
}

function TextScreen() {
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Colours and styles</Text>
      <Text> </Text>
      <Box flexDirection="row">
        <Text color="red">red </Text><Text color="green">green </Text><Text color="yellow">yellow </Text>
        <Text color="blue">blue </Text><Text color="magenta">magenta </Text><Text color="cyan">cyan</Text>
      </Box>
      <Box flexDirection="row">
        <Text bold>bold </Text><Text dim>dim </Text><Text italic>italic </Text>
        <Text underline>underline </Text><Text inverse> inverse </Text>
      </Box>
    </Box>
  );
}

function InputsScreen({ ctx }: { ctx: Ctx }) {
  
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    if (!ctx.focused) return;
    const id = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(id);
  }, [ctx.focused]);
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">TextInput + SelectInput</Text>
      <Text> </Text>
      <Text color={ctx.focused ? "green" : "brightBlack"}>
        {ctx.focused ? "Focused: type to edit, ↑↓ move the list, Esc back to nav" : "Press Tab to focus this panel, then the widgets are live"}
      </Text>
      <Text> </Text>
      <Box flexDirection="row">
        <Text color="brightBlack">name  </Text>
        <TextInput value={ctx.text} placeholder="type here…" />
        {ctx.focused ? <Text inverse={blink}> </Text> : <Text> </Text>}
      </Box>
      <Text> </Text>
      <SelectInput selected={ctx.selIdx} items={SELECT_ITEMS} />
    </Box>
  );
}

function FeedbackScreen() {
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Spinner + ProgressBar</Text>
      <Text> </Text>
      <Box flexDirection="row">
        <Spinner type="dots" /><Text> dots   </Text>
        <Spinner type="line" /><Text> line   </Text>
        <Spinner type="arc" /><Text> arc</Text>
      </Box>
      <Text> </Text>
      <Box flexDirection="row"><ProgressBar value={0.25} width={24} /><Text>  25%</Text></Box>
      <Box flexDirection="row"><ProgressBar value={0.6} width={24} color="cyan" /><Text>  60%</Text></Box>
      <Box flexDirection="row"><ProgressBar value={1} width={24} color="green" /><Text>  done</Text></Box>
      <Text> </Text>
      <Box flexDirection="row"><LoadingBar width={24} /><Text>  loading… (indeterminate)</Text></Box>
    </Box>
  );
}

function TableScreen() {
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Table</Text>
      <Text> </Text>
      <Table
        columns={[{ key: "name", header: "Name" }, { key: "lang", header: "Language" }, { key: "stars", header: "Stars" }]}
        data={[
          { name: "ekko", lang: "Rust", stars: "1.2k" },
          { name: "asgard", lang: "TypeScript", stars: "340" },
          { name: "rune", lang: "TypeScript", stars: "210" },
        ]}
      />
    </Box>
  );
}

function CodeScreen() {
  const code = [
    'import { render, Box, Text } from "ekko:app/tui";',
    "",
    "function App() {",
    "  return <Box border><Text bold>Hello</Text></Box>;",
    "}",
    "render(<App />);",
  ].join("\n");
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">SyntaxText</Text>
      <Text> </Text>
      <SyntaxText code={code} language="typescript" />
    </Box>
  );
}

function ModalScreen(ctx: Ctx) {
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Modal</Text>
      <Text> </Text>
      <Text color={ctx.focused ? "green" : "brightBlack"}>
        {ctx.focused ? "Press m to toggle the modal, Esc to close" : "Tab to focus this panel, then press m"}
      </Text>
      <Modal open={ctx.open} title="Confirm" width={34} height={5}>
        <Text>Apply these changes?</Text>
        <Box flexDirection="row"><Text color="green">Enter</Text><Text color="brightBlack"> yes   </Text><Text color="green">Esc</Text><Text color="brightBlack"> cancel</Text></Box>
      </Modal>
    </Box>
  );
}

const SCREENS = [
  { label: "Layout",        render: (_: Ctx) => <LayoutScreen /> },
  { label: "Text & colour", render: (_: Ctx) => <TextScreen /> },
  { label: "Inputs",        render: (c: Ctx) => <InputsScreen ctx={c} /> },
  { label: "Feedback",      render: (_: Ctx) => <FeedbackScreen /> },
  { label: "Table",         render: (_: Ctx) => <TableScreen /> },
  { label: "Code",          render: (_: Ctx) => <CodeScreen /> },
  { label: "Modal",         render: (c: Ctx) => ModalScreen(c) },
];

function App() {
  const { columns, rows } = useResize();
  const { exit } = useApp();
  const [cur, setCur] = useState(0);
  const [paneFocus, setPaneFocus] = useState(false);   
  const [modalOpen, setModalOpen] = useState(false);
  const [text, setText] = useState("");
  const [selIdx, setSelIdx] = useState(0);

  useGlobalKey("ctrl+c", () => exit());

  useInput((_key: any, ev: any) => {
    if (ev.key === "Tab") { setPaneFocus(!paneFocus); return; }
    if (modalOpen) { if (ev.key === "Esc" || ev.char === "m") setModalOpen(false); return; }

    if (!paneFocus) {
      
      if (ev.char === "q" || ev.key === "Esc") { exit(); return; }
      if (ev.key === "Up")        setCur((cur + SCREENS.length - 1) % SCREENS.length);
      else if (ev.key === "Down") setCur((cur + 1) % SCREENS.length);
      return;
    }

    if (ev.key === "Esc") { setPaneFocus(false); return; }
    const label = SCREENS[cur].label;
    if (label === "Inputs") {
      if (ev.key === "Up")             setSelIdx((selIdx + SELECT_ITEMS.length - 1) % SELECT_ITEMS.length);
      else if (ev.key === "Down")      setSelIdx((selIdx + 1) % SELECT_ITEMS.length);
      else if (ev.key === "Backspace") setText(text.slice(0, -1));
      else if (ev.char && !ev.ctrl && !ev.alt && ev.char.length === 1) setText(text + ev.char);
    } else if (label === "Modal" && ev.char === "m") {
      setModalOpen(true);
    }
  }, { isGlobal: true });

  const navW = 18;
  const ctx: Ctx = { open: modalOpen, focused: paneFocus, text, selIdx };

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      {}
      <Box height={1} width={columns} bg="blue" flexDirection="row">
        <Text bold color="white"> {{NAME}} · ekko:app/tui showcase </Text>
        <Spacer />
        <Text color="brightWhite"> {paneFocus ? "PANEL" : "NAV"}  Tab switch · {paneFocus ? "type/↑↓ test widget" : "↑↓ screen"} · q quit </Text>
      </Box>

      <Box flexDirection="row" flex={1}>
        {}
        <Box width={navW} flexDirection="column" border borderStyle="round" borderColor={paneFocus ? "brightBlack" : "cyan"} padding={{ left: 1 }}>
          <SelectInput selected={cur} items={SCREENS.map((s) => ({ label: s.label }))} />
        </Box>

        {}
        <Box flex={1} flexDirection="column" border borderStyle="round" borderColor={paneFocus ? "cyan" : "brightBlack"} padding={{ left: 1 }}>
          {SCREENS[cur].render(ctx)}
        </Box>
      </Box>
    </Box>
  );
}

render(<App />);
