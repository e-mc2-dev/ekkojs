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
'use strict';
function _deepMerge(target,source){
  if(typeof target!=='object'||target===null||Array.isArray(target))return source;
  if(typeof source!=='object'||source===null||Array.isArray(source))return source;
  var out={};for(var k in target){if(Object.prototype.hasOwnProperty.call(target,k))out[k]=target[k];}
  for(var k in source){
    if(!Object.prototype.hasOwnProperty.call(source,k))continue;
    if(typeof source[k]==='object'&&source[k]!==null&&!Array.isArray(source[k])
       &&typeof out[k]==='object'&&out[k]!==null&&!Array.isArray(out[k])){
      out[k]=_deepMerge(out[k],source[k]);
    }else{out[k]=source[k];}
  }
  return out;
}

function atom(config){
  if(!config||typeof config.key!=='string'||!config.key)throw new Error('atom: key is required and must be a non-empty string');
  if(!('default' in config))throw new Error('atom: default value is required');
  return Object.freeze({
    key:config.key,
    default:config.default,
    persist:config.persist!==undefined?config.persist:true,
    __brand:'atom'
  });
}

function selector(config){
  if(!config||typeof config.key!=='string'||!config.key)throw new Error('selector: key is required and must be a non-empty string');
  if(typeof config.get!=='function')throw new Error('selector: get must be a function');
  return Object.freeze({
    key:config.key,
    get:config.get,
    __brand:'selector'
  });
}

class Mimir{
  constructor(){
    this._values=new Map();
    this._atoms=new Map();
    this._listeners=new Map();
    this._selectors=new Map();
    this._selectorDeps=new Map();
    this._sessionMode='none';
  }
  session(mode){
    if(mode!=='none'&&mode!=='ephemeral'&&mode!=='domain')throw new Error('Mimir.session: mode must be none, ephemeral, or domain');
    this._sessionMode=mode;
  }
  _ensureAtom(a){
    if(a.__brand==='selector'){
      if(!this._selectors.has(a.key))this._selectors.set(a.key,a);
      return;
    }
    if(a.__brand!=='atom')throw new Error('Mimir: expected atom or selector, got '+typeof a);
    if(!this._atoms.has(a.key)){
      this._atoms.set(a.key,a);
      if(!this._values.has(a.key))this._values.set(a.key,a.default);
    }
  }
  _computeSelector(sel,_stack){

    _stack=_stack||new Set();
    if(_stack.has(sel.key))throw new Error("Mimir: circular selector dependency at '"+sel.key+"'");
    _stack.add(sel.key);
    const deps=new Set();
    const self=this;
    const getter={ get:function(a){
      self._ensureAtom(a);
      deps.add(a.key);
      if(a.__brand==='selector'){
        const v=self._computeSelector(a,_stack);

        const sub=self._selectorDeps.get(a.key);
        if(sub)for(const d of sub)deps.add(d);
        return v;
      }
      return self._values.has(a.key)?self._values.get(a.key):a.default;
    }};
    const result=sel.get(getter);
    this._selectorDeps.set(sel.key,deps);
    _stack.delete(sel.key);
    return result;
  }
  get(a){
    this._ensureAtom(a);
    if(a.__brand==='selector')return this._computeSelector(a);
    return this._values.has(a.key)?this._values.get(a.key):a.default;
  }
  set(atom,valueOrUpdater){
    if(atom.__brand!=='atom')throw new Error('Mimir.set: can only set atoms, not selectors');
    this._ensureAtom(atom);
    const prev=this._values.get(atom.key);
    const next=typeof valueOrUpdater==='function'?valueOrUpdater(prev):valueOrUpdater;
    if(Object.is(prev,next))return;
    this._values.set(atom.key,next);
    this._notify(atom.key);
    this._notifyDependentSelectors(atom.key);
  }
  reset(atom){
    if(atom.__brand!=='atom')throw new Error('Mimir.reset: can only reset atoms');
    this._ensureAtom(atom);
    const prev=this._values.get(atom.key);
    const def=atom.default;
    if(Object.is(prev,def))return;
    this._values.set(atom.key,def);
    this._notify(atom.key);
    this._notifyDependentSelectors(atom.key);
  }
  subscribe(a,fn){
    if(typeof fn!=='function')throw new Error('Mimir.subscribe: callback must be a function');
    this._ensureAtom(a);
    const key=a.key;
    if(!this._listeners.has(key))this._listeners.set(key,new Set());
    this._listeners.get(key).add(fn);

    if(a.__brand==='selector'&&!this._selectorDeps.has(key)){
      try{this._computeSelector(a);}catch(_){}
    }
    return function(){
      const s=this._listeners.get(key);
      if(s){s.delete(fn);if(s.size===0)this._listeners.delete(key);}
    }.bind(this);
  }
  clearSession(){
    const keys=[];
    for(const[key,atomCfg]of this._atoms){
      const prev=this._values.get(key);
      this._values.set(key,atomCfg.default);
      if(!Object.is(prev,atomCfg.default))keys.push(key);
    }
    for(const key of keys){
      this._notify(key);
      this._notifyDependentSelectors(key);
    }
  }
  _notify(key){
    const s=this._listeners.get(key);
    if(!s)return;
    const val=this._values.get(key);
    for(const fn of s)fn(val);
  }
  _notifyDependentSelectors(changedKey){
    for(const[selKey,deps]of this._selectorDeps){
      if(deps.has(changedKey)){
        const s=this._listeners.get(selKey);
        if(s){
          const sel=this._selectors.get(selKey);
          if(sel){
            const val=this._computeSelector(sel);
            for(const fn of s)fn(val);
          }
        }
      }
    }
  }
  snapshot(){
    const out={};
    for(const[k,v]of this._values)out[k]=v;
    return out;
  }
  hydrate(atoms){
    if(!atoms||typeof atoms!=='object')return;
    for(const key in atoms){
      if(Object.prototype.hasOwnProperty.call(atoms,key)){
        this._values.set(key,atoms[key]);
      }
    }
  }
  initStore(serverAtoms){
    if(!serverAtoms||typeof serverAtoms!=='object')return;
    var changed=[];
    for(var key in serverAtoms){
      if(!Object.prototype.hasOwnProperty.call(serverAtoms,key))continue;
      var entry=serverAtoms[key];
      var prev=this._values.get(key);
      if(entry&&typeof entry==='object'&&entry.__force){
        this._values.set(key,entry.__value);
        if(!Object.is(prev,entry.__value))changed.push(key);
      }else if(entry&&typeof entry==='object'&&entry.__merge){
        if(this._values.has(key)){
          var merged=_deepMerge(this._values.get(key),entry.__value);
          this._values.set(key,merged);
          if(!Object.is(prev,merged))changed.push(key);
        }else{
          this._values.set(key,entry.__value);
          changed.push(key);
        }
      }else{
        if(!this._values.has(key)){
          this._values.set(key,entry);
          changed.push(key);
        }
      }
    }
    for(var i=0;i<changed.length;i++){
      this._notify(changed[i]);
      this._notifyDependentSelectors(changed[i]);
    }
  }
}

function createStore(){
  var values=new Map();
  var modes=new Map();
  var store={
    set:function(atom,value,opts){
      if(atom.__brand!=='atom')throw new Error('createStore.set: expected atom');
      values.set(atom.key,value);
      if(opts&&opts.force)modes.set(atom.key,'force');
      else if(opts&&opts.merge)modes.set(atom.key,'merge');
      return store;
    },
    dehydrate:function(){
      var out={};
      for(var e of values){
        var k=e[0],v=e[1];
        var m=modes.get(k);
        if(m==='force')out[k]={__force:true,__value:v};
        else if(m==='merge')out[k]={__merge:true,__value:v};
        else out[k]=v;
      }
      return out;
    }
  };
  return store;
}

const mimir=new Mimir();

function useAtom(a){
  mimir._ensureAtom(a);
  return [mimir.get(a),function(v){mimir.set(a,v);}];
}
function useAtomValue(readable){
  mimir._ensureAtom(readable);
  return mimir.get(readable);
}
function useSetAtom(a){
  if(a.__brand!=='atom')throw new Error('useSetAtom: expected atom');
  mimir._ensureAtom(a);
  return function(v){mimir.set(a,v);};
}
return {atom,selector,mimir,createStore,Mimir,useAtom,useAtomValue,useSetAtom};
})()