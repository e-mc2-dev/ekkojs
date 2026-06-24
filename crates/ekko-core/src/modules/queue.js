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
function createQueue(name,opts){
  opts=opts||{};
  const concurrency=opts.concurrency||1;
  const retries=opts.retries||0;
  const backoff=opts.backoff||'fixed';
  const jobs=[];
  let handlers=[];
  let running=0;
  let jobId=0;
  function add(data,jobOpts){
    jobOpts=jobOpts||{};
    const job={id:++jobId,name,data,status:'pending',attempts:0,
      maxRetries:jobOpts.retries!=null?jobOpts.retries:retries,
      priority:jobOpts.priority||0,
      delay:jobOpts.delay||0,
      createdAt:Date.now(),scheduledAt:Date.now()+(jobOpts.delay||0),
      result:null,error:null};
    jobs.push(job);
    setTimeout(()=>processNext(),job.delay);
    return job;
  }
  function process(handler){
    handlers.push(handler);
    processNext();
  }
  function processNext(){
    if(handlers.length===0)return;
    while(running<concurrency){
      const now=Date.now();
      const pending=jobs.filter(j=>j.status==='pending'&&j.scheduledAt<=now)
        .sort((a,b)=>b.priority-a.priority);
      if(pending.length===0)break;
      const job=pending[0];
      job.status='active'; running++;
      const handler=handlers[0];
      Promise.resolve().then(()=>handler(job)).then(result=>{
        job.status='completed';job.result=result;running--;processNext();
      }).catch(err=>{
        job.attempts++;
        if(job.attempts<=job.maxRetries){
          job.status='pending';
          const delay=backoff==='exponential'?Math.pow(2,job.attempts)*1000:1000;
          job.scheduledAt=Date.now()+delay;
          running--;setTimeout(()=>processNext(),delay);
        }else{
          job.status='failed';job.error=String(err);running--;processNext();
        }
      });
    }
  }
  return{
    name,
    add,
    process,
    getJob(id){return jobs.find(j=>j.id===id)||null;},
    getJobs(status){return status?jobs.filter(j=>j.status===status):[...jobs];},
    pending(){return jobs.filter(j=>j.status==='pending');},
    active(){return jobs.filter(j=>j.status==='active');},
    completed(){return jobs.filter(j=>j.status==='completed');},
    failed(){return jobs.filter(j=>j.status==='failed');},
    counts(){return{pending:jobs.filter(j=>j.status==='pending').length,active:jobs.filter(j=>j.status==='active').length,completed:jobs.filter(j=>j.status==='completed').length,failed:jobs.filter(j=>j.status==='failed').length,total:jobs.length};},
    clear(status){if(status){const keep=jobs.filter(j=>j.status!==status);jobs.length=0;jobs.push(...keep);}else{jobs.length=0;}},
  };
}
return {createQueue};
})()