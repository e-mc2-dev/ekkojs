// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { render, Box, Text, useInput, useApp } from "ekko:app/tui";

function App() {
  const { exit } = useApp();
  useInput((key: string, event: any) => {
    if (key === "q" || (event && event.char === "q") || (event && event.ctrl && key === "c")) exit();
  });
  return (
    <Box border>
      <Text bold color="cyan">HELLO_TUI_SMOKE</Text>
    </Box>
  );
}

render(<App />);
