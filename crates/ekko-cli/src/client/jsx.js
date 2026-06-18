// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



var EK_FRAG = Symbol.for('ekko.fragment');
var _react = null;
export function registerReact(r) { _react = r || null; }
export function jsx(type, props) {
  if (_react) {
    var t = (type === EK_FRAG) ? _react.Fragment : type;
    return _react.createElement(t, props || {});
  }
  return { type: type, props: props || {}, __jsx: true };
}
export var jsxs = jsx;
export var Fragment = EK_FRAG;
if (typeof globalThis.Link === 'undefined') {
  globalThis.Link = function Link(props) {
    props = props || {};
    var p = {
      href: props.href || props.to || '/',
      'data-nav': '',
      'data-ekko-prefetch': props.prefetch !== false ? 'true' : 'false',
      children: props.children || ''
    };
    if (props.className) p.className = props.className;
    if (props.style) p.style = props.style;
    return jsx('a', p);
  };
}
