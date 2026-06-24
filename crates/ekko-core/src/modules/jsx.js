// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



(function () {
  var EK_FRAG = Symbol.for('ekko.fragment');
  var _react = null; 

  function registerReact(r) { _react = r || null; }

  function jsx(type, props) {
    if (_react) {
      var t = (type === EK_FRAG) ? _react.Fragment : type;
      return _react.createElement(t, props || {});
    }
    return { type: type, props: props || {}, __jsx: true };
  }

  
  
  function Link(props) {
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
  }

  return { jsx: jsx, jsxs: jsx, Fragment: EK_FRAG, registerReact: registerReact, Link: Link };
})()
