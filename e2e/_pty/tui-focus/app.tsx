// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { render, Box, Text, useFocus, useInput, useApp } from "ekko:app/tui";

function Item({ id, label }: { id: string; label: string }) {
  const { isFocused } = useFocus({ id, autoFocus: id === "a" });
  return <Text>{label + (isFocused ? "_FOCUSED" : "_blur")}</Text>;
}

function App() {
  const { exit } = useApp();
  useInput((key: string, event: any) => {
    if (key === "q" || (event && event.char === "q")) exit();
  });
  return (
    <Box flexDirection="column" border>
      <Item id="a" label="ITEMA" />
      <Item id="b" label="ITEMB" />
    </Box>
  );
}

render(<App />);
