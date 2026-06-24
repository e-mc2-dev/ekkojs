// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import { exec } from "ekko:process";
import { writeText, mkdir, remove, exists } from "ekko:fs";
import { asserter } from "../_harness";

const t = asserter();
const EKKO = Ekko.args[0];
const ROOT = "_wsmtest";
const MEMBER = ROOT + "/app";

function out(r: any): string { return String((r && (r.stdout || "")) + "\n" + (r && (r.stderr || ""))); }

try { if (exists(ROOT)) remove(ROOT, { recursive: true } as any); } catch {}
mkdir(MEMBER + "/src");
writeText(ROOT + "/ekko.json", JSON.stringify({
  workspace: { members: ["app"], map: { "@wsm/app": "app" } },
  permissions: { fs: true },
}));
const memberManifest = (perms: any) => JSON.stringify({
  name: "@wsm/app", version: "1.0.0", type: "run", entry: "main.ts", ...(perms ? { permissions: perms } : {}),
});
writeText(MEMBER + "/ekko.json", memberManifest({ env: true }));

writeText(MEMBER + "/main.ts", `try { Ekko.env.get("PATH"); console.log("ENV_OK"); } catch (e) { console.log("ENV_DENIED"); }`);

t.group("build --client — root guard vs member-scoped");
const bRoot: any = await exec(EKKO, ["build", "--client"], { cwd: ROOT });
t.ne("build --client at root → non-zero exit (not silent exit-0)", bRoot.exitCode, 0);
t.check("root error names the member requirement", /workspace member|members:/i.test(out(bRoot)));

const bMember: any = await exec(EKKO, ["build", "--client"], { cwd: MEMBER });
t.check("build --client from member is member-scoped (announces the member, not silent)",
  /@wsm\/app|Building client bundle/i.test(out(bMember)) && !/must target a workspace member/i.test(out(bMember)));

t.group("add <pkg> — root guard");
const aRoot: any = await exec(EKKO, ["add", "somepkg-xyz"], { cwd: ROOT });
t.ne("add <pkg> at root → non-zero exit", aRoot.exitCode, 0);
t.check("add root error guides to a member", /workspace member|cd <member>|members:/i.test(out(aRoot)));

t.group("run — member-owning permissions");
const rGranted: any = await exec(EKKO, ["run", "main.ts"], { cwd: MEMBER });
t.check("member declares env → env.get allowed", /ENV_OK/.test(out(rGranted)));

writeText(MEMBER + "/ekko.json", memberManifest(null));
const rDenied: any = await exec(EKKO, ["run", "main.ts"], { cwd: MEMBER });
t.check("member declares NO perms → env.get denied (deny-by-default)", /ENV_DENIED/.test(out(rDenied)));

t.group("dev — full trust doctrine");
const devHelp: any = await exec(EKKO, ["dev", "--help"], {});
t.check("dev --help documents full trust + --allow override", /full trust/i.test(out(devHelp)) && /--allow/.test(out(devHelp)));

try { remove(ROOT, { recursive: true } as any); } catch {}
t.done("workspace member tooling (52534568 + 306)");
