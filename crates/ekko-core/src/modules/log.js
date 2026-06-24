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
let logLevel=1;
const levels={debug:0,info:1,warn:2,error:3};

function safeStringify(e){
  const seen=new WeakSet();
  try{
    return JSON.stringify(e,function(k,v){
      if(typeof v==='bigint')return v.toString()+'n';
      if(typeof v==='object'&&v!==null){ if(seen.has(v))return '[Circular]'; seen.add(v); }
      return v;
    });
  }catch(err){
    try{ return JSON.stringify({level:(e&&e.level)||'error',ts:e&&e.ts,msg:String(e&&e.msg),
          _logError:String((err&&err.message)||err)}); }
    catch(_){ return '{"level":"error","msg":"<unserializable log entry>"}'; }
  }
}
function line(level,logger,ctx,msg,fields){
  if(levels[level]<logLevel)return;
  const e={level,ts:new Date().toISOString()};
  if(logger)e.logger=logger; Object.assign(e,ctx); e.msg=msg; if(fields)Object.assign(e,fields);
  console.error(safeStringify(e));
}
function mkLogger(name,ctx){ return {
  info(m,f){line('info',name,ctx,m,f);},
  warn(m,f){line('warn',name,ctx,m,f);},
  error(m,f){line('error',name,ctx,m,f);},
  debug(m,f){line('debug',name,ctx,m,f);},
  child(extra){return mkLogger(name,{...ctx,...extra});},
};}
const log=mkLogger(null,{});
log.setLevel=function(l){logLevel=levels[l]??1;};
return {log, createLogger:mkLogger};
})()