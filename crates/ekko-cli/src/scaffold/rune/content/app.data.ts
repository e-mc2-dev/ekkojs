// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



export interface FeatureEntry {
  title: string;
  body: string;
}

export const appData: {
  entries: Record<string, FeatureEntry>;
  nav: { slug: string; title: string }[];
} = {
  entries: {
    ssr: {
      title: "Server-side rendering",
      body:
        "Every static route that exports an ssr() function is rendered to HTML on the server and cached, so " +
        "the first byte the browser receives is real content. Great for link previews and search engines, and " +
        "there is no spinner-then-content flash. After that first paint, the page becomes a fast client app and " +
        "navigation never re-hits the server.",
    },
    mimir: {
      title: "Mimir state",
      body:
        "State lives in atoms, keyed strings that sit outside the component tree, so a value survives navigation " +
        "with no prop drilling. The server can seed an atom before the first render (the counter and the server " +
        "clock on the home page do exactly that), and with a session an atom can be mirrored to IndexedDB so it " +
        "survives a full reload.",
    },
    routing: {
      title: "Routing",
      body:
        "The folder is the router: pages/about.tsx becomes /about, [param] is a dynamic segment, and (group) " +
        "folders are stripped from the URL. On the client, useRouter() gives you the path, params, query, and " +
        "navigate, and <Link> swaps pages in place with no reload. You can also register one cached route per " +
        "data item, which is how this template renders each feature.",
    },
    permissions: {
      title: "Secure by default",
      body:
        "Capabilities are denied until you grant them. An EkkoJS app touches only the files, hosts, and " +
        "environment variables you allow, and each grant is scoped, so the whole surface is auditable in one " +
        "place. You decide what the app can reach, nothing is implicit.",
    },
  },
  nav: [
    { slug: "ssr", title: "Server-side rendering" },
    { slug: "mimir", title: "Mimir state" },
    { slug: "routing", title: "Routing" },
    { slug: "permissions", title: "Secure by default" },
  ],
};
