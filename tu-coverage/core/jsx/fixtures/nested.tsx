// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

export function App() {
    const items = ["a", "b", "c"];
    return <div>
        <header><h1>App</h1></header>
        <main>
            <ul>
                {items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        </main>
    </div>;
}
