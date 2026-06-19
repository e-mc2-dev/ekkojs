# TypeScript Out of the Box

EkkoJS treats **TypeScript** as a native input format. There is no separate
compiler to install and no emitted output to manage. You edit `.ts`, you run
`.ts`.

## How it works

When you run a TypeScript file, EkkoJS hands the source to **SWC**, a Rust based
transpiler, which strips and lowers the types in process. The resulting
JavaScript flows straight into V8.

```ts
interface User {
  id: number;
  name: string;
  active: boolean;
}

function describe(u: User): string {
  return `${u.name} (#${u.id}) is ${u.active ? "active" : "inactive"}`;
}

console.log(describe({ id: 7, name: "Grace", active: true }));
```

## What you get

- *Type annotations* on variables, parameters, and return values.
- **Interfaces**, **type aliases**, **enums**, and **generics**.
- Modern syntax like optional chaining and nullish coalescing.

## Type checking versus running

Transpilation removes types but does not *check* them at run time. Think of the
two jobs separately:

1. Running your code is instant and ignores type errors.
2. Type checking is an editor and CI concern using your `tsconfig.json`.

> EkkoJS runs your code even if the type checker would complain. This keeps the
> inner loop fast. Use your editor for the red squiggles.

## JSX and TSX

`.tsx` files are supported for building user interfaces, including the terminal
UI framework:

```tsx
import { Box, Text } from "ekko:app/tui";

export function Hello() {
  return (
    <Box>
      <Text>Rendered from a .tsx file</Text>
    </Box>
  );
}
```
