// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import box from "./fixtures/box.module.scss";
import card from "./fixtures/card.module.scss";
import proto from "./fixtures/proto.module.scss";
import plain from "./fixtures/plain.module.css";   
import { asserter } from "../_harness";

const t = asserter();

t.group("scoping — names are rewritten, deterministic, local-suffixed");
t.ok("default export is the class map", box && typeof box === "object");
t.ne("class name is scoped (not raw)", (box as any).box.split(" ")[0], "box");
t.check("scoped name keeps the local suffix ([hash]_[local])", /_box$/.test((box as any).box.split(" ")[0]));
t.check("title scoped too", /_title$/.test((card as any).title));

t.group("composes — same-file folds into a space-joined class string");
{
  const v = (box as any).box as string;            
  const baseScoped = (box as any).base as string;  
  t.check("box value is two space-joined names", v.split(/\s+/).length === 2);
  t.check("box composes the scoped base name", v.split(/\s+/).includes(baseScoped));
}

t.group(".module.css parity — plain CSS modules scope without a SCSS step (313)");
t.ok("default export is the class map", plain && typeof plain === "object");
t.check("card scoped", /_card$/.test((plain as any).card));
t.check("title scoped", /_title$/.test((plain as any).title));
t.ne("plain.module.css .title ≠ card.module.scss .title (distinct files)",
  (plain as any).title.split(" ")[0], (card as any).title.split(" ")[0]);

t.group("two distinct files — same class name does NOT collide");
t.ne("box.module.scss .box ≠ card.module.scss .box",
  (box as any).box.split(" ")[0], (card as any).box.split(" ")[0]);

t.group("SECURITY — proto-key safety (class named __proto__ / constructor)");
{

  const ownProto = Object.prototype.hasOwnProperty.call(proto, "__proto__");
  t.check("__proto__ is an OWN property on the map", ownProto);
  t.eq("its value is the scoped string, not the prototype object",
    typeof (Object.getOwnPropertyDescriptor(proto, "__proto__")?.value), "string");
  t.eq("Object.prototype not polluted", ({} as any).__proto__ === Object.prototype, true);
  t.ne("constructor key is a scoped string", typeof (proto as any).constructor === "string" ? "ok" : "bad", "bad");
  t.check("box still scopes normally alongside proto keys", /_box$/.test((proto as any).box.split(" ")[0]));
}

t.group("SECURITY — cross-file composes is rejected (no silent drop / no FS reach)");
await t.rejects("composes from \"./other.css\" → error",
  () => import("./fixtures/crossfile.module.scss"), /composes|cross-file|not supported/i);

t.group("DoS guard (recheck) — pathological module CSS errors, never crashes the runtime");
await t.rejects("deeply nested module scss → contained error",
  () => import("./fixtures/deep.module.scss"), /nesting|denial|css|module/i);

t.done("css-import-modules");
