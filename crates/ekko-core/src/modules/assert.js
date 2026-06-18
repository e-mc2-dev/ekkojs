// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

(function(){
class AssertionError extends Error { constructor(m,e,a){super(m);this.name='AssertionError';this.expected=e;this.actual=a;} }
return {
  assert(c,m){if(!c)throw new AssertionError(m||'Assertion failed');},
  assertEqual(a,e){if(a!=e)throw new AssertionError('Expected '+JSON.stringify(e)+' but got '+JSON.stringify(a),e,a);},
  assertStrictEqual(a,e){if(a!==e)throw new AssertionError('Expected strict '+JSON.stringify(e)+' but got '+JSON.stringify(a),e,a);},
  assertNotEqual(a,b){if(a==b)throw new AssertionError('Expected not equal');},
  assertDeepEqual(a,e){if(JSON.stringify(a)!==JSON.stringify(e))throw new AssertionError('Deep equality failed',e,a);},
  assertThrows(fn,exp){let threw=false,err;try{fn();}catch(e){threw=true;err=e;}if(!threw)throw new AssertionError('Expected function to throw');if(exp){if(typeof exp==='string'&&!String(err.message).includes(exp))throw new AssertionError('Expected throw "'+exp+'"');if(typeof exp==='function'&&!(err instanceof exp))throw new AssertionError('Expected '+exp.name);}},
  assertRejects:async function(fn,exp){let threw=false,err;try{await fn();}catch(e){threw=true;err=e;}if(!threw)throw new AssertionError('Expected reject');if(exp&&typeof exp==='string'&&!String(err.message).includes(exp))throw new AssertionError('Expected reject "'+exp+'"');},
  assertType(v,t){if(typeof v!==t)throw new AssertionError('Expected typeof '+t+' but got '+typeof v,t,typeof v);},
  fail(m){throw new AssertionError(m||'fail() called');},
};
})()