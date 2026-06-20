// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "@ekko/react";
import {
  DockHost, addOrFocusTab,
  Button, Card, Switch, Slider, Select, Checkbox, Alert,
} from "@ekko/asgard";

export function ssr() {
  return { title: "Asgard Workspace, built with EkkoJS" };
}

function Pane({ children }: { children?: any }) {
  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
      {children}
    </div>
  );
}

function ButtonPreview() {
  return (
    <Pane>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Button>Primary</Button>
        <Button variant="outlined">Outlined</Button>
        <Button type="success">Success</Button>
        <Button type="error">Error</Button>
        <Button size="small">Small</Button>
        <Button disabled>Disabled</Button>
      </div>
    </Pane>
  );
}

function CardPreview() {
  return (
    <Pane>
      <Card variant="filled" type="info" elevation={1}>
        <h3 style={{ marginTop: 0 }}>Info card</h3>
        <p style={{ margin: 0 }}>A filled Card with elevation, used to group related content.</p>
      </Card>
      <Card variant="outlined" hoverable>
        <strong>Hoverable outlined card</strong>
      </Card>
    </Pane>
  );
}

function SwitchPreview() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  return (
    <Pane>
      <Switch checked={a} onChange={setA} label="Notifications" />
      <Switch checked={b} onChange={setB} label="Beta features" type="success" />
    </Pane>
  );
}

function SliderPreview() {
  const [v, setV] = useState(40);
  return (
    <Pane>
      <p style={{ margin: 0 }}>Value: <strong>{v}</strong></p>
      <Slider value={v} onChange={setV} min={0} max={100} />
    </Pane>
  );
}

function SelectPreview() {
  const [v, setV] = useState("nord");
  return (
    <Pane>
      <Select
        value={v}
        onChange={setV}
        options={[
          { value: "nord", label: "Nord" },
          { value: "dracula", label: "Dracula" },
          { value: "tokyoNight", label: "Tokyo Night" },
        ]}
      />
      <p style={{ margin: 0 }}>Selected: <strong>{v}</strong></p>
    </Pane>
  );
}

function CheckboxPreview() {
  const [c, setC] = useState(true);
  const [d, setD] = useState(false);
  return (
    <Pane>
      <Checkbox checked={c} onChange={setC} label="I agree to the terms" />
      <Checkbox checked={d} onChange={setD} label="Subscribe to updates" type="success" />
    </Pane>
  );
}

function AlertPreview() {
  return (
    <Pane>
      <Alert severity="success" title="It works">Your changes were saved.</Alert>
      <Alert severity="info">A neutral, informational message.</Alert>
      <Alert severity="warning" title="Heads up">Storage is almost full.</Alert>
      <Alert severity="error" title="Error">Something went wrong.</Alert>
    </Pane>
  );
}

const COMPONENTS = [
  { id: "button", title: "Button", preview: <ButtonPreview /> },
  { id: "card", title: "Card", preview: <CardPreview /> },
  { id: "switch", title: "Switch", preview: <SwitchPreview /> },
  { id: "slider", title: "Slider", preview: <SliderPreview /> },
  { id: "select", title: "Select", preview: <SelectPreview /> },
  { id: "checkbox", title: "Checkbox", preview: <CheckboxPreview /> },
  { id: "alert", title: "Alert", preview: <AlertPreview /> },
];

function WelcomePane() {
  return (
    <div style={{ padding: 28, lineHeight: 1.7, maxWidth: 580 }}>
      <h2 style={{ marginTop: 0 }}>Asgard component workspace</h2>
      <p>
        Pick a component from the <strong>Components</strong> panel on the left to open it in a tab. Drag a
        tab to reorder it, or drop it on a pane's edge to split the workspace, the same interaction model as
        a code editor.
      </p>
      <p style={{ opacity: 0.65 }}>
        Built with <code>@ekko/asgard</code>'s docking system (<code>DockHost</code>) over ekko:rune SSR.
      </p>
    </div>
  );
}

function ComponentMenu({ onPick }: { onPick: (c: typeof COMPONENTS[number]) => void }) {
  return (
    <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 2 }}>
      {COMPONENTS.map((c) => (
        <button
          key={c.id}
          onClick={() => onPick(c)}
          style={{
            textAlign: "left", padding: "7px 10px", borderRadius: 6, border: "1px solid transparent",
            background: "transparent", color: "inherit", cursor: "pointer", font: "inherit",
          }}
          onMouseEnter={(e: any) => { e.currentTarget.style.background = "rgba(127,127,127,0.12)"; }}
          onMouseLeave={(e: any) => { e.currentTarget.style.background = "transparent"; }}
        >
          {c.title}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [layout, setLayout] = useState<any>({
    id: "main",
    tabs: [{ id: "welcome", title: "Welcome", content: <WelcomePane />, closable: false }],
    activeTabId: "welcome",
  });

  function openComponent(c: typeof COMPONENTS[number]) {
    setLayout((l: any) => addOrFocusTab(l, { id: c.id, title: c.title, content: c.preview }));
  }

  return (

    
    
    <div className="container" style={{ paddingTop: 16, paddingBottom: 16 }}>
      <div style={{ height: "calc(100vh - 168px)", minHeight: 420, position: "relative", overflow: "hidden", contain: "layout paint size", border: "1px solid var(--border, #232a2e)", borderRadius: 12 }}>
        {mounted ? (
          <DockHost
            layout={layout}
            onLayoutChange={setLayout}
            leftPanelHeader={<span style={{ fontWeight: 700, letterSpacing: ".05em", fontSize: ".78rem" }}>COMPONENTS</span>}
            leftPanelContent={<ComponentMenu onPick={openComponent} />}
            leftPanelWidth={210}
            showLeftSideBar={false}
            showRightSideBar={false}
            showRightPanel={false}
          />
        ) : (
          <div style={{ height: "100%", display: "grid", placeItems: "center", opacity: 0.6 }}>Loading workspace…</div>
        )}
      </div>
    </div>
  );
}
