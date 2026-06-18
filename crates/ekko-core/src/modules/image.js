// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



((ops) => {
  const reg = new FinalizationRegistry((handle) => { try { ops.free(handle); } catch (_) {  } });

  function wrap(handle) {
    const p = ops.props(handle); 
    const img = Object.create(ImageProto);
    img._h = handle;
    img._closed = false;
    img.width = p.width;
    img.height = p.height;
    img.colorType = p.colorType;
    reg.register(img, handle, img);
    return img;
  }

  const open = (img) => {
    if (img._closed) throw new Error("image handle is closed");
    return img._h;
  };

  const ImageProto = {
    resize(width, height, filter) {
      return wrap(ops.resize(open(this), width >>> 0, height >>> 0, filter || "lanczos3", true));
    },
    resizeFit(width, height, filter) {
      return wrap(ops.resize(open(this), width >>> 0, height >>> 0, filter || "lanczos3", false));
    },
    thumbnail(width, height) {
      return wrap(ops.thumbnail(open(this), width >>> 0, height >>> 0));
    },
    crop(x, y, width, height) {
      return wrap(ops.crop(open(this), x >>> 0, y >>> 0, width >>> 0, height >>> 0));
    },
    rotate90() { return wrap(ops.rotate(open(this), 90)); },
    rotate180() { return wrap(ops.rotate(open(this), 180)); },
    rotate270() { return wrap(ops.rotate(open(this), 270)); },
    flipHorizontal() { return wrap(ops.flip(open(this), true)); },
    flipVertical() { return wrap(ops.flip(open(this), false)); },
    grayscale() { return wrap(ops.grayscale(open(this))); },
    blur(sigma) { return wrap(ops.blur(open(this), Number(sigma) || 0)); },
    brighten(value) { return wrap(ops.brighten(open(this), value | 0)); },
    toBytes() { return ops.toBytes(open(this)); },
    encode(format, opts) {
      const q = opts && opts.quality != null ? (opts.quality >>> 0) : undefined;
      return ops.encode(open(this), String(format), q);
    },
    close() {
      if (this._closed) return;
      this._closed = true;
      reg.unregister(this);
      ops.free(this._h);
    },
  };

  const info = (bytes) => ops.infoBytes(bytes);

  const decode = (bytes, formatHint) => wrap(ops.decode(bytes, formatHint));

  const convert = (bytes, to, opts) => {
    const im = decode(bytes);
    try { return im.encode(to, opts); }
    finally { im.close(); }
  };

  return { info, convert, decode };
})
