# Terminal UIs

The **`ekko:app/tui`** module lets you build rich terminal interfaces with a
component model. Under the hood it is a React style reconciler driven by **Rust**
and **crossterm**, so layout and input are fast and portable.

## A first component

```tsx
import { Box, Text } from "ekko:app/tui";

export function App() {
  return (
    <Box flexDirection="column">
      <Text bold>EkkoJS Terminal UI</Text>
      <Text>Press q to quit.</Text>
    </Box>
  );
}
```

Run a TUI app from its project folder with:

```bash
ekko run
```

## Components

- **`<Box>`** is the layout primitive. It arranges children with flexbox style
  props like `flexDirection`, `gap`, and `padding`.
- **`<Text>`** renders styled text. It supports `bold`, `italic`, and `color`.
- **`<SelectInput>`** presents a list the user can move through and choose from.

## Hooks

| Hook         | Purpose                                  |
| ------------ | ---------------------------------------- |
| `useInput`   | React to keypresses                       |
| `useResize`  | Re-layout when the terminal size changes  |
| `useApp`     | Access app controls such as `exit()`      |

## Handling input

```tsx
import { Box, Text, useInput, useApp } from "ekko:app/tui";

export function App() {
  const { exit } = useApp();
  useInput((key) => {
    if (key === "q") exit();
  });
  return (
    <Box>
      <Text>Press q to quit.</Text>
    </Box>
  );
}
```

> The component you are reading this in is itself a TUI app. The menu on the left
> is a `<SelectInput>`, and these pages are rendered by the built in markdown
> renderer.
