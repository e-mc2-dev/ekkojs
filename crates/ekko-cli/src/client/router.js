// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import{useState,useEffect,createElement}from"@ekko/react";

function Link(props){props=props||{};var p={href:props.href||props.to||'/','data-nav':'','data-ekko-prefetch':props.prefetch!==false?'true':'false',children:props.children||''};if(props.className)p.className=props.className;if(props.style)p.style=props.style;return createElement('a',p);}
var _l=[];function _n(){for(var i=0;i<_l.length;i++)_l[i]();}
function _pq(s){var q={};if(!s)return q;if(s.charAt(0)==='?')s=s.slice(1);if(!s)return q;var p=s.split('&');for(var i=0;i<p.length;i++){var e=p[i].indexOf('=');if(e>=0){var k=p[i].slice(0,e);if(k)q[k]=p[i].slice(e+1);}}return q;}
var _p=typeof window!=='undefined'&&window.__ekko_router_params?window.__ekko_router_params:{};
function useRouter(){var s=useState(0),f=s[1];useEffect(function(){var c=function(){f(function(n){return n+1;});};_l.push(c);return function(){_l=_l.filter(function(x){return x!==c;});};},[]);return{path:typeof location!=='undefined'?location.pathname:'/',params:_p,query:typeof location!=='undefined'?_pq(location.search):{},navigate:function(t,o){navigate(t,o);},back:function(){history.back();},forward:function(){history.forward();}};}

function useParams(){var s=useState(0),f=s[1];useEffect(function(){var c=function(){f(function(n){return n+1;});};_l.push(c);return function(){_l=_l.filter(function(x){return x!==c;});};},[]);return(typeof window!=='undefined'&&window.__ekko_router_params)?window.__ekko_router_params:_p;}
function useSearchParams(){var s=useState(0),f=s[1];useEffect(function(){var c=function(){f(function(n){return n+1;});};_l.push(c);return function(){_l=_l.filter(function(x){return x!==c;});};},[]);return typeof location!=='undefined'?_pq(location.search):{};}
function navigate(t,o){if(typeof window!=='undefined'&&window.__ekko_navigate)window.__ekko_navigate(t,o);}
function createRouter(){return{};}
if(typeof window!=='undefined'){window.__ekko_router_notify=_n;window.__ekko_router_set_params=function(p){_p=p;window.__ekko_router_params=p;};}
export{createRouter,useRouter,useParams,useSearchParams,navigate,Link};
