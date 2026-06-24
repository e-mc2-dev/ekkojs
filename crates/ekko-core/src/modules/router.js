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
var SAFE_SEGMENT=/^[A-Za-z0-9_-]+$/;

function validateUrl(url){
  var qi=url.indexOf('?');
  var path=qi>=0?url.slice(0,qi):url;
  var qs=qi>=0?url.slice(qi+1):'';
  var segs=path.split('/').filter(Boolean);
  for(var i=0;i<segs.length;i++){if(!SAFE_SEGMENT.test(segs[i]))return false;}
  if(qs){
    if(/&&/.test(qs)||qs.charAt(0)==='&'||qs.charAt(qs.length-1)==='&')return false;
    var pairs=qs.split('&');
    for(var i=0;i<pairs.length;i++){
      var eq=pairs[i].indexOf('=');
      if(eq<0)return false;
      var k=pairs[i].slice(0,eq),v=pairs[i].slice(eq+1);
      if(!k||!SAFE_SEGMENT.test(k))return false;
      if(v&&!SAFE_SEGMENT.test(v))return false;
    }
  }
  return true;
}

function matchPath(pattern,actual){
  if(pattern===actual)return true;
  var pp=pattern.split('/').filter(Boolean);
  var ap=actual.split('/').filter(Boolean);
  for(var i=0;i<pp.length;i++){
    if(pp[i].charAt(0)==='*')return ap.length>=i+1;
    if(i>=ap.length)return false;
    if(pp[i].charAt(0)!==':'&&pp[i].charAt(0)!=='{'&&pp[i]!==ap[i])return false;
  }
  return pp.length===ap.length;
}

function extractParams(pattern,actual){
  var pp=pattern.split('/').filter(Boolean);
  var ap=actual.split('/').filter(Boolean);
  var p={};
  for(var i=0;i<pp.length;i++){
    if(pp[i].charAt(0)==='*'){p[pp[i].slice(1)]=ap.slice(i).map(decodeURIComponent);break;}
    if(pp[i].charAt(0)===':')p[pp[i].slice(1)]=decodeURIComponent(ap[i]||'');
    else if(pp[i].charAt(0)==='{')p[pp[i].slice(1,-1)]=decodeURIComponent(ap[i]||'');
  }
  return p;
}

function parseQuery(s){
  var q={};
  if(!s)return q;
  if(s.charAt(0)==='?')s=s.slice(1);
  if(!s)return q;
  var pairs=s.split('&');
  for(var i=0;i<pairs.length;i++){
    var eq=pairs[i].indexOf('=');
    if(eq>=0){var k=pairs[i].slice(0,eq);if(k)q[k]=pairs[i].slice(eq+1);}
  }
  return q;
}

function createRouter(config){
  config=config||{};
  var routes=config.routes||[];
  var backRules=config.backRules||[];
  var onBeforeNavigate=config.onBeforeNavigate||null;
  var notFound=config.notFound||null;
  var beforeUnload=config.beforeUnload||[];

  for(var ri=0;ri<routes.length;ri++){
    var r=routes[ri];
    var segments=r.path.split('/').filter(Boolean);
    for(var si=0;si<segments.length;si++){
      var seg=segments[si];
      if(seg.charAt(0)!==':'&&seg.charAt(0)!=='*'&&!SAFE_SEGMENT.test(seg)){
        throw new Error('Invalid route segment: '+seg+' in '+r.path);
      }
    }
  }

  return{
    routes:routes,
    backRules:backRules,
    onBeforeNavigate:onBeforeNavigate,
    notFound:notFound,
    beforeUnload:beforeUnload,

    match:function(url){
      var pathOnly=url.split('?')[0];
      if(!validateUrl(url))return null;
      for(var i=0;i<routes.length;i++){
        if(matchPath(routes[i].path,pathOnly))return routes[i];
      }
      return null;
    },

    resolve:function(url){
      var pathOnly=url.split('?')[0];
      if(!validateUrl(url))return{error:'invalid_url'};
      for(var i=0;i<routes.length;i++){
        if(matchPath(routes[i].path,pathOnly)){
          var params=extractParams(routes[i].path,pathOnly);
          var route=routes[i];
          if(route.guard){
            var guardFn=typeof route.guard==='function'?route.guard:(route.guard.check||null);
            if(guardFn){
              var gr=guardFn();
              if(gr===false){
                var rd=typeof route.guard==='object'?route.guard.redirect:null;
                return{guarded:true,redirect:rd||null};
              }
              if(typeof gr==='string')return{guarded:true,redirect:gr};
            }
          }
          return{route:route,params:params,query:parseQuery(url.split('?')[1]||'')};
        }
      }
      return null;
    },

    toManifest:function(){
      return routes.map(function(r){
        var gm=null;
        if(r.guard)gm={redirect:(typeof r.guard==='object'?r.guard.redirect:null)||null};
        return{pattern:r.path,page:r.page||null,guard:gm};
      });
    },

    toClientConfig:function(){
      return{
        backRules:backRules.map(function(r){
          var mv,mt;
          if(r.match instanceof RegExp){mv=r.match.source;mt='regex';}
          else if(typeof r.match==='function'){mv=null;mt='skip';}
          else{mv=String(r.match);mt='string';}
          return{match:mv,matchType:mt,goTo:r.goTo||null,skip:r.skip||null};
        }),
        beforeUnload:beforeUnload,
      };
    },
  };
}

function useRouter(){
  return{path:'/',params:{},query:{},navigate:function(){},back:function(){},forward:function(){}};
}
function useParams(){return{};}
function useSearchParams(){return{};}
function navigate(){}

return{
  createRouter:createRouter,
  useRouter:useRouter,
  useParams:useParams,
  useSearchParams:useSearchParams,
  navigate:navigate,
  validateUrl:validateUrl,
  matchPath:matchPath,
  extractParams:extractParams,
};
})()