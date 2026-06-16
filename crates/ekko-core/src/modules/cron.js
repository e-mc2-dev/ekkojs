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
function parseCron(expr){
  const parts=expr.split(/\s+/);
  if(parts.length!==5)return null;
  function parseField(s,min,max){
    if(s==='*')return null;

    function chk(n){if(!Number.isInteger(n)||n<min||n>max)throw new Error('Invalid cron field "'+s+'" (expected '+min+'-'+max+')');return n;}
    if(s.startsWith('*/')){const n=parseInt(s.slice(2),10);if(!Number.isInteger(n)||n<1||n>max)throw new Error('Invalid cron step "'+s+'"');return{step:n};}
    const vals=s.split(',').map(v=>{
      if(v.includes('-')){const[a,b]=v.split('-').map(Number);if(!Number.isInteger(a)||!Number.isInteger(b)||a>b)throw new Error('Invalid cron range "'+v+'"');const r=[];for(let i=a;i<=b;i++)r.push(chk(i));return r;}
      return[chk(parseInt(v,10))];
    }).flat();
    return{values:vals};
  }
  return{minute:parseField(parts[0],0,59),hour:parseField(parts[1],0,23),
    day:parseField(parts[2],1,31),month:parseField(parts[3],1,12),
    weekday:parseField(parts[4],0,6)};
}
function matchesCron(parsed,date){
  function match(field,val){if(!field)return true;if(field.step)return val%field.step===0;return field.values.includes(val);}
  return match(parsed.minute,date.getMinutes())&&match(parsed.hour,date.getHours())
    &&match(parsed.day,date.getDate())&&match(parsed.month,date.getMonth()+1)
    &&match(parsed.weekday,date.getDay());
}
const schedules=[];
let timer=null;
const cron={
  schedule(name,expr,handler,opts){
    opts=opts||{};
    const parsed=parseCron(expr);
    if(!parsed)throw new Error('Invalid cron expression: '+expr);
    const s={name,expr,parsed,handler,opts,running:false,lastRun:null,runCount:0};
    schedules.push(s);
    return s;
  },
  once(name,dateOrMs,handler){
    const ms=typeof dateOrMs==='number'?dateOrMs-Date.now():dateOrMs.getTime()-Date.now();
    if(ms>0)setTimeout(()=>{try{handler();}catch(e){console.error('cron once error:',e);}},ms);
    return{name,type:'once'};
  },
  start(){
    if(timer)return;
    function tick(){
      const now=new Date();
      for(const s of schedules){
        if(s.running)continue;
        if(matchesCron(s.parsed,now)){
          if(s.lastRun&&now.getMinutes()===new Date(s.lastRun).getMinutes()&&now.getHours()===new Date(s.lastRun).getHours())continue;
          s.running=true;s.lastRun=Date.now();s.runCount++;
          Promise.resolve().then(()=>s.handler()).then(()=>{s.running=false;}).catch(e=>{s.running=false;console.error('cron error ['+s.name+']:',e);});
        }
      }
    }
    timer=setInterval(tick,30000);
    tick();
  },
  stop(){if(timer){clearInterval(timer);timer=null;}},
  list(){return schedules.map(s=>({name:s.name,expr:s.expr,running:s.running,lastRun:s.lastRun,runCount:s.runCount}));},
  remove(name){const i=schedules.findIndex(s=>s.name===name);if(i>=0)schedules.splice(i,1);},
};
return {cron};
})()