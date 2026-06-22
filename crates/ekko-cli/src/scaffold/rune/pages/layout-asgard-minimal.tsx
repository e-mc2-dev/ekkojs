// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import "../styles/global.scss"; 
import { useEffect } from "@ekko/react";
import { ThemeProvider, ThemeCssVars, themes } from "@ekko/asgard";
import { mimir } from "ekko:rune/mimir";
import { Link } from "ekko:rune/router";

function SessionBridge() {
  useEffect(() => {
    mimir.session("domain");
  }, []);
  return null;
}

const theme = {
  ...themes.githubDark,
  accent: { primary: "#3dd6a8", primaryHover: "rgba(61, 214, 168, 0.16)", primaryActive: "#2bbf93", secondary: "#5aecc4" },
};

export default function RootLayout({ children }: { children?: any }) {
  return (
    <ThemeProvider theme={theme}>
      <ThemeCssVars />
      <div className="app-shell">
        <SessionBridge />
        <header className="site-header">
          <div className="container bar">
            <Link href="/" className="brand">
              <img src="/assets/ekko-icon-rounded.svg" alt="logo" />
              <span>Rune App</span>
            </Link>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="container bar">
            <span>Built with EkkoJS Rune + Asgard</span>
            <a href="https://ekkojs.com" target="_blank" rel="noreferrer">ekkojs.com</a>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
