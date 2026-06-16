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
  render, Box, Text, Spacer, TextInput, SelectInput, Spinner,
  ProgressBar, Table, SplitPane, SyntaxText, Markdown, Terminal,
  useInput, useGlobalKey, useFocus, useResize, useTextInput,
  useApp, useDebounce, useDimensions,
  registerLanguage, theme,
} from "ekko:app/tui";

const RUST_CODE = `use std::collections::HashMap;

fn main() {
    let mut scores: HashMap<&str, i32> = HashMap::new();
    scores.insert("Alice", 42);
    scores.insert("Bob", 73);

    for (name, score) in &scores {
        println!("{}: {}", name, score);
    }
}`;

const JS_CODE = `import { render, Box, Text } from "ekko:app/tui";

function App() {
  const { columns, rows } = useResize();
  return (
    <Box width={columns} height={rows} border>
      <Text bold color="cyan">Hello TUI!</Text>
    </Box>
  );
}

render(<App />);`;

const MARKDOWN_CONTENT = `# EkkoJS TUI

A **terminal UI framework** built on React reconciler + Rust rendering.

## Features

- \`<Box>\` with **flexbox** layout (row/column, gap, padding)
- \`<Text>\` with *colors*, **bold**, *italic*, \`code\`
- \`<SyntaxText>\` with **dual-path** tokenization
- \`<Table>\` with auto column widths

## Architecture

\`\`\`rust
fn main() {
    println!("Rust + V8 + React");
}
\`\`\`

> The TUI runs on the main thread while V8 runs on a worker thread.

| Layer | Technology | Role |
|-------|-----------|------|
| Render | Rust + crossterm | Surface flush |
| Layout | JS flexbox | Box model |
| Components | React | State + UI |

---

Built with ❤ by [EkkoJS](https://ekkojs.dev)`;

const CRATE_DATA = [
  { crate: "ekko-core",    version: "0.1.0", tests: "184", status: "✓" },
  { crate: "ekko-tui",     version: "0.1.0", tests: "207", status: "✓" },
  { crate: "ekko-gui",     version: "0.1.0", tests: "222", status: "✓" },
  { crate: "ekko-cli",     version: "0.1.0", tests: "—",   status: "✓" },
  { crate: "ekko-vfs",     version: "0.1.0", tests: "18",  status: "✓" },
  { crate: "ekko-bindgen", version: "0.1.0", tests: "3",   status: "✓" },
];

const PAGES = [
  { label: "Dashboard",   value: "dashboard" },
  { label: "Components",  value: "components" },
  { label: "Text Styles", value: "text" },
  { label: "Code Viewer", value: "code" },
  { label: "Data Table",  value: "table" },
  { label: "Markdown",    value: "markdown" },
  { label: "Input Demo",  value: "input" },
  { label: "Layout Demo", value: "layout" },
];

registerLanguage("ini", {
  tokenize: function(line, state) {
    var tokens = [];
    if (line.match(/^\s*[;#]/)) {
      tokens.push({ start: 0, length: line.length, kind: "Comment" });
    } else if (line.match(/^\s*\[/)) {
      tokens.push({ start: 0, length: line.length, kind: "Keyword" });
    } else {
      var eq = line.indexOf("=");
      if (eq > 0) {
        tokens.push({ start: 0, length: eq, kind: "Type" });
        tokens.push({ start: eq, length: 1, kind: "Operator" });
        tokens.push({ start: eq + 1, length: line.length - eq - 1, kind: "String" });
      }
    }
    return { tokens: tokens, state: 0 };
  },
});

function DashboardPage() {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="white">⚡ Dashboard</Text>

      <Box flexDirection="row" gap={3}>
        <Box flexDirection="column">
          <Text color="brightBlack">Build progress</Text>
          <Box flexDirection="row" gap={1}>
            <ProgressBar value={0.87} width={20} color="green" />
            <Text color="green">87%</Text>
          </Box>
        </Box>
        <Box flexDirection="column">
          <Text color="brightBlack">Test coverage</Text>
          <Box flexDirection="row" gap={1}>
            <ProgressBar value={0.94} width={20} color="cyan" />
            <Text color="cyan">94%</Text>
          </Box>
        </Box>
      </Box>

      <Box flexDirection="row" gap={2}>
        <Spinner type="dots" color="cyan" />
        <Text color="brightBlack">Watching for changes...</Text>
      </Box>

      <Box flexDirection="row" gap={4}>
        <Box flexDirection="column">
          <Text bold color="brightBlack">Stats</Text>
          <Text>Tests:      <Text color="green">432</Text></Text>
          <Text>Platforms:  <Text color="cyan">3</Text></Text>
          <Text>Crates:     <Text color="yellow">6</Text></Text>
        </Box>
        <Box flexDirection="column">
          <Text bold color="brightBlack">Spinners</Text>
          <Box flexDirection="row" gap={2}>
            <Spinner type="dots" color="green" />
            <Spinner type="line" color="yellow" />
            <Spinner type="arc" color="cyan" />
            <Spinner type="star" color="magenta" />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function ComponentsPage() {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="white">📦 Components Overview</Text>

      <Box border borderStyle="single" borderColor="cyan" padding={1}>
        <Text color="cyan">Single border</Text>
      </Box>
      <Box border borderStyle="double" borderColor="yellow" padding={1}>
        <Text color="yellow">Double border</Text>
      </Box>
      <Box border borderStyle="round" borderColor="green" padding={1}>
        <Text color="green">Round border</Text>
      </Box>
      <Box border borderStyle="bold" borderColor="red" padding={1}>
        <Text color="red">Bold border</Text>
      </Box>

      <Box flexDirection="row" gap={1}>
        <ProgressBar value={0.0} width={8} color="red" />
        <ProgressBar value={0.25} width={8} color="yellow" />
        <ProgressBar value={0.5} width={8} color="cyan" />
        <ProgressBar value={0.75} width={8} color="green" />
        <ProgressBar value={1.0} width={8} color="white" />
      </Box>
    </Box>
  );
}

function TextStylesPage() {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="white">🎨 Text Styles</Text>

      <Text color="red">Red text</Text>
      <Text color="green">Green text</Text>
      <Text color="blue">Blue text</Text>
      <Text color="yellow">Yellow text</Text>
      <Text color="magenta">Magenta text</Text>
      <Text color="cyan">Cyan text</Text>

      <Text bold>Bold text</Text>
      <Text italic>Italic text</Text>
      <Text underline>Underline text</Text>
      <Text inverse>Inverse text</Text>
      <Text bold italic underline>Bold + Italic + Underline</Text>

      <Text color="brightRed">Bright red</Text>
      <Text color="brightGreen">Bright green</Text>
      <Text color="brightBlue">Bright blue</Text>
      <Text color="brightYellow">Bright yellow</Text>

      <Text color="#ff6600">RGB #ff6600</Text>
      <Text color="#00ccff">RGB #00ccff</Text>
      <Text color="#ff00ff">RGB #ff00ff</Text>
    </Box>
  );
}

function CodeViewerPage() {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="white">💻 Code Viewer — Dual-Path Tokenization</Text>

      <Text color="brightBlack">Rust (built-in Rust tokenizer via __tui_tokenize):</Text>
      <SyntaxText language="rust" code={RUST_CODE} showLineNumbers={true} />

      <Text color="brightBlack">JavaScript (built-in JS tokenizer):</Text>
      <SyntaxText language="javascript" code={JS_CODE} showLineNumbers={true} />

      <Text color="brightBlack">INI (custom JS tokenizer via registerLanguage):</Text>
      <SyntaxText language="ini" code={`[database]
; PostgreSQL connection
host = localhost
port = 5432
name = ekko_db

[server]
# HTTP settings
port = 8080
debug = true`} showLineNumbers={true} />
    </Box>
  );
}

function DataTablePage() {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="white">📊 Data Table</Text>
      <Table data={CRATE_DATA} />
    </Box>
  );
}

function MarkdownPage() {
  return (
    <Box flexDirection="column">
      <Text bold color="white">📝 Markdown Renderer</Text>
      <Markdown content={MARKDOWN_CONTENT} />
    </Box>
  );
}

function InputDemoPage() {
  const search = useTextInput({});
  const { isFocused } = useFocus({ id: "search-input" });

  useInput((key, event) => {
    if (isFocused) {
      if (event.key === "Backspace") search.backspace();
      else if (event.key === "Delete") search.delete();
      else if (event.key === "Left") search.moveCursor(-1);
      else if (event.key === "Right") search.moveCursor(1);
      else if (event.char && event.char.length === 1 && !event.ctrl && !event.alt) {
        search.insert(event.char);
      }
    }
  }, { isActive: true });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="white">⌨️  Input Demo</Text>

      <Box flexDirection="column">
        <Text color="brightBlack">Text Input (type to enter text):</Text>
        <Box border borderStyle={isFocused ? "round" : "single"}
             borderColor={isFocused ? "cyan" : "brightBlack"} padding={{ left: 1, right: 1 }}>
          <TextInput value={search.displayValue} placeholder="type here..."
                     color={isFocused ? "white" : "brightBlack"} />
        </Box>
        <Text color="brightBlack">Value: "<Text color="green">{search.value}</Text>" cursor: {search.cursor}</Text>
      </Box>

      <Box flexDirection="column">
        <Text color="brightBlack">Masked input (password):</Text>
        <Box border borderStyle="single" borderColor="brightBlack" padding={{ left: 1, right: 1 }}>
          <TextInput value={search.value} mask="●" placeholder="password" />
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text color="brightBlack">Select Input:</Text>
        <SelectInput items={[
          { label: "Option Alpha", value: "a" },
          { label: "Option Beta", value: "b" },
          { label: "Option Gamma", value: "c" },
          { label: "Option Delta", value: "d" },
        ]} selected={0} indicator="▸" />
      </Box>
    </Box>
  );
}

function LayoutDemoPage() {
  const { columns } = useResize();
  const halfW = Math.floor((columns - 6) / 2);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="white">📐 Layout Demo</Text>

      <Text color="brightBlack">Horizontal split (SplitPane):</Text>
      <SplitPane direction="row" ratio={0.4}>
        <Box border borderStyle="round" borderColor="cyan" padding={1}>
          <Text color="cyan">Left pane (40%)</Text>
        </Box>
        <Box border borderStyle="round" borderColor="green" padding={1}>
          <Text color="green">Right pane (60%)</Text>
        </Box>
      </SplitPane>

      <Text color="brightBlack">Flex row with Spacer:</Text>
      <Box flexDirection="row" border borderStyle="single" borderColor="brightBlack">
        <Text color="red"> Left </Text>
        <Spacer />
        <Text color="green"> Center </Text>
        <Spacer />
        <Text color="blue"> Right </Text>
      </Box>

      <Text color="brightBlack">Nested boxes with gap:</Text>
      <Box flexDirection="row" gap={1}>
        <Box border borderStyle="single" borderColor="red" padding={1} width={halfW}>
          <Box flexDirection="column">
            <Text color="red">Box A</Text>
            <Text color="brightBlack">Nested content</Text>
          </Box>
        </Box>
        <Box border borderStyle="single" borderColor="blue" padding={1} width={halfW}>
          <Box flexDirection="column">
            <Text color="blue">Box B</Text>
            <Text color="brightBlack">Nested content</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function Sidebar({ currentPage, onSelect }) {
  const { isFocused } = useFocus({ id: "sidebar", autoFocus: true });

  return (
    <Box flexDirection="column" border borderStyle="round"
         borderColor={isFocused ? "cyan" : "brightBlack"}>
      <Box padding={{ left: 1 }}>
        <Text bold color="cyan"> ☰ Menu </Text>
      </Box>
      <SelectInput items={PAGES} selected={currentPage} onSelect={onSelect} indicator="▸" />
      <Spacer />
      <Box padding={{ left: 1 }}>
        <Text color="brightBlack" dimmed> Ctrl+Q quit</Text>
      </Box>
    </Box>
  );
}

function StatusBar({ page }) {
  const { columns } = useResize();
  const label = PAGES[page] ? PAGES[page].label : "";

  return (
    <Box height={1} width={columns} bg="brightBlack" flexDirection="row">
      <Text color="black" bold> EkkoJS TUI </Text>
      <Text color="black"> │ {label} </Text>
      <Spacer />
      <Text color="black"> Tab: focus │ Ctrl+Q: quit </Text>
    </Box>
  );
}

function App() {
  const { columns, rows } = useResize();
  const { exit } = useApp();
  const currentPage = 0;

  useGlobalKey("ctrl+q", () => exit());
  useGlobalKey("ctrl+c", () => exit());

  const views = [
    DashboardPage,
    ComponentsPage,
    TextStylesPage,
    CodeViewerPage,
    DataTablePage,
    MarkdownPage,
    InputDemoPage,
    LayoutDemoPage,
  ];

  const View = views[currentPage] || DashboardPage;

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Box height={1} width={columns} bg="blue" flexDirection="row">
        <Text bold color="white"> ⚡ EkkoJS TUI Demo </Text>
        <Text color="brightWhite"> — {columns}×{rows} </Text>
        <Spacer />
        <Text color="brightWhite"> M22 Complete </Text>
      </Box>

      <Box flexDirection="row" flex={1}>
        <Box width={20}>
          <Sidebar currentPage={currentPage} onSelect={() => {}} />
        </Box>
        <Box flex={1} padding={{ left: 1, top: 1 }}>
          <View />
        </Box>
      </Box>

      <StatusBar page={currentPage} />
    </Box>
  );
}

render(<App />);
