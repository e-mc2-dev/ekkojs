// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

(function(ops){

function _bytesToHex(buf){let r='';for(let i=0;i<buf.length;i++)r+=(buf[i]<16?'0':'')+buf[i].toString(16);return r;}
function _hexToBytes(hex){const b=new Uint8Array(hex.length/2);for(let i=0;i<b.length;i++)b[i]=parseInt(hex.substr(i*2,2),16);return b;}
function hashPassword(password,opts){
  if(!ops.pbkdf2||!ops.randomBytes)throw new Error('Password hashing requires ekko:crypto .NET library (PBKDF2)');
  opts=opts||{};
  const iterations=Math.max(opts.iterations||600000,600000);
  const keyLen=opts.keyLength||32;
  const algo=opts.algorithm||'sha256';
  const salt=new Uint8Array(ops.randomBytes(16));
  const saltHex=_bytesToHex(salt);
  const pwBytes=_strToBytes(typeof password==='string'?password:'');
  const derived=new Uint8Array(ops.pbkdf2(pwBytes,salt,iterations,algo,keyLen));
  const keyHex=_bytesToHex(derived);

  return saltHex+':'+iterations+':'+algo+':'+keyHex;
}
function verifyPassword(password,hash){
  if(!ops.pbkdf2)throw new Error('Password verification requires ekko:crypto .NET library (PBKDF2)');
  var salt,iterations,storedKey,algo='sha256',valid=false;
  if(hash&&hash.startsWith('$pbkdf2-')){
    var dp=hash.split('$').filter(Boolean);
    if(dp.length>=4){valid=true;var a=dp[0].split('-')[1];if(a)algo=a;iterations=parseInt(dp[1],10);salt=_hexToBytes(dp[2]);storedKey=dp[3];}
  }else{
    var parts=hash?hash.split(':'):[];
    if(parts.length>=4){valid=true;salt=_hexToBytes(parts[0]);iterations=parseInt(parts[1],10);algo=parts[2]||'sha256';storedKey=parts[3];}
    else if(parts.length===3){valid=true;salt=_hexToBytes(parts[0]);iterations=parseInt(parts[1],10);storedKey=parts[2];} 
  }
  if(!valid){salt=new Uint8Array(ops.randomBytes(16));iterations=600000;storedKey='0'.repeat(64);}
  const keyLen=storedKey.length/2;
  const pwBytes=_strToBytes(typeof password==='string'?password:'');
  const derived=new Uint8Array(ops.pbkdf2(pwBytes,salt,iterations,algo,keyLen));
  const derivedHex=_bytesToHex(derived);
  const len=Math.max(derivedHex.length,storedKey.length);
  let r=valid?0:1;
  for(let i=0;i<len;i++)r|=(derivedHex.charCodeAt(i)||0)^(storedKey.charCodeAt(i)||0);
  return r===0;
}

const _b64c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function _btoa(s){let r='';for(let i=0;i<s.length;i+=3){const a=s.charCodeAt(i),b=s.charCodeAt(i+1),c=s.charCodeAt(i+2);r+=_b64c[a>>2]+_b64c[((a&3)<<4)|(b>>4)]+((i+1<s.length)?_b64c[((b&15)<<2)|(c>>6)]:'=')+((i+2<s.length)?_b64c[c&63]:'=');}return r;}
function _atob(s){let r='';s=s.replace(/=/g,'');for(let i=0;i<s.length;i+=4){const a=_b64c.indexOf(s[i]),b=_b64c.indexOf(s[i+1]),c=_b64c.indexOf(s[i+2]),d=_b64c.indexOf(s[i+3]);r+=String.fromCharCode((a<<2)|(b>>4));if(c>=0)r+=String.fromCharCode(((b&15)<<4)|(c>>2));if(d>=0)r+=String.fromCharCode(((c&3)<<6)|d);}return r;}
function base64url(s){return _btoa(s).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
function base64urlDec(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return _atob(s);}
function _btoaBytes(buf){let r='';for(let i=0;i<buf.length;i+=3){const a=buf[i],b=buf[i+1],c=buf[i+2];r+=_b64c[a>>2]+_b64c[((a&3)<<4)|((b!==undefined?b:0)>>4)]+((i+1<buf.length)?_b64c[(((b!==undefined?b:0)&15)<<2)|((c!==undefined?c:0)>>6)]:'=')+((i+2<buf.length)?_b64c[(c!==undefined?c:0)&63]:'=');}return r;}
function base64urlBytes(buf){return _btoaBytes(buf).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
function _strToBytes(s){const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b;}
function _timingSafeEqual(a,b){if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0;}
function createJWT(payload,secret,opts){
  if(!ops.hmac)throw new Error('JWT requires ekko:crypto .NET library (HMAC-SHA256)');
  opts=opts||{};
  const header={alg:'HS256',typ:'JWT'};
  const now=Math.floor(Date.now()/1000);
  const claims={...payload,iat:now};
  if(opts.expiresIn)claims.exp=now+opts.expiresIn;
  if(opts.notBefore)claims.nbf=now+opts.notBefore; 
  if(opts.issuer)claims.iss=opts.issuer;
  if(opts.audience)claims.aud=opts.audience;

  
  const segments=base64urlBytes(new TextEncoder().encode(JSON.stringify(header)))+'.'+base64urlBytes(new TextEncoder().encode(JSON.stringify(claims)));
  const sig=base64urlBytes(new Uint8Array(ops.hmac('sha256',_strToBytes(secret),_strToBytes(segments))));
  return segments+'.'+sig;
}
function verifyJWT(token,secret,opts){
  if(!ops.hmac)throw new Error('JWT requires ekko:crypto .NET library (HMAC-SHA256)');
  opts=opts||{};
  if(typeof token!=='string')return null;
  const parts=token.split('.');
  if(parts.length!==3)return null;
  const expectedSig=base64urlBytes(new Uint8Array(ops.hmac('sha256',_strToBytes(secret),_strToBytes(parts[0]+'.'+parts[1]))));
  if(!_timingSafeEqual(expectedSig,parts[2]))return null;
  try{
    const payload=JSON.parse(new TextDecoder().decode(Uint8Array.from(base64urlDec(parts[1]),c=>c.charCodeAt(0))));
    const now=Math.floor(Date.now()/1000);
    if(payload.exp&&payload.exp<now)return null;
    
    if(payload.nbf&&payload.nbf>now)return null;
    
    if(opts.audience!==undefined&&payload.aud!==opts.audience)return null;
    if(opts.issuer!==undefined&&payload.iss!==opts.issuer)return null;
    return payload;
  }catch{return null;}
}

class SessionStore{
  constructor(opts){
    this._sessions=new Map();
    this._ttl=(opts&&opts.ttl)||3600;
    this._db=opts&&opts.db||null;
    if(this._db){
      try{this._db.exec('CREATE TABLE IF NOT EXISTS __sessions (id TEXT PRIMARY KEY, data TEXT, expires INT)');}catch{}
    }
  }
  create(data){
    const id=crypto.randomUUID();
    const expires=Date.now()+this._ttl*1000;
    if(this._db){try{const stmt=this._db.prepare('INSERT INTO __sessions (id,data,expires) VALUES (@id,@data,@expires)');stmt.exec({'@id':id,'@data':JSON.stringify(data),'@expires':expires});stmt.close();}catch(e){console.error('[session] DB write failed:',String(e));}}
    this._sessions.set(id,{data,expires});
    return id;
  }
  get(id){
    const s=this._sessions.get(id);
    if(s&&s.expires>Date.now())return s.data;
    if(s)this._sessions.delete(id);
    return null;
  }
  set(id,data){
    const expires=Date.now()+this._ttl*1000;
    this._sessions.set(id,{data,expires});
  }
  destroy(id){this._sessions.delete(id);}
  cleanup(){
    const now=Date.now();
    for(const[id,s]of this._sessions){if(s.expires<=now)this._sessions.delete(id);}
  }
}

function createAuth(opts){
  opts=opts||{};
  const secret=opts.secret||crypto.randomUUID();
  const cookieName=opts.cookie||'ekko_session';
  const store=new SessionStore({ttl:opts.sessionTTL||3600,db:opts.db||null});
  function sessionMiddleware(req,res,next){
    const sid=req.cookies&&req.cookies[cookieName];
    if(sid){const data=store.get(sid);if(data){req.session=data;req.sessionId=sid;req.user=data.user||null;}}
    if(!req.session)req.session={};
    req.login=function(user){req.user=user;req.session.user=user;const id=store.create(req.session);req.sessionId=id;res.cookie(cookieName,id,{httpOnly:true,secure:!!opts.secureCookies,maxAge:opts.sessionTTL||3600,path:'/'});};
    req.logout=function(){if(req.sessionId){store.destroy(req.sessionId);res.cookie(cookieName,'',{httpOnly:true,secure:!!opts.secureCookies,maxAge:0,path:'/'}); }req.user=null;req.session={};};
    next();
  }
  function required(){
    return function(req,res,next){if(!req.user){res.status(401).json({error:'Authentication required'});return;}next();};
  }
  function roles(...allowed){
    return function(req,res,next){
      if(!req.user){res.status(401).json({error:'Authentication required'});return;}
      const userRole=req.user.role||req.user.roles;
      const has=Array.isArray(userRole)?userRole.some(r=>allowed.includes(r)):allowed.includes(userRole);
      if(!has){res.status(403).json({error:'Forbidden — requires role: '+allowed.join(', ')});return;}
      next();
    };
  }
  
  const providers={};
  const BUILTIN_PROVIDERS={
    github:{authorizeUrl:'https://github.com/login/oauth/authorize',tokenUrl:'https://github.com/login/oauth/access_token',userInfoUrl:'https://api.github.com/user',scopes:['user:email'],mapUser(p){return{id:String(p.id),name:p.login||p.name,email:p.email,avatar:p.avatar_url};}},
    google:{authorizeUrl:'https://accounts.google.com/o/oauth2/v2/auth',tokenUrl:'https://oauth2.googleapis.com/token',userInfoUrl:'https://www.googleapis.com/oauth2/v2/userinfo',scopes:['openid','email','profile'],mapUser(p){return{id:p.id,name:p.name,email:p.email,avatar:p.picture};}},
    discord:{authorizeUrl:'https://discord.com/api/oauth2/authorize',tokenUrl:'https://discord.com/api/oauth2/token',userInfoUrl:'https://discord.com/api/users/@me',scopes:['identify','email'],mapUser(p){return{id:p.id,name:p.username,email:p.email,avatar:p.avatar?'https://cdn.discordapp.com/avatars/'+p.id+'/'+p.avatar+'.png':null};}},
  };
  function provider(nameOrConfig,config){
    let cfg;
    if(typeof nameOrConfig==='string'&&BUILTIN_PROVIDERS[nameOrConfig]){
      cfg={...BUILTIN_PROVIDERS[nameOrConfig],...(config||{}),name:nameOrConfig};
    }else if(typeof nameOrConfig==='object'){
      cfg=nameOrConfig;
    }else{
      cfg={name:nameOrConfig,...(config||{})};
    }
    if(!cfg.name)throw new Error('OAuth provider must have a name');
    if(!cfg.authorizeUrl)throw new Error('OAuth provider must have authorizeUrl');
    if(!cfg.tokenUrl)throw new Error('OAuth provider must have tokenUrl');
    if(!cfg.clientId)throw new Error('OAuth provider must have clientId');
    if(!cfg.clientSecret)throw new Error('OAuth provider must have clientSecret');
    if(!cfg.mapUser)cfg.mapUser=function(p){return{id:String(p.id||p.sub),name:p.name||p.login||p.username,email:p.email,avatar:p.avatar||p.picture};};
    providers[cfg.name]=cfg;
    return cfg;
  }
  function _generateCodeVerifier(){
    var bytes=_randomBytes(32);
    return base64urlBytes(bytes);
  }
  function _generateCodeChallenge(verifier){
    var hash=new Uint8Array(ops.hash('sha256',_strToBytes(verifier)));
    return base64urlBytes(hash);
  }
  function getAuthorizeUrl(providerName,redirectUri,state,codeChallenge){
    const p=providers[providerName];
    if(!p)throw new Error('Unknown provider: '+providerName);
    let qs='client_id='+encodeURIComponent(p.clientId)+'&redirect_uri='+encodeURIComponent(redirectUri)+'&response_type=code&scope='+encodeURIComponent((p.scopes||[]).join(' '));
    if(state)qs+='&state='+encodeURIComponent(state);
    if(codeChallenge)qs+='&code_challenge='+encodeURIComponent(codeChallenge)+'&code_challenge_method=S256';
    return p.authorizeUrl+'?'+qs;
  }
  async function handleCallback(providerName,code,redirectUri,codeVerifier){
    const p=providers[providerName];
    if(!p)throw new Error('Unknown provider: '+providerName);
    var tokenBody={client_id:p.clientId,client_secret:p.clientSecret,code,redirect_uri:redirectUri,grant_type:'authorization_code'};
    if(codeVerifier)tokenBody.code_verifier=codeVerifier;
    const tokenRes=await fetch(p.tokenUrl,{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(tokenBody),
    });
    const tokenData=await tokenRes.json();
    const accessToken=tokenData.access_token;
    if(!accessToken)throw new Error('OAuth token exchange failed: '+JSON.stringify(tokenData));
    if(!p.userInfoUrl)return{token:accessToken,profile:tokenData};
    const userRes=await fetch(p.userInfoUrl,{
      headers:{'Authorization':'Bearer '+accessToken,'Accept':'application/json'},
    });
    const profile=await userRes.json();
    const user=p.mapUser(profile);
    return{token:accessToken,profile,user};
  }
  function oauthRoutes(providerName,opts){
    opts=opts||{};
    const callbackPath=opts.callbackPath||'/auth/'+providerName+'/callback';
    const loginPath=opts.loginPath||'/auth/'+providerName;
    const baseUrl=opts.baseUrl||'http://localhost:'+(opts.port||3000);
    const redirectUri=baseUrl+callbackPath;
    const _safeRedirect=function(url){if(!url||typeof url!=='string')return '/';if(url.startsWith('/')&&!url.startsWith('//')){ return url;}return '/';};
    const onSuccess=opts.onSuccess||function(req,res,user){req.login(user);res.redirect(_safeRedirect(opts.successRedirect));};
    const onError=opts.onError||function(req,res,err){res.status(500).json({error:String(err)});};
    const _pendingStates=new Map();
    function _cleanStaleStates(){for(const[k,v]of _pendingStates){if(Date.now()-v.ts>300000)_pendingStates.delete(k);}}
    return{
      loginPath,
      callbackPath,
      loginHandler(req,res){
        _cleanStaleStates();
        if(_pendingStates.size>1000){_pendingStates.clear();}
        const state=crypto.randomUUID();
        const verifier=_generateCodeVerifier();
        const challenge=_generateCodeChallenge(verifier);
        _pendingStates.set(state,{ts:Date.now(),verifier:verifier});
        res.redirect(getAuthorizeUrl(providerName,redirectUri,state,challenge));
      },
      async callbackHandler(req,res){
        _cleanStaleStates();
        try{
          const qs=req.query||'';
          const code=qs.split('code=')[1]?.split('&')[0];
          if(!code){onError(req,res,new Error('No code in callback'));return;}
          const state=qs.split('state=')[1]?.split('&')[0];
          if(!state||!_pendingStates.has(state)){onError(req,res,new Error('Invalid or missing OAuth state — possible CSRF'));return;}
          const verifier=_pendingStates.get(state).verifier;
          _pendingStates.delete(state);
          const result=await handleCallback(providerName,code,redirectUri,verifier);
          if(opts.onUser){const u=await opts.onUser(result.user,result.profile,result.token);onSuccess(req,res,u||result.user);}
          else{onSuccess(req,res,result.user);}
        }catch(e){onError(req,res,e);}
      },
    };
  }
  return{
    session:sessionMiddleware,
    required,
    roles,
    store,
    hashPassword,
    verifyPassword,
    jwt:{
      sign(payload,expiresIn,opts){return createJWT(payload,secret,{expiresIn,...(opts||{})});},
      verify(token,opts){return verifyJWT(token,secret,opts);},
      decode(token){try{return JSON.parse(new TextDecoder().decode(Uint8Array.from(base64urlDec(token.split('.')[1]),c=>c.charCodeAt(0))));}catch{return null;}},
    },
    oauth:{ provider, getAuthorizeUrl, handleCallback, oauthRoutes, providers },
  };
}

var _B32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(buf){
  var r='',bits=0,val=0;
  for(var i=0;i<buf.length;i++){val=(val<<8)|buf[i];bits+=8;while(bits>=5){r+=_B32[(val>>>(bits-5))&31];bits-=5;}}
  if(bits>0)r+=_B32[(val<<(5-bits))&31];
  while(r.length%8)r+='=';
  return r;
}
function base32Decode(s){
  s=s.replace(/=+$/,'').toUpperCase();
  var out=[],bits=0,val=0;
  for(var i=0;i<s.length;i++){var idx=_B32.indexOf(s[i]);if(idx<0)continue;val=(val<<5)|idx;bits+=5;if(bits>=8){out.push((val>>>(bits-8))&255);bits-=8;}}
  return new Uint8Array(out);
}
function _hmacSha1(key,data){
  if(ops.hmac)return new Uint8Array(ops.hmac('sha1',key,data));
  throw new Error('HMAC-SHA1 not available — ekko:crypto .NET library required');
}
function _hashSha256(data){
  if(ops.hash)return new Uint8Array(ops.hash('sha256',data));
  throw new Error('SHA-256 not available');
}
function _hashHex(algo,data){
  if(ops.hashHex)return ops.hashHex(algo,data);
  throw new Error('hashHex not available');
}
function _randomBytes(n){
  if(ops.randomBytes)return new Uint8Array(ops.randomBytes(n));
  throw new Error('CSPRNG not available — ekko:crypto .NET library required');
}
function _toBytes(s){
  if(s instanceof Uint8Array)return s;
  if(typeof s==='string'){var b=new Uint8Array(s.length);for(var i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b;}
  return new Uint8Array(s);
}
function totpGenerate(opts){
  var secret=opts.secret;var time=opts.time||Math.floor(Date.now()/1000);
  var period=opts.period||30;var digits=opts.digits||6;
  var counter=Math.floor(time/period);
  var buf=new Uint8Array(8);
  for(var i=7;i>=0;i--){buf[i]=counter&0xff;counter=Math.floor(counter/256);}
  var key=base32Decode(secret);
  var hmac=_hmacSha1(key,buf);
  var offset=hmac[hmac.length-1]&0x0f;
  var code=((hmac[offset]&0x7f)<<24|(hmac[offset+1]&0xff)<<16|(hmac[offset+2]&0xff)<<8|(hmac[offset+3]&0xff))%Math.pow(10,digits);
  var s=String(code);while(s.length<digits)s='0'+s;
  return s;
}
function totpVerify(opts){
  var secret=opts.secret;var token=String(opts.token==null?'':opts.token);var window=opts.window!==undefined?opts.window:1;
  var time=opts.time||Math.floor(Date.now()/1000);var period=opts.period||30;var digits=opts.digits||6;

  
  var lastCounter=(opts.lastCounter!==undefined&&opts.lastCounter!==null)?opts.lastCounter:null;
  var match=null;
  for(var i=-window;i<=window;i++){
    var t=time+i*period;

    if(_timingSafeEqual(totpGenerate({secret:secret,time:t,period:period,digits:digits}),token)){
      match={delta:i,counter:Math.floor(t/period)};
    }
  }
  if(!match)return{valid:false};
  if(lastCounter!==null&&match.counter<=lastCounter)return{valid:false,reason:'replay',counter:match.counter};
  return{valid:true,delta:match.delta,counter:match.counter};
}
function totpSetup(opts){
  var issuer=opts.issuer||'EkkoApp';var account=opts.account||'user';
  var secretBytes=_randomBytes(20);
  var secret=base32Encode(secretBytes);
  var salt=_bytesToHex(_randomBytes(16));
  var backupCodes=[];var backupCodesHashed=[];
  var _codeChars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for(var i=0;i<10;i++){
    var raw=_randomBytes(8);var code='';
    for(var j=0;j<8;j++)code+=_codeChars[raw[j]%_codeChars.length];
    backupCodes.push(code);
    backupCodesHashed.push(_hashHex('sha256',_toBytes(salt+code)));
  }
  var otpauthUrl='otpauth://totp/'+encodeURIComponent(issuer)+':'+encodeURIComponent(account)+'?secret='+secret+'&issuer='+encodeURIComponent(issuer)+'&algorithm=SHA1&digits=6&period=30';
  var qrCode=generateQRCodeSVG(otpauthUrl);
  return{secret:secret,backupCodes:backupCodes,backupCodesHashed:{salt:salt,hashes:backupCodesHashed},otpauthUrl:otpauthUrl,qrCode:qrCode};
}
function totpVerifyBackup(opts){
  var token=opts.token;var hashedCodes=opts.hashedCodes;
  if(!hashedCodes||!hashedCodes.salt||!hashedCodes.hashes)throw new Error('totpVerifyBackup requires { salt, hashes } from totpSetup');
  var salt=hashedCodes.salt;
  var hashes=hashedCodes.hashes;
  var tokenHash=_hashHex('sha256',_toBytes(salt+token));
  var remaining=[];var found=false;
  for(var i=0;i<hashes.length;i++){
    if(!found&&hashes[i]===tokenHash){found=true;continue;}
    remaining.push(hashes[i]);
  }
  return{valid:found,remaining:{salt:salt,hashes:remaining}};
}

var _QR_EC_PARAMS=[
  [26,10,1,1,16,0,0],[44,16,1,1,28,0,0],[70,26,1,1,44,0,0],[100,18,2,2,32,0,0],
  [134,24,2,2,43,0,0],[172,16,4,4,27,0,0],[196,18,4,4,31,0,0],[242,22,4,2,38,2,39],
  [292,22,5,3,36,2,37],[346,26,5,4,43,1,44]
];
var _QR_ALIGN=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]];
var _qgExp=new Uint8Array(512),_qgLog=new Uint8Array(256);
(function(){var v=1;for(var i=0;i<255;i++){_qgExp[i]=v;_qgLog[v]=i;v<<=1;if(v>=256)v^=0x11D;}for(var i=255;i<512;i++)_qgExp[i]=_qgExp[i-255];})();
function _qgMul(a,b){if(a===0||b===0)return 0;return _qgExp[_qgLog[a]+_qgLog[b]];}
function _qrsEncode(data,ecCount){
  var gen=new Uint8Array(ecCount+1);gen[0]=1;
  for(var i=0;i<ecCount;i++){for(var j=ecCount;j>=1;j--){gen[j]=gen[j]^_qgMul(gen[j-1],_qgExp[i]);}}
  var result=new Uint8Array(ecCount);
  for(var i=0;i<data.length;i++){var coef=data[i]^result[0];for(var j=0;j<ecCount-1;j++){result[j]=result[j+1]^_qgMul(coef,gen[j+1]);}result[ecCount-1]=_qgMul(coef,gen[ecCount]);}
  return result;
}
function _qrEncodeData(text,version){
  var p=_QR_EC_PARAMS[version-1];
  var ecPerBlock=p[1],g1Blocks=p[3],g1DataCW=p[4],g2Blocks=p[5],g2DataCW=p[6];
  var totalDataCW=g1Blocks*g1DataCW+g2Blocks*g2DataCW;
  var tb=[];
  for(var i=0;i<text.length;i++){var c=text.charCodeAt(i);if(c<128)tb.push(c);else if(c<2048){tb.push(0xC0|(c>>6),0x80|(c&0x3F));}else{tb.push(0xE0|(c>>12),0x80|((c>>6)&0x3F),0x80|(c&0x3F));}}
  var bits=[];
  function pb(val,len){for(var i=len-1;i>=0;i--)bits.push((val>>i)&1);}
  pb(0x4,4);
  var cci=version<=9?8:16;pb(tb.length,cci);
  for(var i=0;i<tb.length;i++)pb(tb[i],8);
  var totalDataBits=totalDataCW*8;
  pb(0,Math.min(4,totalDataBits-bits.length));
  while(bits.length%8!==0)bits.push(0);
  var pad=[0xEC,0x11],pi=0;
  while(bits.length<totalDataBits){pb(pad[pi],8);pi=(pi+1)%2;}
  var dataBytes=new Uint8Array(totalDataCW);
  for(var i=0;i<totalDataCW;i++){var byte=0;for(var b=0;b<8;b++)byte=(byte<<1)|bits[i*8+b];dataBytes[i]=byte;}
  var dataBlocks=[],ecBlocks=[],off=0;
  for(var i=0;i<g1Blocks;i++){var blk=dataBytes.slice(off,off+g1DataCW);dataBlocks.push(blk);ecBlocks.push(_qrsEncode(blk,ecPerBlock));off+=g1DataCW;}
  for(var i=0;i<g2Blocks;i++){var blk=dataBytes.slice(off,off+g2DataCW);dataBlocks.push(blk);ecBlocks.push(_qrsEncode(blk,ecPerBlock));off+=g2DataCW;}
  var inter=[];var maxLen=Math.max(g1DataCW,g2DataCW||0);
  for(var i=0;i<maxLen;i++){for(var k=0;k<dataBlocks.length;k++){if(i<dataBlocks[k].length)inter.push(dataBlocks[k][i]);}}
  for(var i=0;i<ecPerBlock;i++){for(var k=0;k<ecBlocks.length;k++)inter.push(ecBlocks[k][i]);}
  return inter;
}
function _qrCreateMatrix(size){var m=[];for(var r=0;r<size;r++){m.push([]);for(var c=0;c<size;c++)m[r].push(null);}return m;}
function _qrFinder(m,row,col){
  var pat=[[1,1,1,1,1,1,1],[1,0,0,0,0,0,1],[1,0,1,1,1,0,1],[1,0,1,1,1,0,1],[1,0,1,1,1,0,1],[1,0,0,0,0,0,1],[1,1,1,1,1,1,1]];
  for(var r=0;r<7;r++)for(var c=0;c<7;c++)m[row+r][col+c]=pat[r][c]===1;
}
function _qrSeparators(m,size){
  for(var i=0;i<8;i++){
    if(i<size){m[7][i]=false;m[i][7]=false;}
    if(size-8+i<size){m[7][size-8+i]=false;m[i][size-8]=false;}
    if(size-8+i<size){m[size-8][i]=false;m[size-8+i][7]=false;}
  }
}
function _qrTiming(m,size){for(var i=8;i<size-8;i++){var v=i%2===0;if(m[6][i]===null)m[6][i]=v;if(m[i][6]===null)m[i][6]=v;}}
function _qrAlignOne(m,cr,cc){for(var r=-2;r<=2;r++)for(var c=-2;c<=2;c++){var v=Math.abs(r)===2||Math.abs(c)===2||(r===0&&c===0);m[cr+r][cc+c]=v;}}
function _qrAligns(m,version){
  var pos=_QR_ALIGN[version-1];if(pos.length===0)return;
  for(var a=0;a<pos.length;a++)for(var b=0;b<pos.length;b++){
    var row=pos[a],col=pos[b];
    if(row<=8&&col<=8)continue;
    if(row<=8&&col>=m.length-9)continue;
    if(row>=m.length-9&&col<=8)continue;
    _qrAlignOne(m,row,col);
  }
}
function _qrReserveFormat(m,size){
  for(var i=0;i<9;i++){if(i<size&&m[8][i]===null)m[8][i]=false;if(i<size&&m[i][8]===null)m[i][8]=false;}
  for(var i=0;i<8;i++){if(m[8][size-1-i]===null)m[8][size-1-i]=false;}
  for(var i=0;i<7;i++){if(m[size-1-i][8]===null)m[size-1-i][8]=false;}
  m[size-8][8]=true;
}
function _qrReserveVersion(m,version,size){
  if(version<7)return;
  for(var i=0;i<6;i++)for(var j=0;j<3;j++){m[size-11+j][i]=false;m[i][size-11+j]=false;}
}
function _qrPlaceData(m,data,size){
  var bits=[];for(var k=0;k<data.length;k++){for(var i=7;i>=0;i--)bits.push((data[k]>>i)&1);}
  var bitIdx=0,col=size-1,upward=true;
  while(col>=0){
    if(col===6)col--;
    var startRow=upward?size-1:0;var endRow=upward?-1:size;var step=upward?-1:1;
    for(var row=startRow;row!==endRow;row+=step){
      for(var c=0;c<=1;c++){
        var ac=col-c;if(ac<0)continue;if(m[row][ac]!==null)continue;
        if(bitIdx<bits.length){m[row][ac]=bits[bitIdx]===1;bitIdx++;}else{m[row][ac]=false;}
      }
    }
    col-=2;upward=!upward;
  }
}
function _qrFuncMask(size,version){
  var mask=[];for(var r=0;r<size;r++){mask.push([]);for(var c=0;c<size;c++)mask[r].push(false);}
  for(var r=0;r<9;r++)for(var c=0;c<9;c++){if(r<size&&c<size)mask[r][c]=true;}
  for(var r=0;r<9;r++)for(var c=size-8;c<size;c++){if(r<size&&c>=0)mask[r][c]=true;}
  for(var r=size-8;r<size;r++)for(var c=0;c<9;c++){if(r>=0&&c<size)mask[r][c]=true;}
  for(var i=8;i<size-8;i++){mask[6][i]=true;mask[i][6]=true;}
  var pos=_QR_ALIGN[version-1];
  if(pos.length>0){for(var a=0;a<pos.length;a++)for(var b=0;b<pos.length;b++){
    var row=pos[a],col=pos[b];
    if(row<=8&&col<=8)continue;if(row<=8&&col>=size-9)continue;if(row>=size-9&&col<=8)continue;
    for(var r=-2;r<=2;r++)for(var c=-2;c<=2;c++)mask[row+r][col+c]=true;
  }}
  if(version>=7){for(var i=0;i<6;i++)for(var j=0;j<3;j++){mask[size-11+j][i]=true;mask[i][size-11+j]=true;}}
  mask[size-8][8]=true;
  return mask;
}
function _qrApplyMask0(m,size,fm){
  var res=[];for(var r=0;r<size;r++){res.push([]);for(var c=0;c<size;c++){var val=m[r][c];if(fm[r][c]){res[r].push(val);}else{res[r].push((r+c)%2===0?!val:val);}}}
  return res;
}
function _qrFormatBits(maskPattern){
  var data=(0<<3)|maskPattern; 
  var bits=data<<10;var gen=0x537;
  for(var i=14;i>=10;i--){if(bits&(1<<i))bits^=(gen<<(i-10));}
  return ((data<<10)|bits)^0x5412;
}
function _qrWriteFormat(m,size,maskPattern){
  var fb=_qrFormatBits(maskPattern);
  var ba=[];for(var i=14;i>=0;i--)ba.push(((fb>>i)&1)===1);
  var h=[0,1,2,3,4,5,7,8];
  for(var i=0;i<8;i++)m[8][h[i]]=ba[i];
  var vr=[7,5,4,3,2,1,0];
  for(var i=0;i<7;i++)m[vr[i]][8]=ba[8+i];
  for(var i=0;i<7;i++)m[size-1-i][8]=ba[i];
  for(var i=0;i<8;i++)m[8][size-8+i]=ba[7+i];
}
function _qrVersionBits(version){
  if(version<7)return 0;
  var bits=version<<12;var gen=0x1F25;
  for(var i=17;i>=12;i--){if(bits&(1<<i))bits^=(gen<<(i-12));}
  return (version<<12)|bits;
}
function _qrWriteVersion(m,version,size){
  if(version<7)return;
  var vb=_qrVersionBits(version);
  for(var i=0;i<6;i++)for(var j=0;j<3;j++){var idx=i*3+j;var val=((vb>>idx)&1)===1;m[size-11+j][i]=val;m[i][size-11+j]=val;}
}
function _qrGenerate(text){
  var version=0;
  for(var v=1;v<=10;v++){
    var p=_QR_EC_PARAMS[v-1];var totalDataCW=p[3]*p[4]+p[5]*p[6];
    var cci=v<=9?8:16;var bc=0;
    for(var i=0;i<text.length;i++){var c=text.charCodeAt(i);if(c<128)bc++;else if(c<2048)bc+=2;else bc+=3;}
    if(4+cci+bc*8<=totalDataCW*8){version=v;break;}
  }
  if(version===0)throw new Error("QR: text too long for versions 1-10 (EC-M)");
  var size=17+version*4;
  var fm=_qrFuncMask(size,version);
  var cw=_qrEncodeData(text,version);
  var m=_qrCreateMatrix(size);
  _qrFinder(m,0,0);_qrFinder(m,0,size-7);_qrFinder(m,size-7,0);
  _qrSeparators(m,size);
  _qrTiming(m,size);
  _qrAligns(m,version);
  _qrReserveFormat(m,size);
  _qrReserveVersion(m,version,size);
  _qrPlaceData(m,cw,size);
  var masked=_qrApplyMask0(m,size,fm);
  _qrWriteFormat(masked,size,0);
  _qrWriteVersion(masked,version,size);
  return masked;
}
function generateQRCodeSVG(data){
  var grid=_qrGenerate(data);
  var size=grid.length;var scale=4;var margin=4;
  var totalSize=(size+margin*2)*scale;
  var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+totalSize+' '+totalSize+'" width="'+totalSize+'" height="'+totalSize+'"><rect width="'+totalSize+'" height="'+totalSize+'" fill="#fff"/>';
  for(var y=0;y<size;y++){for(var x=0;x<size;x++){if(grid[y][x]){svg+='<rect x="'+((x+margin)*scale)+'" y="'+((y+margin)*scale)+'" width="'+scale+'" height="'+scale+'" fill="black"/>';}}}
  svg+='</svg>';
  return 'data:image/svg+xml;base64,'+_btoa(svg);
}
var totp={
  setup:totpSetup,
  generate:totpGenerate,
  verify:totpVerify,
  verifyBackup:totpVerifyBackup,
  base32Encode:function(buf){return base32Encode(buf instanceof Uint8Array?buf:_toBytes(buf));},
  base32Decode:base32Decode,
};
return {createAuth:createAuth,totp:totp};
})