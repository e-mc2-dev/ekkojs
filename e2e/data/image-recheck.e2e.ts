// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



import * as image from "ekko:image";
import { base64 } from "ekko:text/encoding";
import { asserter } from "../_harness.ts";

const t = asserter();
const PNG = base64.decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
const seed = () => image.decode(PNG).resize(20, 16);

t.group("edge dimensions");
const one = image.decode(PNG); 
t.eq("1x1 width", one.width, 1);
t.gt("1x1 encodes to png", one.encode("png").length, 0);
t.eq("1x1 round-trips", image.info(one.encode("png")).width, 1);
const up = one.resize(1024, 1).encode("png"); 
t.eq("1024x1 extreme aspect", image.info(up).width, 1024);
one.close();
const s = seed();
t.eq("crop to 1x1", s.crop(0, 0, 1, 1).width, 1);

t.group("out-of-bounds crop clamps (no crash)");
t.notThrows("crop beyond bounds is clamped", () => { const c = s.crop(10, 10, 1000, 1000); c.close(); });

t.group("lifecycle: idempotent close + use-after-close");
t.notThrows("double close is a no-op", () => { const a = image.decode(PNG); a.close(); a.close(); });
t.throws("transform after close throws", () => { const z = image.decode(PNG); z.close(); z.resize(2, 2); }, /closed/i);
t.throws("encode after close throws", () => { const z = image.decode(PNG); z.close(); z.encode("png"); }, /closed/i);

t.group("handle pressure (no leak/crash over many handles)");
let okCount = 0;
for (let i = 0; i < 250; i++) {
  const im = image.decode(PNG).resize((i % 30) + 1, (i % 20) + 1);
  if (im.width === (i % 30) + 1) okCount++;
  im.close();
}
t.eq("250 decode/transform/close cycles", okCount, 250);

t.group("info / decode parity (formats WITH magic bytes)");
for (const f of ["png", "jpeg", "webp", "bmp", "gif", "tiff", "qoi"]) {
  const bytes = s.encode(f, { quality: 90 });
  const info = image.info(bytes);
  const dec = image.decode(bytes);
  t.eq(`${f}: info.width == decode.width`, info.width, dec.width);
  t.eq(`${f}: info.format == ${f}`, info.format, f);
  dec.close();
}

t.group("raw bytes integrity");
const rb = s.toBytes();
const px = s.width * s.height;
t.eq("toBytes length is a whole number of channels", rb.length % px, 0);
t.gte("toBytes has >=1 channel per pixel", rb.length / px, 1);
t.check("toBytes channels in 1..=8", rb.length / px <= 8);

s.close();
t.done("ekko:image recheck");
