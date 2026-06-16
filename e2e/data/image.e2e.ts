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

const PNG_1x1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const seedBytes = base64.decode(PNG_1x1);

t.group("works under default-deny (pure compute)");
t.notThrows("decode with no --allow", () => { const i = image.decode(seedBytes); i.close(); });

t.group("decode + header-only info");
const im0 = image.decode(seedBytes);
t.eq("1x1 decoded width", im0.width, 1);
t.eq("1x1 decoded height", im0.height, 1);
const info0 = image.info(seedBytes);
t.eq("info width matches decode", info0.width, im0.width);
t.eq("info format is png", info0.format, "png");
im0.close();

const seed = image.decode(seedBytes).resize(16, 12);
t.eq("resize exact width", seed.width, 16);
t.eq("resize exact height", seed.height, 12);
t.type("colorType is a string", seed.colorType, "string");

t.group("encode round-trip per shipped format");
const FORMATS = ["png", "jpeg", "gif", "bmp", "ico", "tiff", "pnm", "tga", "qoi", "farbfeld", "hdr", "exr", "webp"];
for (const f of FORMATS) {
  const bytes = seed.encode(f, { quality: 85 });
  t.gt(`${f} encodes non-empty`, bytes.length, 0);
  const back = f === "tga" ? image.decode(bytes, "tga") : image.decode(bytes); 
  t.eq(`${f} round-trip width`, back.width, 16);
  t.eq(`${f} round-trip height`, back.height, 12);
  back.close();
}

t.group("transforms (dimension math)");
t.check("thumbnail fits box", seed.thumbnail(8, 8).width <= 8);
t.eq("crop dims", (() => { const c = seed.crop(0, 0, 8, 6); return c.width * 100 + c.height; })(), 806);
t.eq("rotate90 swaps w/h", (() => { const r = seed.rotate90(); return r.width * 100 + r.height; })(), 1216);
t.eq("rotate180 keeps w/h", (() => { const r = seed.rotate180(); return r.width * 100 + r.height; })(), 1612);
t.eq("rotate270 swaps w/h", (() => { const r = seed.rotate270(); return r.width * 100 + r.height; })(), 1216);
t.eq("flipHorizontal keeps width", seed.flipHorizontal().width, 16);
t.eq("flipVertical keeps height", seed.flipVertical().height, 12);
t.eq("grayscale keeps dims", seed.grayscale().width, 16);
t.eq("blur keeps dims", seed.blur(1.5).width, 16);
t.eq("brighten keeps dims", seed.brighten(20).width, 16);
t.gt("toBytes returns raw pixels", seed.toBytes().length, 0);

t.group("chaining + convert");
const chained = seed.resize(40, 40).grayscale().rotate90().encode("png");
t.gt("chained pipeline encodes", chained.length, 0);
t.eq("chained result is 40x40", image.info(chained).width, 40);
const webp = image.convert(seedBytes, "webp");
t.gt("convert png->webp non-empty", webp.length, 0);
t.eq("converted format is webp", image.info(webp).format, "webp");

seed.close();
t.done("ekko:image covered");
