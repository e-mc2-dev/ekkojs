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
class AssertionError extends Error{constructor(m,e,a){super(m);this.name='AssertionError';this.expected=e;this.actual=a;}}
const suites=[]; let current=null; let hasOnly=false;

const _realSetTimeout    = globalThis.setTimeout;
const _realClearTimeout  = globalThis.clearTimeout;
const _realSetInterval   = globalThis.setInterval;
const _realClearInterval = globalThis.clearInterval;
const _RealDate          = globalThis.Date;

function describe(name,fn){
  const s={name,tests:[],before:[],after:[],beforeAll:[],afterAll:[],children:[]};
  if(current)current.children.push(s);else suites.push(s);
  const prev=current; current=s; fn(); current=prev;
}
function test(name,fn){
  if(!current){const s={name:'',tests:[],before:[],after:[],beforeAll:[],afterAll:[],children:[]};suites.push(s);current=s;}
  current.tests.push({name,fn,skip:false,only:false});
}
test.skip=function(name,fn){
  if(!current){const s={name:'',tests:[],before:[],after:[],beforeAll:[],afterAll:[],children:[]};suites.push(s);current=s;}
  current.tests.push({name,fn,skip:true,only:false});
};
test.only=function(name,fn){
  hasOnly=true;
  if(!current){const s={name:'',tests:[],before:[],after:[],beforeAll:[],afterAll:[],children:[]};suites.push(s);current=s;}
  current.tests.push({name,fn,skip:false,only:true});
};
function expect(actual){
  function fail(m,e,a){throw new AssertionError(m,e,a);}
  const mt={
    toBe(e){if(actual!==e)fail('Expected '+JSON.stringify(e)+' but got '+JSON.stringify(actual),e,actual);},
    toEqual(e){if(JSON.stringify(actual)!==JSON.stringify(e))fail('Expected deep equal',e,actual);},
    toBeTruthy(){if(!actual)fail('Expected truthy');},
    toBeFalsy(){if(actual)fail('Expected falsy');},
    toBeNull(){if(actual!==null)fail('Expected null',null,actual);},
    toBeUndefined(){if(actual!==undefined)fail('Expected undefined');},
    toBeGreaterThan(n){if(!(actual>n))fail(actual+' not > '+n);},
    toBeLessThan(n){if(!(actual<n))fail(actual+' not < '+n);},
    toContain(item){if(typeof actual==='string'){if(!actual.includes(item))fail('Not contains');}else if(Array.isArray(actual)){if(!actual.includes(item))fail('Not contains');}else fail('toContain needs string/array');},
    toHaveLength(n){if(actual.length!==n)fail('Length '+actual.length+' != '+n,n,actual.length);},
    toHaveProperty(k,v){if(!(k in actual))fail('Missing '+k);if(v!==undefined&&actual[k]!==v)fail('Property mismatch');},
    toMatch(re){if(typeof re==='string')re=new RegExp(re);if(!re.test(actual))fail('No match');},
    toBeInstanceOf(cls){if(!(actual instanceof cls))fail('Not instance of '+cls.name);},
    toThrow(exp){let threw=false,err;try{actual();}catch(e){threw=true;err=e;}if(!threw)fail('Expected throw');if(exp&&typeof exp==='string'&&!String(err.message).includes(exp))fail('Wrong throw msg');},
    
    toHaveBeenCalled(){if(!actual||!actual.mock)fail('toHaveBeenCalled: not a mock fn');if(actual.mock.calls.length===0)fail('Expected mock to have been called');},
    toHaveBeenCalledTimes(n){if(!actual||!actual.mock)fail('toHaveBeenCalledTimes: not a mock fn');if(actual.mock.calls.length!==n)fail('Expected '+n+' calls, got '+actual.mock.calls.length);},
    toHaveBeenCalledWith(...exp){if(!actual||!actual.mock)fail('toHaveBeenCalledWith: not a mock fn');const hit=actual.mock.calls.some(c=>JSON.stringify(c)===JSON.stringify(exp));if(!hit)fail('No call matched '+JSON.stringify(exp));},
  };
  mt.not={}; for(const k of Object.keys(mt)){if(k==='not')continue;mt.not[k]=function(...a){let ok=false;try{mt[k](...a);}catch{ok=true;}if(!ok)throw new AssertionError('.not.'+k+' failed');};}
  return mt;
}
function beforeEach(fn){if(current)current.before.push(fn);}
function afterEach(fn){if(current)current.after.push(fn);}
function beforeAll(fn){if(current)current.beforeAll.push(fn);}
function afterAll(fn){if(current)current.afterAll.push(fn);}

const _activeRestores = [];   
let   _fakeTimers = null;     

function _mockFn(impl){
  const calls=[];
  let _impl=impl;
  const f=function(...args){
    f.mock.calls.push(args);
    if(_impl){
      let ret;
      try{ ret=_impl.apply(this,args); }
      catch(e){ f.mock.results.push({type:'throw',value:e}); throw e; }
      f.mock.results.push({type:'return',value:ret});
      return ret;
    }
    f.mock.results.push({type:'return',value:undefined});
    return undefined;
  };
  f.mock={calls,results:[]};
  f.mockReturnValue=(v)=>{_impl=()=>v;return f;};
  f.mockResolvedValue=(v)=>{_impl=()=>Promise.resolve(v);return f;};
  f.mockRejectedValue=(v)=>{_impl=()=>Promise.reject(v);return f;};
  f.mockImplementation=(fn)=>{_impl=fn;return f;};
  f.mockReset=()=>{f.mock.calls.length=0;f.mock.results.length=0;_impl=impl;return f;};
  f.mockClear=()=>{f.mock.calls.length=0;f.mock.results.length=0;return f;};
  return f;
}

function _mockMethod(obj,key,impl){
  if(obj==null||!(key in obj))throw new Error("mock.method: '"+key+"' not found on target");
  const had=Object.prototype.hasOwnProperty.call(obj,key);
  const orig=obj[key];
  const f=_mockFn(impl!==undefined?impl:(typeof orig==='function'?function(...a){return orig.apply(obj,a);}:()=>orig));
  f.mockRestore=()=>{ if(had)obj[key]=orig; else delete obj[key]; };
  obj[key]=f;
  _activeRestores.push(f.mockRestore);
  return f;
}

function _restoreAll(){
  while(_activeRestores.length){ try{ _activeRestores.pop()(); }catch{} }
  if(_fakeTimers)_useRealTimers();
}

function _useFakeTimers(){
  if(_fakeTimers)return _fakeApi;
  const state={now:0,seq:1,timers:new Map()}; 
  _fakeTimers=state;
  globalThis.setTimeout=(fn,ms=0,...a)=>{const id=state.seq++;state.timers.set(id,{at:state.now+(+ms||0),fn,args:a,interval:null});return id;};
  globalThis.setInterval=(fn,ms=0,...a)=>{const id=state.seq++;const d=Math.max(1,+ms||0);state.timers.set(id,{at:state.now+d,fn,args:a,interval:d});return id;};
  globalThis.clearTimeout=(id)=>{state.timers.delete(id);};
  globalThis.clearInterval=(id)=>{state.timers.delete(id);};
  
  const RD=_RealDate;
  function FakeDate(...args){ if(!(this instanceof FakeDate))return new RD(state.now).toString(); if(args.length===0)return new RD(state.now); return new RD(...args); }
  FakeDate.now=()=>state.now;
  FakeDate.prototype=RD.prototype;
  FakeDate.UTC=RD.UTC; FakeDate.parse=RD.parse;
  globalThis.Date=FakeDate;
  return _fakeApi;
}
function _due(predicate){
  
  let next=null;
  for(const [id,t] of _fakeTimers.timers){
    if(!predicate(t))continue;
    if(next===null||t.at<next.t.at||(t.at===next.t.at&&id<next.id))next={id,t};
  }
  return next;
}
function _advanceTimersByTime(ms){
  const target=_fakeTimers.now+(+ms||0);
  let budget=1000000;
  for(;;){
    const next=_due(t=>t.at<=target);
    if(!next)break;
    if(--budget<0)throw new Error('fake timers: runaway timer loop (interval never cleared?)');
    _fakeTimers.now=Math.max(_fakeTimers.now,next.t.at);
    if(next.t.interval!=null)next.t.at=_fakeTimers.now+next.t.interval; else _fakeTimers.timers.delete(next.id);
    next.t.fn(...next.t.args);
  }
  _fakeTimers.now=Math.max(_fakeTimers.now,target);
}
function _runAllTimers(){
  let budget=1000000;
  for(;;){
    const next=_due(()=>true);
    if(!next)break;
    if(--budget<0)throw new Error('fake timers: runaway timer loop (interval never cleared?)');
    _fakeTimers.now=Math.max(_fakeTimers.now,next.t.at);
    if(next.t.interval!=null)next.t.at=_fakeTimers.now+next.t.interval; else _fakeTimers.timers.delete(next.id);
    next.t.fn(...next.t.args);
  }
}
function _runOnlyPendingTimers(){
  
  const ids=[..._fakeTimers.timers.keys()];
  const pending=ids
    .map(id=>({id,t:_fakeTimers.timers.get(id)}))
    .filter(x=>x.t)
    .sort((a,b)=>a.t.at-b.t.at||a.id-b.id);
  for(const {id,t} of pending){
    if(!_fakeTimers.timers.has(id))continue; 
    _fakeTimers.now=Math.max(_fakeTimers.now,t.at);
    if(t.interval!=null)t.at=_fakeTimers.now+t.interval; else _fakeTimers.timers.delete(id);
    t.fn(...t.args);
  }
}
function _setSystemTime(ms){ if(!_fakeTimers)_useFakeTimers(); _fakeTimers.now=(ms instanceof _RealDate)?ms.getTime():(+ms||0); }
function _useRealTimers(){
  if(!_fakeTimers)return;
  globalThis.setTimeout=_realSetTimeout; globalThis.clearTimeout=_realClearTimeout;
  globalThis.setInterval=_realSetInterval; globalThis.clearInterval=_realClearInterval;
  globalThis.Date=_RealDate; _fakeTimers=null;
}
const _fakeApi={
  advanceTimersByTime:_advanceTimersByTime, tick:_advanceTimersByTime,
  runAllTimers:_runAllTimers, runOnlyPendingTimers:_runOnlyPendingTimers,
  setSystemTime:_setSystemTime, useRealTimers:_useRealTimers,
};

const _moduleMockKeys = new Map(); 
function _mockModule(spec,factory){
  if(typeof spec!=='string')throw new Error('mock.module: specifier must be a string');
  const exportsObj=(typeof factory==='function')?factory():factory;
  if(exportsObj==null||typeof exportsObj!=='object')throw new Error('mock.module: factory must return an exports object');
  if(typeof __ekko_mock_module!=='function')throw new Error('mock.module: runtime registry unavailable');
  const key=__ekko_mock_module(spec,exportsObj);
  _moduleMockKeys.set(spec,key);
  const restore=()=>{ try{ __ekko_unmock_module(key); _moduleMockKeys.delete(spec); }catch{} };
  _activeRestores.push(restore);
  return restore;
}
function _unmockModule(spec){
  if(typeof __ekko_unmock_module!=='function')return;
  const key=_moduleMockKeys.has(spec)?_moduleMockKeys.get(spec):spec;
  __ekko_unmock_module(key);
  _moduleMockKeys.delete(spec);
}

const mock=Object.assign(function(impl){return _mockFn(impl);},{
  fn:_mockFn, method:_mockMethod, spyOn:(o,k)=>_mockMethod(o,k,undefined),
  restoreAll:_restoreAll,
  useFakeTimers:_useFakeTimers, useRealTimers:_useRealTimers,
  advanceTimersByTime:_advanceTimersByTime, tick:_advanceTimersByTime,
  runAllTimers:_runAllTimers, runOnlyPendingTimers:_runOnlyPendingTimers,
  setSystemTime:_setSystemTime,
  module:_mockModule, unmockModule:_unmockModule,
});

async function __runAll(){

  if(suites.length===0) return;
  let passed=0,failed=0,skipped=0;

  
  async function runSuite(s,prefix,beforeChain,afterChain){
    const pfx=prefix?(prefix+' > '+s.name):s.name;
    const bChain=beforeChain.concat(s.before);
    const aChain=s.after.concat(afterChain); 
    for(const fn of s.beforeAll) await fn();
    for(const t of s.tests){
      if(t.skip||(hasOnly&&!t.only)){skipped++;continue;}
      const label=(pfx?pfx+' > ':'')+t.name;
      let err=null;
      try{
        for(const fn of bChain) await fn();
        const r=t.fn(); if(r&&r.then) await r;
      }catch(e){err=e;}
      try{ for(const fn of aChain) await fn(); }catch(ae){ if(!err) err=ae; } 
      finally{ _restoreAll(); } 
      if(err){failed++; console.log('  ✗ '+label); console.log('    '+err.message);}
      else{passed++; console.log('  ✓ '+label);}
    }
    for(const c of s.children) await runSuite(c,pfx,bChain,aChain);
    for(const fn of s.afterAll) await fn();
  }
  for(const s of suites) await runSuite(s,'',[],[]);
  console.log('');
  console.log(passed+' passed, '+failed+' failed'+(skipped?', '+skipped+' skipped':''));
  Ekko.exit(failed>0?1:0);
}
_realSetTimeout(__runAll,0);
return {describe,test,expect,beforeEach,afterEach,beforeAll,afterAll,mock};
})()
