// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

(function(ops,getMimir,ssr){

var renderToString=ssr.renderToString;
var escapeHtml=ssr.escapeHtml;
var htmlShell=ssr.htmlShell;
var serializeProps=ssr.serializeProps;
var __raw=ssr.__raw;
var getRenderer=ssr.getRenderer;

function createStyleCollector(){
  var collected={};
  return{
    add:function(id,css){collected[id]=css;},
    getStyles:function(){var out='';for(var id in collected)out+='<style data-ekko-styled="'+id+'">'+collected[id]+'</style>';return out;},
    getStylesArray:function(){var arr=[];for(var id in collected)arr.push({id:id,css:collected[id]});return arr;},
    reset:function(){collected={};},
    has:function(id){return!!collected[id];},
  };
}

function readManifest(path){
  var p=path||'.ekko/build/manifest.json';
  try{var bytes=ops.readStaticFile(p);var text=new TextDecoder().decode(bytes);return JSON.parse(text);}catch(e){return{hydrate:null,pages:{},chunks:[]};}
}

var __CONVENTION_FILES=/^(layout|loading|error|not-found|_layout|_error|route)\.(tsx|jsx|ts|js)$/;
function scanRoutes(dir){
  dir=dir||'pages';
  var files=ops.scanDir(dir);
  var routes=[];
  for(var i=0;i<files.length;i++){
    var f=files[i];
    var ext=f.match(/\.(tsx|jsx|ts|js)$/);
    if(!ext)continue;
    if(f.indexOf('.test.')!==-1)continue;
    var basename=f.split('/').pop()||'';
    if(__CONVENTION_FILES.test(basename))continue;
    var route=f.slice(0,f.length-ext[0].length);
    route=route.replace(/\(([^)]+)\)\//g,'');
    route=route.replace(/\(([^)]+)\)$/g,'');
    route=route.replace(/\[\.\.\.([^\]]+)\]/g,'*$1');
    route=route.replace(/\[([^\]]+)\]/g,':$1');
    if(route==='index'||route.endsWith('/index'))route=route.slice(0,route.length-5)||'/';
    if(route!=='/'){route='/'+route;route=route.replace(/\/$/,'');}
    var isDynamic=route.indexOf(':')>=0;
    var isCatchAll=route.indexOf('*')>=0;
    var priority=isCatchAll?2:isDynamic?1:0;
    routes.push({pattern:route,file:f,pageKey:f,dynamic:isDynamic||isCatchAll,catchAll:isCatchAll,priority:priority});
  }
  routes.sort(function(a,b){
    if(a.priority!==b.priority)return a.priority-b.priority;
    return a.pattern<b.pattern?-1:a.pattern>b.pattern?1:0;
  });
  return routes;
}

function composeLayouts(layoutTree,routePattern,pageHtml){
  var segments=routePattern.split('/').filter(Boolean);
  var paths=[''];
  var cur='';
  for(var i=0;i<segments.length;i++){cur+=(cur?'/':'')+segments[i];paths.push(cur);}
  var html=pageHtml;
  for(var i=paths.length-1;i>=0;i--){
    var seg=paths[i];
    var node=layoutTree[seg];
    if(node&&node.layouts.length>0){
      for(var j=node.layouts.length-1;j>=0;j--){
        var layoutFn=node.layouts[j].render;
        if(layoutFn)html=renderToString(layoutFn({children:__raw(html)}));
      }
    }
  }
  return html;
}

function findErrorHandler(layoutTree,routePattern){
  var segments=routePattern.split('/').filter(Boolean);
  var cur='';
  for(var i=segments.length-1;i>=0;i--){
    cur=segments.slice(0,i+1).join('/');
    if(layoutTree[cur]&&layoutTree[cur].error)return layoutTree[cur].error;
  }
  if(layoutTree['']&&layoutTree[''].error)return layoutTree[''].error;
  return null;
}

function cssModule(path){return ops.cssModule(path);}

function makeAssetUrl(cdn,prefix){
  prefix=prefix||'/_ekko/';
  if(!cdn||!cdn.length)return function(f){return prefix+f;};
  var bases=cdn.map(function(d){return String(d).replace(/\/+$/,'');});
  return function(f){
    var h=0;for(var i=0;i<f.length;i++){h=(h*31+f.charCodeAt(i))>>>0;}
    return bases[h%bases.length]+prefix+f;
  };
}

function resolvePageAssets(manifest,pageKey,prefix,cdn){
  prefix=prefix||'/_ekko/';
  var assetUrl=makeAssetUrl(cdn,prefix);
  var result={modules:[],modulepreload:[],pageFile:null,styles:[]};
  if(manifest.hydrate){result.modules.push(assetUrl(manifest.hydrate));result.modulepreload.push(assetUrl(manifest.hydrate));var hEntry=manifest.pages&&manifest.pages['_hydrate.js'];if(hEntry&&hEntry.imports){for(var i=0;i<hEntry.imports.length;i++)result.modulepreload.push(assetUrl(hEntry.imports[i]));}}
  var globalStyles=manifest.styles||[];
  for(var i=0;i<globalStyles.length;i++)result.styles.push(assetUrl(globalStyles[i]));
  var entry=manifest.pages&&manifest.pages[pageKey];
  if(!entry&&manifest.pages&&pageKey){

    
    var _stem=pageKey.replace(/\.(tsx|jsx|ts|js|mjs)$/,'');
    for(var _pk in manifest.pages){ if(_pk.replace(/\.(tsx|jsx|ts|js|mjs)$/,'')===_stem){ entry=manifest.pages[_pk]; break; } }
  }
  if(entry){
    var file=typeof entry==='string'?entry:entry.file;
    result.pageFile=assetUrl(file);
    result.modulepreload.push(assetUrl(file));
    var imports=entry.imports||[];
    for(var i=0;i<imports.length;i++)result.modulepreload.push(assetUrl(imports[i]));
    var css=entry.css||[];
    for(var i=0;i<css.length;i++)result.styles.push(assetUrl(css[i]));
  }
  var layoutKey=null;if(manifest.pages){for(var _k in manifest.pages){if(_k.match(/layout\.(tsx|jsx|ts|js)$/)&&!_k.match(/\//)){layoutKey=_k;break;}}}
  if(layoutKey){var le=manifest.pages[layoutKey];if(le){result.modulepreload.push(assetUrl(typeof le==='string'?le:le.file));if(le.imports){for(var i=0;i<le.imports.length;i++)result.modulepreload.push(assetUrl(le.imports[i]));}}}
  var seen={};result.modulepreload=result.modulepreload.filter(function(u){if(seen[u])return false;seen[u]=true;return true;});
  return result;
}

function createApp(opts){
  opts=opts||{};
  const port=opts.port||3000;
  const host=opts.host||'0.0.0.0';
  const manifest=opts.manifest||null;
  const routes=[];
  const apiRoutes=[];
  const middlewares=[];
  let layoutFn=null;
  var _layoutTree=opts.layouts||null;
  var _notFoundFn=opts.notFound||null;
  var _errorFn=opts.error||null;
  var _render=opts.render||null;
  var _router=opts.router||null;
  var _routerConfig=_router&&typeof _router.toClientConfig==='function'?_router.toClientConfig():{};
  var _ssrStrategy=opts.ssr||'eager';
  var _lang=opts.lang||'en';

  var _cdn=opts.cdn?(Array.isArray(opts.cdn)?opts.cdn:[opts.cdn]).filter(function(d){return d;}):[];
  var _cache=new Map();
  var _clientRoutes=null;
  var _layoutFile=null;

  function _resolveAssets(route){
    var pageKey=route.meta.page||null;
    var pageStyles=opts.styles||[];
    var pageModules=opts.modules||[];
    var pagePreloads=opts.modulepreload||[];
    var pageFile=null;
    if(manifest&&pageKey){
      var assets=resolvePageAssets(manifest,pageKey,'/_ekko/',_cdn);
      pageModules=assets.modules;
      pagePreloads=assets.modulepreload;
      pageFile=assets.pageFile;
      if(assets.styles&&assets.styles.length)pageStyles=(opts.styles||[]).concat(assets.styles);
    }
    return{pageStyles:pageStyles,pageModules:pageModules,pagePreloads:pagePreloads,pageFile:pageFile};
  }

  function _rootLayoutFn(){
    if(_layoutTree&&_layoutTree['']&&_layoutTree[''].layouts&&_layoutTree[''].layouts[0]&&_layoutTree[''].layouts[0].render)return _layoutTree[''].layouts[0].render;
    return layoutFn||null;
  }

  
  
  function _renderBody(comp,routePath,meta){
    var ext=getRenderer&&getRenderer();
    if(ext){
      var pageEl=comp?ext.createElement(comp,{}):null;
      var rl=_rootLayoutFn();
      return renderToString(rl?ext.createElement(rl,{children:pageEl}):pageEl);
    }
    var body=comp?renderToString(comp({})):'';
    if(_layoutTree)body=composeLayouts(_layoutTree,routePath,body);
    else if(layoutFn)body=renderToString(layoutFn({children:__raw(body),meta:meta}));
    return body;
  }

  function _ssrRender(route){
    var ssrFn=route.component.ssr||(route.component.default?route.component.default.ssr:null)||null;
    var comp=typeof route.component==='function'?route.component:(route.component&&route.component.default?route.component.default:route.component);
    var ssrResult={};
    if(ssrFn){ssrResult=ssrFn()||{};}
    var __atoms=ssrResult.__atoms||undefined;
    var __m=getMimir();
    if(__atoms&&__m){
      for(var k in __atoms){
        if(!Object.prototype.hasOwnProperty.call(__atoms,k))continue;
        var v=__atoms[k];
        __m._values.set(k,(v&&typeof v==='object'&&(v.__force||v.__merge))?v.__value:v);
      }
    }
    var body;
    try{body=_renderBody(comp,route.path,route.meta);}catch(e){console.error('[SSR error]',String(e.stack||e));body='<pre>SSR error: internal error</pre>';}
    var a=_resolveAssets(route);
    var __sm2=getMimir();var __sm=undefined;if(__sm2&&__sm2._sessionMode!=='none')__sm=__sm2._sessionMode;
    var data={page:a.pageFile,props:{},__atoms:__atoms,__user:null,__sessionMode:__sm,__routes:_clientRoutes,__routerConfig:_routerConfig,__layout:_layoutFile};
    var html=htmlShell({lang:_lang,title:ssrResult.title||route.meta.title||'EkkoJS',body:body,styles:a.pageStyles,scripts:opts.scripts,modules:a.pageModules,data:data,head:ssrResult.head||route.meta.head,modulepreload:a.pagePreloads,inlineStyles:route.meta.inlineStyles||''});
    var ttl=(route.meta.ttl||0)*1000;
    var tags=route.meta.tags||[];
    _cache.set(route.path,{html:html,atoms:__atoms,timestamp:Date.now(),ttl:ttl,tags:tags});
    return html;
  }

  function _serveShell(route,req,res){
    var a=_resolveAssets(route);
    var __sm3=getMimir();var __sm=undefined;if(__sm3&&__sm3._sessionMode!=='none')__sm=__sm3._sessionMode;
    var __shellAtoms={};
    var data={page:a.pageFile,props:{params:req.params,query:req.query,path:req.path},__atoms:__shellAtoms,__user:req.user||null,__sessionMode:__sm,__routes:_clientRoutes,__routerConfig:_routerConfig,__layout:_layoutFile};
    var body=_renderBody(null,route.path,route.meta);
    var html=htmlShell({lang:_lang,title:route.meta.title||'EkkoJS',body:body,styles:a.pageStyles,scripts:opts.scripts,modules:a.pageModules,data:data,head:route.meta.head,modulepreload:a.pagePreloads});
    res.html(html);
  }

  const app={
    page(path,component,pageMeta){routes.push({path:path,component:component,meta:pageMeta||{}});return app;},

    routes(o){var inc=o&&o.all;var out=[];for(var i=0;i<routes.length;i++){var p=routes[i].path;if(inc||(p.indexOf(':')<0&&p.indexOf('*')<0))out.push(p);}return out;},
    api(method,path){
      var args=Array.prototype.slice.call(arguments,2);
      var apiOpts=typeof args[0]==='object'&&typeof args[0]!=='function'?args.shift():{};
      var handler=args[args.length-1];
      apiRoutes.push({method:method.toUpperCase(),path:path,handler:handler,opts:apiOpts});
      return app;
    },
    layout(fn){layoutFn=fn;return app;},
    use(mw){middlewares.push(mw);return app;},
    pages(dir,components,pageMetas){
      var scanned=scanRoutes(dir||'pages');
      components=components||{};pageMetas=pageMetas||{};
      for(var i=0;i<scanned.length;i++){
        var r=scanned[i];
        var comp=components[r.file]||components[r.pattern];
        var meta=pageMetas[r.file]||pageMetas[r.pattern]||{};
        meta.page=meta.page||r.pageKey;meta.title=meta.title||r.pattern;
        if(comp)routes.push({path:r.pattern,component:comp,meta:meta});
      }
      return app;
    },
    invalidate(pathOrTag){
      if(pathOrTag==='*'){
        _cache.clear();
        for(var i=0;i<routes.length;i++){var r=routes[i];var hasSsr=r.component.ssr||(r.component.default&&r.component.default.ssr)||null;var isDyn=r.path.indexOf(':')>=0||r.path.indexOf('*')>=0;if(hasSsr&&!isDyn)_ssrRender(r);}
        return;
      }
      if(pathOrTag.charAt(0)==='/'){
        _cache.delete(pathOrTag);
        for(var i=0;i<routes.length;i++){var r=routes[i];if(r.path===pathOrTag){var hasSsr=r.component.ssr||(r.component.default&&r.component.default.ssr)||null;if(hasSsr)_ssrRender(r);}}
        return;
      }
      for(var entry of _cache){if(entry[1].tags&&entry[1].tags.indexOf(pathOrTag)>=0)_cache.delete(entry[0]);}
      for(var i=0;i<routes.length;i++){var r=routes[i];if(r.meta.tags&&r.meta.tags.indexOf(pathOrTag)>=0){var hasSsr=r.component.ssr||(r.component.default&&r.component.default.ssr)||null;var isDyn=r.path.indexOf(':')>=0||r.path.indexOf('*')>=0;if(hasSsr&&!isDyn)_ssrRender(r);}}
    },
    start(){
      const server=ops.createServer({port:port,host:host,tls:opts.tls,http2:opts.http2,maxBodySize:opts.maxBodySize,maxWsMessageSize:opts.maxWsMessageSize});
      for(const mw of middlewares)server.use(mw);
      server.static('/_ekko','.ekko/build/client',{maxAge:31536000,immutable:true});
      var __hmrSockets=[];
      var __hmrTimer=null;
      server.ws('/__ekko_hmr',function(sock){__hmrSockets.push(sock);sock.on('close',function(){__hmrSockets=__hmrSockets.filter(function(s){return s!==sock;});});});
      try{var __hmrFile='.ekko/build/client/__hmr';var __hmrId=null;try{__hmrId=ops.readText(__hmrFile).trim();}catch(e){}__hmrTimer=setInterval(function(){try{var id=ops.readText(__hmrFile).trim();if(__hmrId&&id!==__hmrId){__hmrId=id;for(var i=0;i<__hmrSockets.length;i++){try{__hmrSockets[i].send('reload');}catch(e){}}}}catch(e){}},300);}catch(e){}
      function wrapApiHandler(handler){
        return function(req,res){
          try{
            var result=handler(req,res);
            if(result!==undefined&&!res._sent){
              if(typeof result==='object'&&result!==null)res.json(result);
              else res.send(String(result));
            }
          }catch(e){console.error('[API error]',String(e.stack||e));res.status(500).json({error:String(e.message||e)});}
        };
      }
      
      var _methodsByPath = Object.create(null);
      for(const api of apiRoutes){
        if(api.method==='__405') continue; 
        (_methodsByPath[api.path] || (_methodsByPath[api.path]=[])).push(api.method);
        if(api.method==='GET')server.get(api.path,api.opts||{},wrapApiHandler(api.handler));
        else if(api.method==='POST')server.post(api.path,api.opts||{},wrapApiHandler(api.handler));
        else if(api.method==='PUT')server.put(api.path,api.opts||{},wrapApiHandler(api.handler));
        else if(api.method==='DELETE')server.delete(api.path,api.opts||{},wrapApiHandler(api.handler));
        else if(api.method==='PATCH')server.patch(api.path,api.opts||{},wrapApiHandler(api.handler));
      }

      var _ALL_METHODS=['GET','POST','PUT','DELETE','PATCH'];
      for(var _p405 in _methodsByPath){
        (function(path,allowed){
          var _pageOwnsGet=routes.some(function(r){return r.path===path;});
          _ALL_METHODS.forEach(function(m){
            if(allowed.indexOf(m)>=0)return;
            if(m==='GET'&&_pageOwnsGet)return;
            var register=m==='GET'?server.get:m==='POST'?server.post:m==='PUT'?server.put:m==='DELETE'?server.delete:m==='PATCH'?server.patch:null;
            if(register)register.call(server,path,function(req,res){
              res.status(405).header('Allow',allowed.join(', ')).json({error:'Method Not Allowed',allowed:allowed});
            });
          });
        })(_p405,_methodsByPath[_p405]);
      }

      
      if(opts.seo){
        var _seo=opts.seo;
        var _hasApi=function(p){for(var i=0;i<apiRoutes.length;i++){if(apiRoutes[i].path===p)return true;}return false;};
        if(typeof _seo.sitemapXml==='function'&&!_hasApi('/sitemap.xml')){
          server.get('/sitemap.xml',function(req,res){
            var auto=[];for(var i=0;i<routes.length;i++){var rp=routes[i].path;if(rp.indexOf(':')<0&&rp.indexOf('*')<0)auto.push({path:rp});}
            res.header('content-type','application/xml; charset=utf-8');res.send(_seo.sitemapXml(auto));
          });
        }
        if(typeof _seo.robotsTxt==='function'&&!_hasApi('/robots.txt')){
          server.get('/robots.txt',function(req,res){res.header('content-type','text/plain; charset=utf-8');res.send(_seo.robotsTxt());});
        }
      }
      if(manifest&&manifest.pages){var _layoutAssetUrl=makeAssetUrl(_cdn,'/_ekko/');for(var _lk in manifest.pages){if(_lk.match(/layout\.(tsx|jsx|ts|js)$/)&&!_lk.match(/\//)){var _le=manifest.pages[_lk];_layoutFile=_layoutAssetUrl(typeof _le==='string'?_le:_le.file);break;}}}
      _clientRoutes=[];
      for(var _ri=0;_ri<routes.length;_ri++){
        var _r=routes[_ri];var _pk=_r.meta.page||null;var _pf=null;
        if(manifest&&_pk){var _a=resolvePageAssets(manifest,_pk,'/_ekko/',_cdn);_pf=_a.pageFile;}
        var _gm=null;if(_r.meta.guard){_gm={redirect:(typeof _r.meta.guard==='object'?_r.meta.guard.redirect:null)||null};}
        _clientRoutes.push({pattern:_r.path,pageFile:_pf,guard:_gm});
      }
      _clientRoutes.sort(function(a,b){var pa=a.pattern.indexOf('*')>=0?2:a.pattern.indexOf(':')>=0?1:0;var pb=b.pattern.indexOf('*')>=0?2:b.pattern.indexOf(':')>=0?1:0;if(pa!==pb)return pa-pb;return a.pattern<b.pattern?-1:a.pattern>b.pattern?1:0;});

      for(const route of routes){
        var _isDynamic=route.path.indexOf(':')>=0||route.path.indexOf('*')>=0;
        var _hasSsr=route.component.ssr||(route.component.default&&route.component.default.ssr)||null;
        if(_hasSsr&&!_isDynamic){
          (function(route){server.get(route.path,function(req,res){
            var cached=_cache.get(route.path);
            if(cached&&(cached.ttl===0||Date.now()-cached.timestamp<cached.ttl)){var h=cached.html;if(req.user)h=h.replace('"__user":null','"__user":'+JSON.stringify(serializeProps(req.user)));res.html(h);return;}
            try{res.html(_ssrRender(route));}catch(e){console.error('[SSR error]',route.path,String(e.stack||e));
              var _eb='<section class="section"><div class="container"><h1>500</h1><p class="lead">Something went wrong on our end. Please try again.</p><a href="/" class="btn btn-primary">Back home</a></div></section>';
              if(_errorFn){try{var _ex=getRenderer&&getRenderer();_eb=_ex?renderToString(_ex.createElement(_errorFn,{error:e})):renderToString(_errorFn({error:e}));}catch(_e){}}
              res.status(500).html(htmlShell({lang:_lang,title:'Server error',body:_eb,head:opts.head,styles:opts.styles}));
            }
          });})(route);
        }else{
          (function(route){server.get(route.path,function(req,res){_serveShell(route,req,res);});})(route);
        }
      }
      if(_notFoundFn){server.get('*',function(req,res){

        var _ext=getRenderer&&getRenderer();var b;
        if(_ext){var rl=_rootLayoutFn();var pageEl=_ext.createElement(_notFoundFn,{path:req.path});b=renderToString(rl?_ext.createElement(rl,{children:pageEl}):pageEl);}
        else{b=renderToString(_notFoundFn({path:req.path}));if(_layoutTree)b=composeLayouts(_layoutTree,req.path,b);}
        res.status(404).html(htmlShell({lang:_lang,title:'Page not found',body:b,head:opts.head,styles:opts.styles}));
      });}
      if(opts.static)server.static(opts.staticPrefix||'/static',opts.static);

      var ssrRoutes=[];
      for(var i=0;i<routes.length;i++){var r=routes[i];var hasSsr=r.component.ssr||(r.component.default&&r.component.default.ssr)||null;var isDyn=r.path.indexOf(':')>=0||r.path.indexOf('*')>=0;var strategy=r.meta.ssr||_ssrStrategy;if(hasSsr&&!isDyn&&strategy!=='lazy')ssrRoutes.push(r);}
      if(_ssrStrategy==='eager'||ssrRoutes.length>0){
        var eagerRoutes=ssrRoutes.filter(function(r){return(r.meta.ssr||_ssrStrategy)==='eager';});
        for(var i=0;i<eagerRoutes.length;i++){try{_ssrRender(eagerRoutes[i]);}catch(e){console.error('SSR error for '+eagerRoutes[i].path+': '+e.message);}}
        if(eagerRoutes.length>0)console.log('SSR cache: '+eagerRoutes.length+' pages rendered (eager)');
      }
      var url=server.start();
      console.log('EkkoJS SSR listening on '+url);
      var bgRoutes=ssrRoutes.filter(function(r){return(r.meta.ssr||_ssrStrategy)==='background';});
      if(bgRoutes.length>0){
        setTimeout(function(){
          for(var i=0;i<bgRoutes.length;i++){if(!_cache.has(bgRoutes[i].path)){try{_ssrRender(bgRoutes[i]);}catch(e){console.error('SSR bg error for '+bgRoutes[i].path+': '+e.message);}}}
          console.log('SSR cache: '+bgRoutes.length+' pages rendered (background)');
        },0);
      }
      return{server:server,url:url,stop:function(){if(__hmrTimer){clearInterval(__hmrTimer);__hmrTimer=null;}server.stop();},invalidate:app.invalidate,cache:_cache};
    },
    renderToString:renderToString,
    htmlShell:htmlShell,
    resolvePageAssets:function(pageKey,prefix){return resolvePageAssets(manifest||{},pageKey,prefix);},
  };
  return app;
}

return{createApp:createApp,scanRoutes:scanRoutes,readManifest:readManifest,resolvePageAssets:resolvePageAssets,
  cssModule:cssModule,createStyleCollector:createStyleCollector};
})
