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

function __raw(html){return{__rawHtml:true,html:html};}

function renderToString(element){
  if(element==null||element===false)return '';
  if(typeof element==='string')return escapeHtml(element);
  if(typeof element==='number')return String(element);
  if(Array.isArray(element))return element.map(renderToString).join('');
  if(typeof element!=='object')return '';
  if(element.__rawHtml)return element.html;
  if(!element.type&&element.__jsx)return renderToString(element.props&&element.props.children||'');
  const{type,props}=element;
  if(typeof type==='function'){return renderToString(type(props||{}));}
  if(typeof type==='symbol')return renderToString(props&&props.children||'');
  const tag=type||'div';
  let attrs='';
  const children=[];
  if(props){
    for(const[k,v]of Object.entries(props)){
      if(k==='children'){children.push(v);continue;}
      if(k==='className')attrs+=' class="'+escapeHtml(String(v))+'"';
      else if(k==='htmlFor')attrs+=' for="'+escapeHtml(String(v))+'"';
      else if(typeof v==='boolean'){if(v)attrs+=' '+k;}
      else if(k==='style'&&typeof v==='object'&&v!==null){var ss='';for(var sk in v){var sv=v[sk];var dk=sk.replace(/([A-Z])/g,'-$1').toLowerCase();ss+=dk+':'+sv+';';}attrs+=' style="'+escapeHtml(ss)+'"';}
      else if(k!=='key'&&k!=='ref'&&typeof v!=='function')attrs+=' '+k+'="'+escapeHtml(String(v))+'"';
    }
  }
  const voidTags=new Set(['br','hr','img','input','meta','link','area','base','col','embed','source','track','wbr']);
  if(voidTags.has(tag))return '<'+tag+attrs+' />';
  const inner=children.map(c=>Array.isArray(c)?c.map(renderToString).join(''):renderToString(c)).join('');
  return '<'+tag+attrs+'>'+inner+'</'+tag+'>';
}

function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

function jsonForScript(v){
  return JSON.stringify(v).replace(/[<>&]/g,function(c){
    return "\\u"+("000"+c.charCodeAt(0).toString(16)).slice(-4);
  });
}

function serializeProps(value){
  const seen=new WeakSet();
  return _ser(value,'');
  function _ser(val,path){
    if(val===null)return null;
    if(val===undefined)return undefined;
    const t=typeof val;
    if(t==='function')throw new Error('serializeProps: cannot serialize function at \''+(path||'root')+'\'');
    if(t==='symbol')throw new Error('serializeProps: cannot serialize Symbol at \''+(path||'root')+'\'');
    if(t==='bigint')throw new Error('serializeProps: cannot serialize BigInt at \''+(path||'root')+'\'. Convert to string first.');
    if(t==='number'){
      if(Number.isNaN(val))throw new Error('serializeProps: cannot serialize NaN at \''+(path||'root')+'\'');
      if(!Number.isFinite(val))throw new Error('serializeProps: cannot serialize Infinity at \''+(path||'root')+'\'');
      return val;
    }
    if(t==='string'||t==='boolean')return val;
    if(val instanceof Date){
      if(isNaN(val.getTime()))throw new Error('serializeProps: cannot serialize Invalid Date at \''+(path||'root')+'\'');
      return val.toISOString();
    }
    if(val instanceof RegExp)throw new Error('serializeProps: cannot serialize RegExp at \''+(path||'root')+'\'. Props must be plain objects.');
    if(val instanceof Map)throw new Error('serializeProps: cannot serialize Map at \''+(path||'root')+'\'. Convert to object first.');
    if(val instanceof Set)throw new Error('serializeProps: cannot serialize Set at \''+(path||'root')+'\'. Convert to array first.');
    if(t==='object'){
      if(seen.has(val))throw new Error('serializeProps: circular reference at \''+(path||'root')+'\'');
      seen.add(val);
      if(Array.isArray(val))return val.map(function(item,i){return _ser(item,path+'['+i+']');});
      var result={};
      for(var k of Object.keys(val)){
        var s=_ser(val[k],path?path+'.'+k:k);
        if(s!==undefined)result[k]=s;
      }
      return result;
    }
    return val;
  }
}

function htmlShell(opts){
  opts=opts||{};
  const title=opts.title||'EkkoJS App';
  const head=opts.head||'';
  const body=opts.body||'';
  const scripts=opts.scripts||[];
  const styles=opts.styles||[];
  const modules=opts.modules||[];
  const data=opts.data;
  const preloads=opts.modulepreload||[];
  const inlineStyles=opts.inlineStyles||'';
  var lang=opts.lang||'en';
  return '<!DOCTYPE html><html lang="'+escapeHtml(String(lang))+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    +'<title>'+escapeHtml(title)+'</title>'
    +styles.map(s=>'<link rel="stylesheet" href="'+escapeHtml(String(s))+'">').join('')
    +inlineStyles
    +preloads.map(s=>'<link rel="modulepreload" href="'+escapeHtml(String(s))+'">').join('')
    +head
    +'</head><body><div id="__ekko">'+body+'</div>'
    +(data!==undefined?'<script id="__EKKO_DATA__" type="application/json">'+jsonForScript(serializeProps(data))+'</script>':'')
    +scripts.map(s=>'<script src="'+escapeHtml(String(s))+'"></script>').join('')
    +modules.map(s=>'<script type="module" src="'+escapeHtml(String(s))+'"></script>').join('')
    +'</body></html>';
}

var _ext=null;
function registerRenderer(r){_ext=r;}
function getRenderer(){return _ext;}
function renderDispatch(element){return _ext?_ext.renderToString(element):renderToString(element);}

return{renderToString:renderDispatch,registerRenderer:registerRenderer,getRenderer:getRenderer,escapeHtml:escapeHtml,htmlShell:htmlShell,serializeProps:serializeProps,__raw:__raw};
})()
