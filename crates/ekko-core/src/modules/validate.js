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
class VError extends Error{constructor(issues){super(issues.map(i=>i.path.join('.')+': '+i.message).join(', '));this.name='ValidationError';this.issues=issues;}}
class Schema{
  constructor(t,checks,opt){this._type=t;this._checks=checks||[];this._optional=opt||false;this._nullable=false;this._default=undefined;this._hasDefault=false;}
  _clone(extra){const s=new Schema(this._type,[...this._checks,...(extra||[])],this._optional);s._nullable=this._nullable;s._default=this._default;s._hasDefault=this._hasDefault;

    s._itemSchema=this._itemSchema;s._shape=this._shape;s._schemas=this._schemas;s._valueSchema=this._valueSchema;s._literalValue=this._literalValue;s._enumValues=this._enumValues;
    s._trim=this._trim;
    return s;}
  optional(){const s=this._clone();s._optional=true;return s;}
  nullable(){const s=this._clone();s._nullable=true;return s;}
  default(v){const s=this._clone();s._default=v;s._hasDefault=true;return s;}
  parse(val){const r=this.safeParse(val);if(!r.success)throw new VError(r.error.issues);return r.data;}
  safeParse(val){const issues=[];const data=this._validate(val,[],issues,0);if(issues.length>0)return{success:false,error:{issues}};return{success:true,data};}
  _validate(val,path,issues,depth){

    
    depth=depth||0;
    if(depth>512)throw new Error('validate: schema/input nesting exceeds 512 levels (denial-of-service guard)');
    if(val===undefined){if(this._hasDefault)return this._default;if(this._optional)return undefined;issues.push({path,message:'Required'});return val;}
    if(val===null){if(this._nullable)return null;issues.push({path,message:'Expected non-null'});return val;}
    
    if(this._trim&&typeof val==='string')val=val.trim();

    let result=val;
    if(this._type==='string'){if(typeof val!=='string'){issues.push({path,message:'Expected string, got '+typeof val});return val;}}
    else if(this._type==='number'){if(typeof val!=='number'||Number.isNaN(val)){issues.push({path,message:'Expected number'});return val;}}
    else if(this._type==='boolean'){if(typeof val!=='boolean'){issues.push({path,message:'Expected boolean'});return val;}}
    else if(this._type==='date'){if(!(val instanceof Date)||isNaN(val.getTime())){issues.push({path,message:'Expected valid Date'});return val;}}
    else if(this._type==='literal'){if(val!==this._literalValue){issues.push({path,message:'Expected '+JSON.stringify(this._literalValue)});return val;}}
    else if(this._type==='enum'){if(!this._enumValues.includes(val)){issues.push({path,message:'Expected one of: '+this._enumValues.join(', ')});return val;}}
    else if(this._type==='array'){
      if(!Array.isArray(val)){issues.push({path,message:'Expected array'});return val;}
      result=val.map((item,i)=>this._itemSchema._validate(item,[...path,String(i)],issues,depth+1));
    }
    else if(this._type==='object'){
      if(typeof val!=='object'||val===null||Array.isArray(val)){issues.push({path,message:'Expected object'});return val;}
      const out={};for(const[k,s]of Object.entries(this._shape)){out[k]=s._validate(val[k],[...path,k],issues,depth+1);}
      result=out;
    }
    else if(this._type==='union'){

      for(const s of this._schemas){const tmp=[];const r=s._validate(val,path,tmp,depth+1);if(tmp.length===0)return r;}
      issues.push({path,message:'No matching union type'});return val;
    }
    else if(this._type==='record'){
      if(typeof val!=='object'||val===null){issues.push({path,message:'Expected object'});return val;}
      const out={};for(const[k,v]of Object.entries(val)){out[k]=this._valueSchema._validate(v,[...path,k],issues,depth+1);}
      result=out;
    }
    for(const c of this._checks){if(!c.check(val))issues.push({path,message:c.message});}
    return result;
  }
}
const z={
  string(){return new Schema('string');},
  number(){return new Schema('number');},
  boolean(){return new Schema('boolean');},
  date(){return new Schema('date');},
  any(){return new Schema('any');},
  unknown(){return new Schema('any');},
  literal(v){const s=new Schema('literal');s._literalValue=v;return s;},
  enum(vals){const s=new Schema('enum');s._enumValues=vals;return s;},
  array(item){const s=new Schema('array');s._itemSchema=item;return s;},
  object(shape){const s=new Schema('object');s._shape=shape;return s;},
  union(schemas){const s=new Schema('union');s._schemas=schemas;return s;},
  record(valSchema){const s=new Schema('record');s._valueSchema=valSchema;return s;},
  infer:function(){},
};
Schema.prototype.min=function(n){return this._clone([{check:v=>(typeof v==='string'||Array.isArray(v))?v.length>=n:v>=n,message:'Must be at least '+n}]);};
Schema.prototype.max=function(n){return this._clone([{check:v=>(typeof v==='string'||Array.isArray(v))?v.length<=n:v<=n,message:'Must be at most '+n}]);};
Schema.prototype.email=function(){return this._clone([{check:v=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),message:'Invalid email'}]);};
Schema.prototype.url=function(){return this._clone([{check:v=>/^https?:\/\/.+/.test(v),message:'Invalid URL'}]);};
Schema.prototype.uuid=function(){return this._clone([{check:v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),message:'Invalid UUID'}]);};
Schema.prototype.regex=function(re){return this._clone([{check:v=>re.test(v),message:'Does not match pattern'}]);};
Schema.prototype.int=function(){return this._clone([{check:v=>Number.isInteger(v),message:'Expected integer'}]);};
Schema.prototype.positive=function(){return this._clone([{check:v=>v>0,message:'Must be positive'}]);};
Schema.prototype.nonnegative=function(){return this._clone([{check:v=>v>=0,message:'Must be non-negative'}]);};
Schema.prototype.nonempty=function(){return this._clone([{check:v=>v.length>0,message:'Must not be empty'}]);};
Schema.prototype.trim=function(){const s=this._clone();s._trim=true;return s;};
z.body=function(schema){return function(req,res,next){const r=schema.safeParse(req.json?req.json():JSON.parse(req.body||'null'));if(!r.success){res.status(400).json({error:'Validation failed',issues:r.error.issues});return;}req.validated=r.data;next();};};
z.query=function(schema){return function(req,res,next){const q={};if(req.query){const qs=req.query.startsWith('?')?req.query.slice(1):req.query;qs.split('&').forEach(p=>{const[k,v]=p.split('=');if(k)q[decodeURIComponent(k)]=v?decodeURIComponent(v):'';});}const r=schema.safeParse(q);if(!r.success){res.status(400).json({error:'Validation failed',issues:r.error.issues});return;}req.validated=r.data;next();};};
z.params=function(schema){return function(req,res,next){const r=schema.safeParse(req.params||{});if(!r.success){res.status(400).json({error:'Validation failed',issues:r.error.issues});return;}req.validated=r.data;next();};};
return {z};
})()