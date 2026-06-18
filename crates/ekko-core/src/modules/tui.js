// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

(function(ops) {
  
  var BORDER_CHARS = {
    single: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" },
    double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
    round:  { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" },
    bold:   { tl: "┏", tr: "┓", bl: "┗", br: "┛", h: "━", v: "┃" },
  };

  function createNode(type, props) {
    return {
      type: type,
      props: props || {},
      children: [],
      layout: { x: 0, y: 0, width: 0, height: 0 },
      parent: null,
    };
  }

  function parsePadding(p) {
    if (!p) return { top: 0, right: 0, bottom: 0, left: 0 };
    if (typeof p === "number") return { top: p, right: p, bottom: p, left: p };
    return { top: p.top || 0, right: p.right || 0, bottom: p.bottom || 0, left: p.left || 0 };
  }

  function parseMargin(m) {
    return parsePadding(m);
  }

  function computeLayout(node, x, y, availW, availH) {
    var props = node.props || {};
    var margin = parseMargin(props.margin);
    var padding = parsePadding(props.padding);
    var border = props.border ? 1 : 0;
    var gap = props.gap || 0;

    x += margin.left;
    y += margin.top;
    availW -= margin.left + margin.right;
    availH -= margin.top + margin.bottom;

    var w = resolveSize(props.width, availW, availW);
    var h = resolveSize(props.height, availH, availH);

    if (props.position === "absolute") {
      if (typeof props.x === "number") x = props.x;
      if (typeof props.y === "number") y = props.y;
    }

    node.layout.x = x;
    node.layout.y = y;
    node.layout.width = w;
    node.layout.height = h;

    if (node.type === "tui-text") return;

    var innerX = x + padding.left + border;
    var innerY = y + padding.top + border;
    var innerW = w - padding.left - padding.right - border * 2;
    var innerH = h - padding.top - padding.bottom - border * 2;
    if (innerW < 0) innerW = 0;
    if (innerH < 0) innerH = 0;

    var dir = props.flexDirection || "column";
    var children = node.children;
    if (!children.length) return;

    var flexTotal = 0;
    var fixedUsed = 0;
    var flexChildren = [];

    for (var i = 0; i < children.length; i++) {
      var cp = children[i].props || {};
      if (cp.position === "absolute") continue;
      if (cp.flex) {
        flexTotal += cp.flex;
        flexChildren.push(i);
      } else {
        var cw = dir === "row"
          ? resolveSize(cp.width, innerW, 0)
          : innerW;
        var ch = dir === "column"
          ? resolveSize(cp.height, innerH, 0)
          : innerH;
        if (children[i].type === "tui-text") {
          var text = getTextContent(children[i]);
          if (dir === "row") { if (!cw) cw = textWidth(text); ch = ch || 1; }
          else { if (!ch) ch = 1; cw = cw || innerW; }
        } else if (children[i].type === "tui-box" && !ch) {
          ch = intrinsicHeight(children[i]);
        }
        fixedUsed += (dir === "row" ? cw : ch);
      }
      if (i > 0) fixedUsed += gap;
    }

    var flexSpace = Math.max(0, (dir === "row" ? innerW : innerH) - fixedUsed);

    var cx = innerX;
    var cy = innerY;
    var flexUsed = 0;
    var lastFlexIdx = flexChildren.length > 0 ? flexChildren[flexChildren.length - 1] : -1;

    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      var cp = child.props || {};
      var cw, ch;

      if (cp.position === "absolute") {
        var size = ops.getSize ? ops.getSize() : { columns: availW, rows: availH };
        computeLayout(child, 0, 0, size.columns, size.rows);
        continue;
      }

      if (cp.flex) {
        var share;
        if (i === lastFlexIdx) {
          share = flexSpace - flexUsed;
        } else {
          share = flexTotal > 0 ? Math.floor((cp.flex / flexTotal) * flexSpace) : 0;
          flexUsed += share;
        }
        if (dir === "row") { cw = share; ch = innerH; }
        else { cw = innerW; ch = share; }
      } else {
        cw = dir === "row" ? resolveSize(cp.width, innerW, 0) : innerW;
        ch = dir === "column" ? resolveSize(cp.height, innerH, 0) : innerH;
        if (child.type === "tui-text") {
          var text = getTextContent(child);
          if (dir === "row") { if (!cw) cw = textWidth(text); ch = ch || 1; }
          else { if (!ch) ch = 1; cw = cw || innerW; }
        } else if (child.type === "tui-box" && !ch) {
          ch = intrinsicHeight(child);
        }
      }

      computeLayout(child, cx, cy, cw, ch);

      if (dir === "row") cx += child.layout.width + gap;
      else cy += child.layout.height + gap;
    }
  }

  function intrinsicHeight(node) {
    var props = node.props || {};
    var padding = parsePadding(props.padding);
    var border = props.border ? 1 : 0;
    var gap = props.gap || 0;
    var dir = props.flexDirection || "column";
    var children = node.children || [];
    if (!children.length) return border * 2 + padding.top + padding.bottom;
    var h = 0;
    for (var i = 0; i < children.length; i++) {
      var cp = children[i].props || {};
      var ch = resolveSize(cp.height, 0, 0);
      if (children[i].type === "tui-text") ch = ch || 1;
      else if (children[i].type === "tui-box") ch = ch || intrinsicHeight(children[i]);
      if (dir === "column") { h += ch; if (i > 0) h += gap; }
      else { if (ch > h) h = ch; }
    }
    return h + border * 2 + padding.top + padding.bottom;
  }

  function resolveSize(val, available, fallback) {
    if (val === undefined || val === null) return fallback;
    if (typeof val === "number") return val;
    if (typeof val === "string" && val.endsWith("%")) {
      return Math.floor(available * parseInt(val, 10) / 100);
    }
    return fallback;
  }

  function textWidth(s) {
    var w = 0;
    var chars = Array.from(s);
    for (var i = 0; i < chars.length; i++) {
      var cw = ops.unicodeWidth ? ops.unicodeWidth(chars[i]) : 1;
      w += cw;
    }
    return w;
  }

  function getTextContent(node) {
    if (typeof node.props.children === "string") return node.props.children;
    if (Array.isArray(node.props.children)) return node.props.children.join("");
    if (node.children.length) {
      return node.children.map(function(c) {
        if (typeof c === "string") return c;
        if (c.type === "tui-text") return getTextContent(c);
        return "";
      }).join("");
    }
    return "";
  }

  var _scroll = null;
  function setScroll(offsetY, regionX, regionY, regionW, regionH) {
    if (!offsetY) { _scroll = null; return; }
    _scroll = { offsetY: offsetY, x: regionX || 0, y: regionY || 0, w: regionW || 9999, h: regionH || 9999 };
  }

  function generateCells(node) {
    var cells = [];
    generateNodeCells(node, cells);
    if (_scroll && _scroll.offsetY) {
      var s = _scroll;
      var filtered = [];
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        var inRegion = c.x >= s.x && c.x < s.x + s.w && c.y >= s.y && c.y < s.y + s.h;
        if (inRegion) {
          var adjY = c.y - s.offsetY;
          if (adjY >= s.y && adjY < s.y + s.h) {
            filtered.push({ x: c.x, y: adjY, ch: c.ch, fg: c.fg, bg: c.bg, style: c.style });
          }
        } else {
          filtered.push(c);
        }
      }
      return filtered;
    }
    return cells;
  }

  function generateNodeCells(node, cells, inheritBg) {
    var l = node.layout;
    var p = node.props || {};
    var nodeBg = p.bg || inheritBg || null;

    if (node.type === "tui-box" && p.border) {
      generateBorderCells(node, cells, nodeBg);
    }

    if (node.type === "tui-box" && nodeBg) {
      var b = p.border ? 1 : 0;
      for (var y = b; y < l.height - b; y++) {
        for (var x = b; x < l.width - b; x++) {
          cells.push({ x: l.x + x, y: l.y + y, ch: " ", fg: "default", bg: nodeBg, style: "" });
        }
      }
    }

    if (node.type === "tui-text") {
      var text = getTextContent(node);
      var fg = p.color || p.fg || "default";
      var bg = p.bg || inheritBg || "default";
      var style = "";
      if (p.bold) style += "bold";
      if (p.italic) style += (style ? "," : "") + "italic";
      if (p.underline) style += (style ? "," : "") + "underline";
      if (p.inverse || p.reverse) style += (style ? "," : "") + "reverse";

      var cx = l.x;
      var chars = Array.from(text);
      for (var i = 0; i < chars.length && cx < l.x + l.width; i++) {
        cells.push({ x: cx, y: l.y, ch: chars[i], fg: fg, bg: bg, style: style });
        var cw = ops.unicodeWidth ? ops.unicodeWidth(chars[i]) : 1;
        cx += cw;
      }
      return;
    }

    for (var i = 0; i < node.children.length; i++) {
      generateNodeCells(node.children[i], cells, nodeBg);
    }
  }

  function generateBorderCells(node, cells, inheritBg) {
    var l = node.layout;
    var p = node.props || {};
    var chars = BORDER_CHARS[p.borderStyle] || BORDER_CHARS.single;
    var fg = p.borderColor || p.fg || "default";
    var bg = "default";

    cells.push({ x: l.x, y: l.y, ch: chars.tl, fg: fg, bg: bg, style: "" });
    cells.push({ x: l.x + l.width - 1, y: l.y, ch: chars.tr, fg: fg, bg: bg, style: "" });
    cells.push({ x: l.x, y: l.y + l.height - 1, ch: chars.bl, fg: fg, bg: bg, style: "" });
    cells.push({ x: l.x + l.width - 1, y: l.y + l.height - 1, ch: chars.br, fg: fg, bg: bg, style: "" });

    for (var x = 1; x < l.width - 1; x++) {
      cells.push({ x: l.x + x, y: l.y, ch: chars.h, fg: fg, bg: bg, style: "" });
      cells.push({ x: l.x + x, y: l.y + l.height - 1, ch: chars.h, fg: fg, bg: bg, style: "" });
    }
    for (var y = 1; y < l.height - 1; y++) {
      cells.push({ x: l.x, y: l.y + y, ch: chars.v, fg: fg, bg: bg, style: "" });
      cells.push({ x: l.x + l.width - 1, y: l.y + y, ch: chars.v, fg: fg, bg: bg, style: "" });
    }
  }

  var hostConfig = {
    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,

    createInstance: function(type, props) {
      return createNode(type, props);
    },
    createTextInstance: function(text) {
      var node = createNode("tui-text", { children: text });
      return node;
    },
    appendInitialChild: function(parent, child) {
      child.parent = parent;
      parent.children.push(child);
    },
    appendChild: function(parent, child) {
      child.parent = parent;
      parent.children.push(child);
    },
    removeChild: function(parent, child) {
      var idx = parent.children.indexOf(child);
      if (idx >= 0) parent.children.splice(idx, 1);
      child.parent = null;
    },
    insertBefore: function(parent, child, before) {
      child.parent = parent;
      var idx = parent.children.indexOf(before);
      if (idx >= 0) parent.children.splice(idx, 0, child);
      else parent.children.push(child);
    },
    appendChildToContainer: function(container, child) {
      child.parent = container;
      container.children.push(child);
    },
    removeChildFromContainer: function(container, child) {
      var idx = container.children.indexOf(child);
      if (idx >= 0) container.children.splice(idx, 1);
      child.parent = null;
    },
    insertInContainerBefore: function(container, child, before) {
      child.parent = container;
      var idx = container.children.indexOf(before);
      if (idx >= 0) container.children.splice(idx, 0, child);
      else container.children.push(child);
    },
    prepareUpdate: function(instance, type, oldProps, newProps) {
      return newProps;
    },
    commitUpdate: function(instance, updatePayload) {
      instance.props = updatePayload;
    },
    commitTextUpdate: function(textInstance, oldText, newText) {
      textInstance.props.children = newText;
    },
    finalizeInitialChildren: function() { return false; },
    getPublicInstance: function(inst) { return inst; },
    prepareForCommit: function() { return null; },
    resetAfterCommit: function() {
      if (_root) {
        var size = ops.getSize();
        computeLayout(_root, 0, 0, size.columns, size.rows);
        var cells = generateCells(_root);
        ops.sendCells(JSON.stringify(cells));
      }
    },
    getChildHostContext: function(ctx) { return ctx; },
    getRootHostContext: function() { return {}; },
    shouldSetTextContent: function() { return false; },
    clearContainer: function(container) { container.children = []; },
    scheduleTimeout: globalThis.setTimeout,
    cancelTimeout: globalThis.clearTimeout,
    noTimeout: -1,
    isPrimaryRenderer: true,
    getCurrentEventPriority: function() { return 16; },
    getInstanceFromNode: function() { return null; },
    beforeActiveInstanceBlur: function() {},
    afterActiveInstanceBlur: function() {},
    prepareScopeUpdate: function() {},
    getInstanceFromScope: function() { return null; },
    detachDeletedInstance: function() {},
  };

  var _reconciler = null;
  var _container = null;
  var _root = null;
  var _rootElement = null;
  var _eventCallback = null;

  function getReconciler() {
    if (_reconciler) return _reconciler;
    try {
      _reconciler = null;
      if (!_reconciler) {
        var Reconciler = require("react-reconciler");
        _reconciler = Reconciler.default ? Reconciler.default(hostConfig) : Reconciler(hostConfig);
      }
    } catch(e) {
      _reconciler = createMinimalReconciler(hostConfig);
    }
    return _reconciler;
  }

  function createMinimalReconciler(config) {
    return {
      createContainer: function(root) { return { root: root, current: null }; },
      updateContainer: function(element, container) {
        container.root.children = [];
        if (element && element.type) {
          var inst = mountElement(element, config);
          config.appendChildToContainer(container.root, inst);
        }
        config.resetAfterCommit();
      },
    };
  }

  function flattenChildren(children) {
    if (children === undefined || children === null || children === false) return [];
    if (!Array.isArray(children)) return [children];
    var result = [];
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) {
        var flat = flattenChildren(c);
        for (var j = 0; j < flat.length; j++) result.push(flat[j]);
      } else {
        result.push(c);
      }
    }
    return result;
  }

  function mountElement(element, config) {
    if (typeof element === "string" || typeof element === "number") {
      return config.createTextInstance(String(element));
    }
    if (!element || !element.type) return config.createTextInstance("");

    var type = element.type;
    if (typeof type === "function") {
      var prevScope = _hookScope;
      var prevIdx = _hookIdx;
      var name = type.name || "anon";
      var scopeKey = prevScope + "/" + name;
      _scopeCounter[scopeKey] = (_scopeCounter[scopeKey] || 0) + 1;
      _hookScope = scopeKey + ":" + _scopeCounter[scopeKey];
      _hookIdx = 0;
      var rendered = type(element.props || {});
      _hookScope = prevScope;
      _hookIdx = prevIdx;
      return mountElement(rendered, config);
    }

    var props = element.props || {};
    var node = config.createInstance(type, props);

    if (type === "tui-text") return node;

    var children = flattenChildren(props.children);
    for (var i = 0; i < children.length; i++) {
      var childInst = mountElement(children[i], config);
      config.appendInitialChild(node, childInst);
    }
    return node;
  }

  function render(element) {
    if (!ops.recvEvent || !ops.sendCells) {
      console.error("ekko:app/tui error: TUI bridge not available. Use 'ekko tui run' instead of 'ekko run'.");
      if (typeof Ekko !== "undefined" && Ekko.exit) Ekko.exit(1);
      return;
    }
    _root = createNode("tui-root", {});
    _rootElement = element;
    var reconciler = getReconciler();
    _container = reconciler.createContainer(_root, 0, null, false, null, "", null, null);
    try { reconciler.updateContainer(element, _container, null, null); }
    catch(e) { console.error("ekko:app/tui render error:", e && e.message ? e.message : e, e && e.stack ? e.stack : ""); }

    setInterval(function() { _animFrame++; if (_hasSpinners) scheduleRender(); }, 80);

    return _eventLoop();
  }

  async function _eventLoop() {
    while (true) {
      var e = await ops.recvEvent();
      if (e === null || e === undefined) break;
      if (typeof e === "string") { if (e === "null") break; try { e = JSON.parse(e); } catch(_) { continue; } }
      if (e.type === "resize") { scheduleRender(); continue; }
      dispatchInput(e);
    }
  }

  function onInput(fn) { _eventCallback = fn; }

  var _theme = {
    Plain: "default", Keyword: "magenta", Type: "cyan", String: "green",
    Number: "yellow", Comment: "brightBlack", Operator: "default",
    Punctuation: "default", Identifier: "default", Function: "blue",
    Preprocessor: "yellow", Heading: "cyan", Bold: "white",
    Italic: "brightCyan", BoldItalic: "brightCyan", Link: "blue", CodeSpan: "green",
  };

  function setTheme(t) { for (var k in t) _theme[k] = t[k]; }

  var _jsTokenizers = {};
  function registerLanguage(name, tokenizer) { _jsTokenizers[name.toLowerCase()] = tokenizer; }

  var _focusId = null;
  var _focusOrder = [];
  var _focusGroups = {};
  var _focusItemGroup = {};
  var _globalKeys = {};

  var focusManager = {
    getFocus: function() { return _focusId; },
    setFocus: function(id) { _focusId = id; scheduleRender(); },
    getGroup: function(id) { return _focusItemGroup[id || _focusId] || null; },
    getOrder: function() { return _focusOrder.slice(); },
    cycle: function(dir) { cycleFocus(dir || 1); scheduleRender(); },
  };

  function registerFocusable(id, group) {
    if (_focusOrder.indexOf(id) < 0) _focusOrder.push(id);
    if (group) _focusItemGroup[id] = group;
  }
  function unregisterFocusable(id) { var i = _focusOrder.indexOf(id); if (i >= 0) _focusOrder.splice(i, 1); }
  function setFocus(id) { _focusId = id; }
  function getFocusId() { return _focusId; }

  function cycleFocus(dir) {
    if (!_focusOrder.length) return;
    var idx = _focusOrder.indexOf(_focusId);
    if (idx < 0) idx = 0;
    else idx = (idx + dir + _focusOrder.length) % _focusOrder.length;
    _focusId = _focusOrder[idx];
  }

  function dispatchInput(event) {
    if (event.type === "key") {
      for (var combo in _globalKeys) {
        if (matchCombo(combo, event)) { _globalKeys[combo](event); return; }
      }
      if (event.key === "Tab" && !event.ctrl && !event.alt) {
        cycleFocus(event.shift ? -1 : 1);
        scheduleRender();
        return;
      }
    }
    for (var i = 0; i < _inputHandlers.length; i++) {
      var h = _inputHandlers[i];
      if (h.isGlobal || !h.focusId || h.focusId === _focusId) {
        h.handler(event.key || event.char, event);
      }
    }
  }

  function matchCombo(combo, event) {
    var parts = combo.toLowerCase().split("+");
    var key = parts[parts.length - 1];
    var needCtrl = parts.indexOf("ctrl") >= 0;
    var needAlt = parts.indexOf("alt") >= 0;
    var needShift = parts.indexOf("shift") >= 0;
    var evChar = event.char || "";
    
    if (evChar.length === 1 && evChar.charCodeAt(0) >= 1 && evChar.charCodeAt(0) <= 26) {
      evChar = String.fromCharCode(evChar.charCodeAt(0) + 96);
    }
    var evKey = (evChar || event.key || "").toLowerCase();
    return evKey === key && !!event.ctrl === needCtrl && !!event.alt === needAlt && !!event.shift === needShift;
  }

  var _hookStore = {};
  var _hookScope = "root";
  var _hookIdx = 0;
  var _scopeCounter = {};

  var _renderScheduled = false;
  function scheduleRender() {
    if (_renderScheduled) return;
    _renderScheduled = true;
    Promise.resolve().then(function() {
      _renderScheduled = false;
      if (_root && _container && _rootElement) {
        _hookScope = "root";
        _hookIdx = 0;
        _scopeCounter = {};
        _inputHandlers = [];
        _focusOrder = [];
        _focusItemGroup = {};
        _hasSpinners = false;
        var rec = getReconciler();
        try { rec.updateContainer(_rootElement, _container, null, null); }
        catch(e) { console.error("ekko:app/tui render error:", e && e.message ? e.message : e); }
      }
    });
  }

  function useState(init) {
    var key = _hookScope + ":" + (_hookIdx++);
    if (_hookStore[key] === undefined) _hookStore[key] = typeof init === "function" ? init() : init;
    var val = _hookStore[key];
    return [val, function(v) {
      _hookStore[key] = typeof v === "function" ? v(_hookStore[key]) : v;
      scheduleRender();
    }];
  }

  function useEffect(fn, deps) {
    var key = _hookScope + ":" + (_hookIdx++);
    if (_hookStore[key] === undefined) {
      _hookStore[key] = true;
      var cleanup = fn();
      if (typeof cleanup === "function") _hookStore[key + ":cleanup"] = cleanup;
    }
  }
  function useRef(init) {
    var key = _hookScope + ":" + (_hookIdx++);
    if (_hookStore[key] === undefined) _hookStore[key] = { current: init };
    return _hookStore[key];
  }
  function useCallback(fn, deps) { return fn; }

  var _inputHandlers = [];

  function useInput(handler, opts) {
    var focusId = opts && opts.focusId;
    var isGlobal = opts && opts.isGlobal;
    _inputHandlers.push({ handler: handler, focusId: focusId, isGlobal: !!isGlobal });
  }

  function useGlobalKey(combo, handler) { _globalKeys[combo] = handler; }

  function useFocus(opts) {
    var id = (opts && opts.id) || ("focus-" + Math.random().toString(36).slice(2, 8));
    var group = opts && opts.group;
    registerFocusable(id, group);
    if (opts && opts.autoFocus && !_focusId) _focusId = id;
    var myGroup = group || _focusItemGroup[id];
    var focusGroup = _focusId ? (_focusItemGroup[_focusId] || null) : null;
    return {
      isFocused: _focusId === id,
      groupFocused: myGroup ? myGroup === focusGroup : false,
      focus: function() { _focusId = id; scheduleRender(); },
      blur: function() { if (_focusId === id) { _focusId = null; scheduleRender(); } },
      id: id,
    };
  }

  function useResize() {
    var size = ops.getSize();
    return { columns: size.columns, rows: size.rows };
  }

  function useDimensions(ref) {
    if (ref && ref.current && ref.current.layout) {
      var l = ref.current.layout;
      return { width: l.width, height: l.height, x: l.x, y: l.y };
    }
    return { width: 0, height: 0, x: 0, y: 0 };
  }

  function useDebounce(value, ms) {
    var st = useState(value); var debounced = st[0]; var setDebounced = st[1];
    var timerRef = useRef(null);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(function() {
      setDebounced(value);
      timerRef.current = null;
    }, ms || 300);
    return debounced;
  }

  function useTextInput(opts) {
    var st = useState(""); var value = st[0]; var setValue = st[1];
    var cs = useState(0); var cursor = cs[0]; var setCursor = cs[1];
    var mask = opts && opts.mask;

    return {
      value: value,
      cursor: cursor,
      insert: function(ch) {
        var nv = value.slice(0, cursor) + ch + value.slice(cursor);
        setValue(nv);
        var w = ops.unicodeWidth ? ops.unicodeWidth(ch) : 1;
        setCursor(cursor + 1);
      },
      backspace: function() {
        if (cursor > 0) {
          setValue(value.slice(0, cursor - 1) + value.slice(cursor));
          setCursor(cursor - 1);
        }
      },
      delete: function() {
        if (cursor < value.length) {
          setValue(value.slice(0, cursor) + value.slice(cursor + 1));
        }
      },
      moveCursor: function(delta) {
        setCursor(Math.max(0, Math.min(value.length, cursor + delta)));
      },
      clear: function() { setValue(""); setCursor(0); },
      displayValue: mask ? value.replace(/./g, mask) : value,
    };
  }

  function useApp() {
    var size = ops.getSize();
    return {
      exit: function() {
        if (ops.sendCells) {
          ops.sendCells("__quit__");
        }
        if (typeof Ekko !== "undefined" && Ekko.exit) Ekko.exit(0);
      },
      columns: size.columns,
      rows: size.rows,
    };
  }

  function useStdout() {
    return {
      write: function(text) {
        if (ops.sendCells) {
          ops.sendCells(JSON.stringify({ __stdout: text }));
        }
      },
    };
  }

  function _jsx(type, props) {
    return { type: type, props: props || {} };
  }

  function Box(props) {
    return _jsx("tui-box", props);
  }
  function Text(props) {
    return _jsx("tui-text", props);
  }
  function Spacer() {
    return _jsx("tui-box", { flex: 1 });
  }

  function FocusGroup(props) {
    var id = props.id;
    var children = props.children;
    var boxProps = {};
    if (props.flex) boxProps.flex = props.flex;
    if (props.width) boxProps.width = props.width;
    if (props.height) boxProps.height = props.height;
    if (props.flexDirection) boxProps.flexDirection = props.flexDirection;
    if (props.padding) boxProps.padding = props.padding;
    if (props.gap) boxProps.gap = props.gap;
    if (props.border) { boxProps.border = props.border; boxProps.borderStyle = props.borderStyle || "single"; boxProps.borderColor = props.borderColor || "brightBlack"; }
    if (props.bg) boxProps.bg = props.bg;
    if (id) _focusGroups[id] = true;
    boxProps.children = children;
    return _jsx("tui-box", boxProps);
  }

  function FocusItem(props) {
    var id = props.id;
    var group = props.group;
    var focus = useFocus({ id: id, group: group, autoFocus: props.autoFocus });
    var children = props.children;
    var boxProps = {};
    if (props.flex) boxProps.flex = props.flex;
    if (props.width) boxProps.width = props.width;
    if (props.height) boxProps.height = props.height;
    if (props.flexDirection) boxProps.flexDirection = props.flexDirection || "column";
    if (props.padding) boxProps.padding = props.padding;
    if (props.bg) boxProps.bg = props.bg;
    boxProps.border = props.border !== undefined ? props.border : true;
    boxProps.borderStyle = props.borderStyle || "round";
    boxProps.borderColor = focus.isFocused
      ? (props.focusColor || "cyan")
      : (props.borderColor || "brightBlack");
    boxProps.children = children;
    return _jsx("tui-box", boxProps);
  }

  function Modal(props) {
    if (!props.open) return _jsx("tui-box", { width: 0, height: 0 });
    var size = useResize();
    var w = props.width || 50;
    var h = props.height || 16;
    var x = typeof props.x === "number" ? props.x : Math.floor((size.columns - w) / 2);
    var y = typeof props.y === "number" ? props.y : Math.floor((size.rows - h) / 2);
    var borderColor = props.borderColor || "cyan";
    var bgColor = props.bg || "#111122";
    var title = props.title || "";
    var closable = props.onClose ? true : false;
    var bc = BORDER_CHARS[props.borderStyle || "round"] || BORDER_CHARS.round;

    var inner = w - 2;
    var titleStr = title ? " " + title + " " : "";
    var closeStr = closable ? " [X] " : "";

    var modalId = props.id || "modal";
    var focus = useFocus({ id: modalId });
    _focusId = modalId;

    var closeXStart = x + w - closeStr.length - 1;
    useInput(function(_key, e) {
      if (e.key === "Esc" && props.onClose) props.onClose();
      if (e.type === "mouse" && e.button === "Left" && e.pressed && closable) {
        if (e.y === y && e.x >= closeXStart && e.x < closeXStart + closeStr.length) {
          props.onClose();
        }
      }
    }, { focusId: modalId });
    var fillLen = inner - titleStr.length - closeStr.length;
    if (fillLen < 0) fillLen = 0;
    var topLine = bc.tl + bc.h + titleStr + bc.h.repeat(Math.max(0, fillLen - 1)) + closeStr + bc.tr;
    var bottomLine = bc.bl + bc.h.repeat(inner) + bc.br;
    var emptyLine = bc.v + " ".repeat(inner) + bc.v;

    var children = [
      _jsx("tui-box", { flex: 1, padding: 1, flexDirection: "column", children: props.children }),
      _jsx("tui-text", { position: "absolute", x: x + 2, y: y, children: " " + title + " ", color: borderColor, bold: true, bg: "default" }),
    ];
    if (closable) {
      children.push(_jsx("tui-text", { position: "absolute", x: x + w - closeStr.length - 1, y: y, children: closeStr, color: "red", bold: true, bg: "default" }));
    }

    return _jsx("tui-box", {
      position: "absolute", x: x, y: y, width: w, height: h,
      border: true, borderStyle: props.borderStyle || "round", borderColor: borderColor,
      bg: bgColor, flexDirection: "column",
      children: children,
    });
  }

  function TextInput(props) {
    var val = props.value || "";
    var display = props.mask ? val.replace(/./g, props.mask) : val;
    var placeholder = !val && props.placeholder ? props.placeholder : "";
    var text = display || placeholder;
    return _jsx("tui-text", {
      children: text,
      color: display ? (props.color || "default") : "brightBlack",
    });
  }

  function SelectInput(props) {
    var items = props.items || [];
    var selected = props.selected || 0;
    var children = items.map(function(item, i) {
      var indicator = i === selected ? (props.indicator || "❯") : " ";
      var label = item.label || item;
      return _jsx("tui-text", {
        children: indicator + " " + label,
        color: i === selected ? "cyan" : "default",
        bold: i === selected,
      });
    });
    return _jsx("tui-box", { flexDirection: "column", children: children });
  }

  var SPINNER_FRAMES = {
    dots: ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"],
    line: ["-","\\","|","/"],
    arc: ["◜","◠","◝","◞","◡","◟"],
    star: ["✶","✸","✹","✺","✹","✷"],
  };

  var _animFrame = 0;

  var _hasSpinners = false;

  function Spinner(props) {
    _hasSpinners = true;
    var type = props.type || "dots";
    var frames = SPINNER_FRAMES[type] || SPINNER_FRAMES.dots;
    var frame = (typeof props._frame === "number" ? props._frame : _animFrame) % frames.length;
    return _jsx("tui-text", { children: frames[frame], color: props.color || "cyan" });
  }

  function ProgressBar(props) {
    var value = Math.max(0, Math.min(1, props.value || 0));
    var width = props.width || 20;
    var filled = Math.round(value * width);
    var empty = width - filled;
    var filledChar = props.filled || "█";
    var emptyChar = props.empty || "░";
    var bar = filledChar.repeat(filled) + emptyChar.repeat(empty);
    return _jsx("tui-text", { children: bar, color: props.color || "green" });
  }

  function Table(props) {
    var data = props.data || [];
    var columns = props.columns;
    if (!columns && data.length) columns = Object.keys(data[0]).map(function(k) { return { key: k, header: k }; });
    if (!columns) return _jsx("tui-text", { children: "(empty table)" });

    var colWidths = columns.map(function(col) {
      var maxW = (col.header || col.key).length;
      data.forEach(function(row) {
        var v = String(row[col.key] || "");
        if (v.length > maxW) maxW = v.length;
      });
      return maxW;
    });

    var children = [];
    
    var headerRow = columns.map(function(col, ci) {
      return padRight(col.header || col.key, colWidths[ci]);
    }).join(" │ ");
    children.push(_jsx("tui-text", { children: "│ " + headerRow + " │", bold: true }));
    
    var sep = colWidths.map(function(w) { return "─".repeat(w); }).join("─┼─");
    children.push(_jsx("tui-text", { children: "├─" + sep + "─┤" }));
    
    data.forEach(function(row) {
      var rowStr = columns.map(function(col, ci) {
        return padRight(String(row[col.key] || ""), colWidths[ci]);
      }).join(" │ ");
      children.push(_jsx("tui-text", { children: "│ " + rowStr + " │" }));
    });

    return _jsx("tui-box", { flexDirection: "column", children: children });
  }

  function padRight(s, w) { while (s.length < w) s += " "; return s; }

  function SplitPane(props) {
    var dir = props.direction || "row";
    var children = props.children || [];
    if (children.length < 2) return _jsx("tui-box", props);

    var controlled = props.ratio !== undefined && props.ratio !== null;
    var st = useState(props.defaultRatio || 0.5);
    var ratio = controlled ? props.ratio : st[0];
    var setRatio = controlled
      ? function(v) { if (props.onResize) props.onResize(v); }
      : st[1];

    var id = props.id;
    var focus = id ? useFocus({ id: id }) : { isFocused: false };

    if (id) {
      var step = props.step || 0.05;
      var min = props.min || 0.1;
      var max = props.max || 0.9;
      useInput(function(_key, e) {
        if (dir === "row") {
          if (e.alt && e.key === "Left")  { setRatio(Math.max(min, ratio - step)); return; }
          if (e.alt && e.key === "Right") { setRatio(Math.min(max, ratio + step)); return; }
        } else {
          if (e.alt && e.key === "Up")    { setRatio(Math.max(min, ratio - step)); return; }
          if (e.alt && e.key === "Down")  { setRatio(Math.min(max, ratio + step)); return; }
        }
      }, { focusId: id });
    }

    var first = children[0];
    var second = children[1];
    var outer = { flexDirection: dir };
    if (props.flex) outer.flex = props.flex;
    if (props.width) outer.width = props.width;
    if (props.height) outer.height = props.height;
    if (id) {
      outer.border = true;
      outer.borderStyle = props.borderStyle || "round";
      outer.borderColor = focus.isFocused ? (props.focusColor || "cyan") : (props.borderColor || "brightBlack");
    }
    var fp = Object.assign({}, first.props || {}, { flex: Math.round(ratio * 100) });
    var sp = Object.assign({}, second.props || {}, { flex: Math.round((1 - ratio) * 100) });
    outer.children = [
        { type: first.type, props: fp },
        { type: second.type, props: sp },
      ];
    return _jsx("tui-box", outer);
  }

  function Terminal(props) {
    var command = props.command || (typeof process !== "undefined" && process.env && process.env.SHELL) || "bash";
    var args = props.args || [];
    return _jsx("tui-box", {
      border: true,
      borderStyle: "single",
      borderColor: "brightBlack",
      children: [_jsx("tui-text", { children: "[Terminal: " + command + "]", color: "brightBlack" })],
    });
  }

  function SyntaxText(props) {
    var code = props.code || "";
    var language = (props.language || "").toLowerCase();
    var showLineNumbers = props.showLineNumbers !== false;
    var highlightLine = props.highlightLine;
    var userTheme = props.theme || _theme;
    var lines = code.split("\n");

    var tokensByLine = null;
    
    if (ops.tokenize) {
      try {
        var raw = ops.tokenize(language, code);
        tokensByLine = JSON.parse(raw);
      } catch(e) { tokensByLine = null; }
    }
    if (!tokensByLine && _jsTokenizers[language]) {
      var tok = _jsTokenizers[language];
      tokensByLine = [];
      var state = 0;
      for (var i = 0; i < lines.length; i++) {
        var result = tok.tokenize(lines[i], state);
        tokensByLine.push(result.tokens || []);
        state = result.state || 0;
      }
    }

    var gutterW = showLineNumbers ? String(lines.length).length + 1 : 0;
    var children = [];

    for (var i = 0; i < lines.length; i++) {
      var lineChildren = [];
      if (showLineNumbers) {
        var num = padRight(String(i + 1), gutterW);
        lineChildren.push(_jsx("tui-text", { children: num, color: "brightBlack" }));
      }

      if (tokensByLine && tokensByLine[i] && tokensByLine[i].length) {
        var tokens = tokensByLine[i];
        var line = lines[i];
        var pos = 0;
        for (var t = 0; t < tokens.length; t++) {
          var tok = tokens[t];
          var start = tok.start || tok.Start || 0;
          var len = tok.length || tok.Length || 0;
          var kind = tok.kind || tok.Kind || "Plain";
          if (start > pos) {
            lineChildren.push(_jsx("tui-text", { children: line.slice(pos, start) }));
          }
          var color = userTheme[kind] || "default";
          lineChildren.push(_jsx("tui-text", { children: line.slice(start, start + len), color: color }));
          pos = start + len;
        }
        if (pos < line.length) {
          lineChildren.push(_jsx("tui-text", { children: line.slice(pos) }));
        }
      } else {
        lineChildren.push(_jsx("tui-text", { children: lines[i] }));
      }

      var bg = (highlightLine === i + 1) ? "brightBlack" : "default";
      children.push(_jsx("tui-box", { flexDirection: "row", bg: bg, children: lineChildren }));
    }

    return _jsx("tui-box", {
      flexDirection: "column",
      overflow: props.overflow || "visible",
      children: children,
    });
  }

  var MD_HEADING_MARKS = ["═══ ", "─── ", "▪ ", "▸ ", "· ", "· "];

  function Markdown(props) {
    var content = props.content || "";
    var userTheme = props.theme || _theme;
    var lines = content.split("\n");
    var blocks = parseMdBlocks(lines);
    var children = blocks.map(function(block) { return renderMdBlock(block, userTheme); });
    return _jsx("tui-box", { flexDirection: "column", children: children });
  }

  function parseMdBlocks(lines) {
    var blocks = [];
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      
      var fenceMatch = line.match(/^```(\w*)/);
      if (fenceMatch) {
        var lang = fenceMatch[1] || "";
        var code = [];
        i++;
        while (i < lines.length && !lines[i].startsWith("```")) {
          code.push(lines[i]); i++;
        }
        if (i < lines.length) i++; 
        blocks.push({ type: "code", lang: lang, content: code.join("\n") });
        continue;
      }
      
      var headMatch = line.match(/^(#{1,6})\s+(.+)/);
      if (headMatch) {
        blocks.push({ type: "heading", level: headMatch[1].length, text: headMatch[2] });
        i++; continue;
      }
      
      if (/^([-*_])\1{2,}\s*$/.test(line)) {
        blocks.push({ type: "hr" }); i++; continue;
      }
      
      if (line.startsWith("> ")) {
        var quoteLines = [];
        while (i < lines.length && lines[i].startsWith("> ")) {
          quoteLines.push(lines[i].slice(2)); i++;
        }
        blocks.push({ type: "blockquote", content: quoteLines.join("\n") });
        continue;
      }
      
      if (line.indexOf("|") >= 0 && i + 1 < lines.length && /^\|?\s*[-:]+/.test(lines[i + 1])) {
        var tableLines = [];
        while (i < lines.length && lines[i].indexOf("|") >= 0) {
          tableLines.push(lines[i]); i++;
        }
        blocks.push({ type: "table", lines: tableLines });
        continue;
      }
      
      if (/^\s*[-*+]\s/.test(line)) {
        var items = [];
        while (i < lines.length && /^\s*[-*+]\s/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*+]\s/, "")); i++;
        }
        blocks.push({ type: "ul", items: items }); continue;
      }
      
      if (/^\s*\d+\.\s/.test(line)) {
        var items = [];
        while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*\d+\.\s/, "")); i++;
        }
        blocks.push({ type: "ol", items: items }); continue;
      }
      
      if (!line.trim()) { i++; continue; }
      
      var para = [];
      while (i < lines.length && lines[i].trim() && !lines[i].startsWith("#") && !lines[i].startsWith(">") && !lines[i].startsWith("```")) {
        para.push(lines[i]); i++;
      }
      blocks.push({ type: "paragraph", text: para.join(" ") });
    }
    return blocks;
  }

  function renderMdBlock(block, theme) {
    switch (block.type) {
      case "heading": {
        var mark = MD_HEADING_MARKS[Math.min(block.level - 1, 5)];
        return _jsx("tui-text", { children: mark + block.text, bold: true, color: theme.Heading || "cyan" });
      }
      case "code":
        return SyntaxText({ code: block.content, language: block.lang, showLineNumbers: true, theme: theme });
      case "blockquote":
        return _jsx("tui-box", {
          flexDirection: "row",
          children: [
            _jsx("tui-text", { children: "│ ", color: "brightBlack" }),
            _jsx("tui-text", { children: block.content, italic: true }),
          ],
        });
      case "hr":
        return _jsx("tui-text", { children: "─".repeat(40), color: "brightBlack" });
      case "ul": {
        var markers = ["●", "○", "▪", "·"];
        return _jsx("tui-box", {
          flexDirection: "column",
          children: block.items.map(function(item, i) {
            return _jsx("tui-text", { children: "  " + markers[0] + " " + renderInline(item, theme) });
          }),
        });
      }
      case "ol":
        return _jsx("tui-box", {
          flexDirection: "column",
          children: block.items.map(function(item, i) {
            return _jsx("tui-text", { children: "  " + (i + 1) + ". " + renderInline(item, theme) });
          }),
        });
      case "table":
        return renderMdTable(block.lines, theme);
      case "paragraph":
        return _jsx("tui-text", { children: renderInline(block.text, theme) });
      default:
        return _jsx("tui-text", { children: "" });
    }
  }

  function renderInline(text, theme) {

    return text
      .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  }

  function renderMdTable(lines, theme) {
    if (lines.length < 2) return _jsx("tui-text", { children: lines.join("\n") });
    var parseRow = function(line) {
      return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map(function(c) { return c.trim(); });
    };
    var headers = parseRow(lines[0]);
    var aligns = parseRow(lines[1]).map(function(c) {
      if (c.startsWith(":") && c.endsWith(":")) return "center";
      if (c.endsWith(":")) return "right";
      return "left";
    });
    var rows = [];
    for (var i = 2; i < lines.length; i++) rows.push(parseRow(lines[i]));

    var colWidths = headers.map(function(h, ci) {
      var maxW = h.length;
      rows.forEach(function(r) { if (r[ci] && r[ci].length > maxW) maxW = r[ci].length; });
      return maxW;
    });

    var children = [];
    
    children.push(_jsx("tui-text", { children: "┌" + colWidths.map(function(w) { return "─".repeat(w + 2); }).join("┬") + "┐" }));
    
    children.push(_jsx("tui-text", {
      children: "│" + headers.map(function(h, ci) { return " " + padRight(h, colWidths[ci]) + " "; }).join("│") + "│",
      bold: true,
    }));
    
    children.push(_jsx("tui-text", { children: "├" + colWidths.map(function(w) { return "─".repeat(w + 2); }).join("┼") + "┤" }));
    
    rows.forEach(function(row) {
      children.push(_jsx("tui-text", {
        children: "│" + headers.map(function(_, ci) { return " " + padRight(row[ci] || "", colWidths[ci]) + " "; }).join("│") + "│",
      }));
    });
    
    children.push(_jsx("tui-text", { children: "└" + colWidths.map(function(w) { return "─".repeat(w + 2); }).join("┴") + "┘" }));

    return _jsx("tui-box", { flexDirection: "column", children: children });
  }

  

  

  var MD_COLORS = {
    Plain: "white", Keyword: "brightBlue", Type: "brightCyan", String: "brightGreen",
    Number: "brightYellow", Comment: "brightBlack", Operator: "brightMagenta", Punctuation: "white",
    Identifier: "white", Function: "brightYellow", Preprocessor: "brightCyan", Heading: "brightYellow",
    Bold: "brightWhite", Italic: "brightCyan", BoldItalic: "brightWhite", Link: "brightBlue", CodeSpan: "brightGreen",
  };

  
  var MD_GUIDES = ["Comment", "Keyword", "Operator", "Type"];
  function mdGcd(a, b) { return b === 0 ? a : mdGcd(b, a % b); }
  
  function mdIndentUnit(lines) {
    var u = 0;
    for (var i = 0; i < lines.length; i++) {
      var lead = 0; while (lead < lines[i].length && lines[i].charAt(lead) === " ") lead++;
      if (lead > 0) u = u === 0 ? lead : mdGcd(u, lead);
    }
    return u === 0 ? 2 : Math.min(8, Math.max(1, u));
  }

  function mdInlineSpans(text, baseOff) {
    var rules = [
      [/\*\*\*([^*\n]+)\*\*\*/g, 3, 3, "BoldItalic"],
      [/___([^_\n]+)___/g, 3, 3, "BoldItalic"],
      [/\*\*([^*\n]+)\*\*/g, 2, 2, "Bold"],
      [/__([^_\n]+)__/g, 2, 2, "Bold"],
      [/\*([^*\n]+)\*/g, 1, 1, "Italic"],
      [/_([^_\n]+)_/g, 1, 1, "Italic"],
      [/`([^`\n]+)`/g, 1, 1, "CodeSpan"],
    ];
    var raw = [];
    for (var r = 0; r < rules.length; r++) {
      var rx = rules[r][0]; rx.lastIndex = baseOff; var m;
      while ((m = rx.exec(text)) !== null) {
        if (m.index >= baseOff) raw.push({ index: m.index, length: m[0].length, pre: rules[r][1], suf: rules[r][2], kind: rules[r][3] });
        if (rx.lastIndex === m.index) rx.lastIndex++;
      }
    }
    var rl = /\[([^\]]+)\]\(([^)]+)\)/g; rl.lastIndex = baseOff; var lm;
    while ((lm = rl.exec(text)) !== null) {
      if (lm.index >= baseOff) raw.push({ index: lm.index, length: lm[0].length, pre: 1, suf: lm[0].length - lm[1].length - 1, kind: "Link" });
      if (rl.lastIndex === lm.index) rl.lastIndex++;
    }
    raw.sort(function(a, b) { return a.index - b.index; });
    var matches = []; var lastEnd = -1;
    for (var k = 0; k < raw.length; k++) { if (raw[k].index < lastEnd) continue; matches.push(raw[k]); lastEnd = raw[k].index + raw[k].length; }
    if (!matches.length) return { text: text, spans: [] };
    var out = ""; var spans = []; var pos = 0;
    for (var j = 0; j < matches.length; j++) {
      var mt = matches[j];
      if (mt.index > pos) out += text.slice(pos, mt.index);
      var innerStart = mt.index + mt.pre, innerLen = mt.length - mt.pre - mt.suf;
      spans.push({ start: out.length, len: innerLen, kind: mt.kind });
      out += text.slice(innerStart, innerStart + innerLen);
      pos = mt.index + mt.length;
    }
    if (pos < text.length) out += text.slice(pos);
    return { text: out, spans: spans };
  }

  function mdSplitRow(line) {
    var t = line.trim();
    if (t.charAt(0) === "|") t = t.slice(1);
    if (t.charAt(t.length - 1) === "|") t = t.slice(0, -1);
    return t.split("|").map(function(c) { return c.trim(); });
  }
  function mdIsTableRow(line) { var t = line.replace(/^\s+/, ""); return t.charAt(0) === "|" && t.indexOf("|", 1) >= 0; }
  function mdIsTableSep(line) {
    var t = line.trim(); if (!t || t.charAt(0) !== "|") return false; var sawDash = false;
    for (var i = 0; i < t.length; i++) { var c = t[i]; if (c === "-") sawDash = true; else if (c !== "|" && c !== ":" && c !== " ") return false; }
    return sawDash;
  }
  function mdTable(src, start, out) {
    if (start + 1 >= src.length) return 0;
    if (!mdIsTableRow(src[start]) || !mdIsTableSep(src[start + 1])) return 0;
    var header = mdSplitRow(src[start]); if (!header.length) return 0;
    var sep = mdSplitRow(src[start + 1]);
    var aligns = header.map(function(_, c) { var s = (c < sep.length ? sep[c] : "").trim(); var l = s.charAt(0) === ":", r = s.charAt(s.length - 1) === ":"; return (l && r) ? "c" : r ? "r" : "l"; });
    var rows = [header]; var i = start + 2;
    while (i < src.length && mdIsTableRow(src[i])) { rows.push(mdSplitRow(src[i])); i++; }
    var widths = header.map(function(_, c) { var w = 0; for (var r = 0; r < rows.length; r++) { var cell = rows[r][c] || ""; if (cell.length > w) w = cell.length; } return w; });
    var bar = function(l, mch, rch) { var parts = widths.map(function(w) { return "─".repeat(w + 2); }); return l + parts.join(mch) + rch; };
    var pad = function(s, w, a) { s = s || ""; var d = w - s.length; if (d <= 0) return s; if (a === "r") return " ".repeat(d) + s; if (a === "c") return " ".repeat(d >> 1) + s + " ".repeat(d - (d >> 1)); return s + " ".repeat(d); };
    out.push({ text: bar("┌", "┬", "┐"), spans: [{ start: 0, len: 1, kind: "Punctuation" }] });
    for (var ri = 0; ri < rows.length; ri++) {
      var txt = "│", spans = [{ start: 0, len: 1, kind: "Punctuation" }];
      for (var c = 0; c < widths.length; c++) {
        var cellStart = txt.length + 1; var cell = pad(rows[ri][c] || "", widths[c], aligns[c]);
        txt += " " + cell + " ";
        if ((rows[ri][c] || "").length) spans.push({ start: cellStart, len: cell.replace(/\s+$/, "").length || cell.length, kind: ri === 0 ? "Heading" : "Plain" });
        txt += "│"; spans.push({ start: txt.length - 1, len: 1, kind: "Punctuation" });
      }
      out.push({ text: txt, spans: spans });
      if (ri === 0) out.push({ text: bar("├", "┼", "┤"), spans: [{ start: 0, len: 1, kind: "Punctuation" }] });
    }
    out.push({ text: bar("└", "┴", "┘"), spans: [{ start: 0, len: 1, kind: "Punctuation" }] });
    return i - start;
  }

  function renderMarkdownLines(source, tokenize) {
    var src = String(source || "").replace(/\r\n/g, "\n").split("\n");
    var out = [];
    var GUT = "  │ ";
    var i = 0;
    while (i < src.length) {
      var raw = src[i];
      var trimmed = raw.replace(/^\s+/, "");
      
      var t0 = out.length;
      var consumed = mdTable(src, i, out);
      if (consumed > 0) { for (var tk2 = t0; tk2 < out.length; tk2++) out[tk2].nowrap = true; i += consumed; continue; }
      
      if (trimmed.indexOf("```") === 0) {
        var lang = trimmed.length > 3 ? trimmed.slice(3).trim() : "";
        var code = []; i++;
        while (i < src.length && src[i].replace(/^\s+/, "").indexOf("```") !== 0) { code.push(src[i]); i++; }
        if (i < src.length) i++; 
        var label = "─── " + (lang || "code") + " ───";
        out.push({ text: label, spans: [{ start: 0, len: label.length, kind: "Comment" }], nowrap: true });
        var byLine = null;
        if (lang && tokenize) { try { byLine = JSON.parse(tokenize(lang, code.join("\n"))); } catch (e) { byLine = null; } }
        var cunit = mdIndentUnit(code);
        var cgw = Math.max(2, String(code.length).length);
        for (var ci = 0; ci < code.length; ci++) {
          var cl = code[ci];
          var ind = 0; while (ind < cl.length && cl.charAt(ind) === " ") ind++;
          var lvls = cunit > 0 ? Math.floor(ind / cunit) : 0;
          var num = String(ci + 1); while (num.length < cgw) num = " " + num;
          var pfx = num + " │ ";
          var guides = "";
          for (var gc = 0; gc < ind; gc++) guides += (gc < lvls * cunit && gc % cunit === 0) ? "│" : " ";
          var rest = cl.slice(ind);
          var text = pfx + guides + rest;
          var spans = [{ start: 0, len: pfx.length, kind: "Comment" }];
          for (var L = 0; L < lvls; L++) spans.push({ start: pfx.length + L * cunit, len: 1, kind: MD_GUIDES[L % 4] });
          var lt = byLine && byLine[ci];
          if (lt && lt.length) {
            for (var ti = 0; ti < lt.length; ti++) {
              var tk = lt[ti]; var st = (tk.start || tk.Start || 0);
              if (st >= ind) spans.push({ start: pfx.length + st, len: (tk.length || tk.Length || 0), kind: tk.kind || tk.Kind || "Plain" });
            }
          } else if (rest.length) {
            spans.push({ start: pfx.length + ind, len: rest.length, kind: "CodeSpan" });
          }
          out.push({ text: text, spans: spans, nowrap: true });
        }
        var ftr = "─── end ───";
        out.push({ text: ftr, spans: [{ start: 0, len: ftr.length, kind: "Comment" }], nowrap: true });
        continue;
      }
      
      if (trimmed.charAt(0) === "#") {
        var lvl = 0; while (lvl < trimmed.length && trimmed[lvl] === "#") lvl++;
        if (lvl <= 6 && lvl < trimmed.length && trimmed[lvl] === " ") {
          var htext = trimmed.slice(lvl + 1);
          if (lvl === 1) {
            var r1 = "═══ " + htext.toUpperCase() + " ═══";
            out.push({ text: r1, spans: [{ start: 0, len: r1.length, kind: "Heading" }] });
            out.push({ text: "═".repeat(r1.length), spans: [{ start: 0, len: r1.length, kind: "Heading" }] });
          } else if (lvl === 2) {
            var r2 = "── " + htext + " ──";
            out.push({ text: r2, spans: [{ start: 0, len: r2.length, kind: "Heading" }] });
            out.push({ text: "─".repeat(r2.length), spans: [{ start: 0, len: r2.length, kind: "Heading" }] });
          } else {
            var pfx = lvl === 3 ? "▪ " : lvl === 4 ? "▸ " : lvl === 5 ? "· " : "  ";
            var r3 = pfx + htext;
            out.push({ text: r3, spans: [{ start: 0, len: r3.length, kind: "Heading" }] });
          }
          i++; continue;
        }
      }
      
      if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
        out.push({ text: "─".repeat(60), spans: [{ start: 0, len: 60, kind: "Punctuation" }] });
        i++; continue;
      }
      
      if (trimmed.charAt(0) === ">") {
        var depth = 0; while (depth < trimmed.length && trimmed[depth] === ">") depth++;
        var inner = trimmed.slice(depth).replace(/^\s+/, "");
        var composed = "│".repeat(depth) + " " + inner;
        var bq = mdInlineSpans(composed, depth + 1);
        bq.spans.unshift({ start: 0, len: depth, kind: "Comment" });
        out.push(bq); i++; continue;
      }
      
      var ul = raw.match(/^(\s*)([-*+])\s+(.*)$/);
      if (ul) {
        var lev = Math.floor(ul[1].length / 2);
        var bullet = lev === 0 ? "● " : lev === 1 ? "○ " : lev === 2 ? "▪ " : "· ";
        var cu = mdInlineSpans(" ".repeat(lev * 2) + bullet + ul[3], lev * 2 + 2);
        cu.spans.unshift({ start: lev * 2, len: 1, kind: "Punctuation" });
        out.push(cu); i++; continue;
      }
      
      var ol = raw.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (ol) {
        var lo = Math.floor(ol[1].length / 2);
        var co = mdInlineSpans(" ".repeat(lo * 2) + ol[2] + ". " + ol[3], lo * 2 + ol[2].length + 2);
        co.spans.unshift({ start: lo * 2, len: ol[2].length + 1, kind: "Number" });
        out.push(co); i++; continue;
      }
      
      if (!raw.trim()) out.push({ text: "", spans: [] });
      else out.push(mdInlineSpans(raw, 0));
      i++;
    }
    return out;
  }

  function mdWrapLines(lines, width) {
    if (width < 4) width = 4;
    var result = [];
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li]; var text = line.text || "";
      
      if (line.nowrap || text.length <= width) { result.push(line); continue; }
      var pos = 0;
      while (pos < text.length) {
        var end = Math.min(pos + width, text.length);
        if (end < text.length) {
          var breakAt = -1;
          for (var bi = end - 1; bi > pos; bi--) { if (text[bi] === " " || text[bi] === "\t") { breakAt = bi + 1; break; } }
          if (breakAt > pos) end = breakAt;
        }
        var segText = text.slice(pos, end); var segSpans = [];
        if (line.spans) {
          for (var si = 0; si < line.spans.length; si++) {
            var sp = line.spans[si]; var s0 = sp.start - pos, s1 = sp.start + sp.len - pos;
            if (s1 <= 0 || s0 >= segText.length) continue;
            var cs = Math.max(0, s0), ce = Math.min(segText.length, s1);
            if (ce > cs) segSpans.push({ start: cs, len: ce - cs, kind: sp.kind });
          }
        }
        result.push({ text: segText, spans: segSpans });
        pos = end;
      }
    }
    return result;
  }

  function mdRenderRow(line, key) {
    var text = line.text || ""; var spans = line.spans || [];
    var segs = []; var pos = 0;
    for (var t = 0; t < spans.length; t++) {
      var sp = spans[t]; if (sp.start < pos) continue;
      if (sp.start > pos) segs.push(_jsx("tui-text", { children: text.slice(pos, sp.start) }));
      var p = { children: text.slice(sp.start, sp.start + sp.len), color: MD_COLORS[sp.kind] || "white" };
      if (sp.kind === "Bold" || sp.kind === "BoldItalic" || sp.kind === "Heading") p.bold = true;
      if (sp.kind === "Italic" || sp.kind === "BoldItalic") p.italic = true;
      segs.push(_jsx("tui-text", p));
      pos = sp.start + sp.len;
    }
    if (pos < text.length) segs.push(_jsx("tui-text", { children: text.slice(pos) }));
    if (!segs.length) segs.push(_jsx("tui-text", { children: text || " " }));
    return _jsx("tui-box", { key: key, flexDirection: "row", children: segs });
  }

  
  function mdSliceH(line, left, width) {
    var text = line.text || "";
    if (left <= 0 && (width <= 0 || text.length <= width)) return line;
    var end = width > 0 ? left + width : text.length;
    var nt = text.slice(left, end);
    var spans = line.spans || []; var ns = [];
    for (var i = 0; i < spans.length; i++) {
      var sp = spans[i]; var s = sp.start - left, e = sp.start + sp.len - left;
      if (e <= 0 || (width > 0 && s >= width)) continue;
      var cs = Math.max(0, s), ce = width > 0 ? Math.min(width, e) : e;
      if (ce > cs) ns.push({ start: cs, len: ce - cs, kind: sp.kind });
    }
    return { text: nt, spans: ns };
  }

  
  function CodeView(props) {
    var lines = props.lines || [];
    var top = Math.max(0, props.top || 0);
    var height = Math.max(1, props.height || 10);
    var left = Math.max(0, props.left || 0);
    var width = props.width || 0;
    var rows = [];
    for (var r = 0; r < height; r++) {
      var idx = top + r;
      if (idx < lines.length) rows.push(mdRenderRow(mdSliceH(lines[idx], left, width), r));
      else rows.push(_jsx("tui-text", { key: r, children: " " }));
    }
    return _jsx("tui-box", { flexDirection: "column", children: rows });
  }

  function _jsxs(type, props) { return _jsx(type, props); }

  return {
    render: render,
    onInput: onInput,
    createNode: createNode,
    computeLayout: computeLayout,
    generateCells: generateCells,
    setScroll: setScroll,
    hostConfig: hostConfig,
    
    Box: Box,
    Text: Text,
    Spacer: Spacer,
    FocusGroup: FocusGroup,
    FocusItem: FocusItem,
    Modal: Modal,
    TextInput: TextInput,
    SelectInput: SelectInput,
    Spinner: Spinner,
    ProgressBar: ProgressBar,
    Table: Table,
    SplitPane: SplitPane,
    Terminal: Terminal,
    SyntaxText: SyntaxText,
    Markdown: Markdown,
    CodeView: CodeView,
    renderMarkdown: function(source) { return renderMarkdownLines(source, ops.tokenize); },
    mdWrap: mdWrapLines,
    
    useState: useState,
    useEffect: useEffect,
    useRef: useRef,
    useCallback: useCallback,
    useInput: useInput,
    useGlobalKey: useGlobalKey,
    useFocus: useFocus,
    useResize: useResize,
    useDimensions: useDimensions,
    useDebounce: useDebounce,
    useTextInput: useTextInput,
    useApp: useApp,
    useStdout: useStdout,
    
    nextFrame: function() { _animFrame++; },
    
    onInput: onInput,
    dispatchInput: dispatchInput,
    scheduleRender: scheduleRender,
    
    focusManager: focusManager,
    
    registerLanguage: registerLanguage,
    theme: _theme,
  };
})
