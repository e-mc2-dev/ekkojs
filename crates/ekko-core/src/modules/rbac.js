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
var _DDL=[
"CREATE TABLE IF NOT EXISTS rbac_roles (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT DEFAULT '', is_system INT DEFAULT 0, created_at INT DEFAULT 0)",
"CREATE TABLE IF NOT EXISTS rbac_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT DEFAULT '', parent_id TEXT DEFAULT '', created_at INT DEFAULT 0)",
"CREATE TABLE IF NOT EXISTS rbac_permissions (id TEXT PRIMARY KEY, resource TEXT NOT NULL, action TEXT NOT NULL, description TEXT DEFAULT '', UNIQUE(resource, action))",
"CREATE TABLE IF NOT EXISTS rbac_role_permissions (role_id TEXT NOT NULL, permission_id TEXT NOT NULL, effect TEXT NOT NULL DEFAULT 'grant', PRIMARY KEY (role_id, permission_id))",
"CREATE TABLE IF NOT EXISTS rbac_user_roles (user_id TEXT NOT NULL, role_id TEXT NOT NULL, PRIMARY KEY (user_id, role_id))",
"CREATE TABLE IF NOT EXISTS rbac_user_groups (user_id TEXT NOT NULL, group_id TEXT NOT NULL, PRIMARY KEY (user_id, group_id))",
"CREATE TABLE IF NOT EXISTS rbac_group_roles (group_id TEXT NOT NULL, role_id TEXT NOT NULL, PRIMARY KEY (group_id, role_id))",
"CREATE TABLE IF NOT EXISTS rbac_user_permissions (user_id TEXT NOT NULL, permission_id TEXT NOT NULL, effect TEXT NOT NULL DEFAULT 'grant', PRIMARY KEY (user_id, permission_id))",
"CREATE TABLE IF NOT EXISTS rbac_group_permissions (group_id TEXT NOT NULL, permission_id TEXT NOT NULL, effect TEXT NOT NULL DEFAULT 'grant', PRIMARY KEY (group_id, permission_id))",
"CREATE INDEX IF NOT EXISTS idx_rbac_groups_parent ON rbac_groups(parent_id)",
"CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_user ON rbac_user_roles(user_id)",
"CREATE INDEX IF NOT EXISTS idx_rbac_user_groups_user ON rbac_user_groups(user_id)",
"CREATE INDEX IF NOT EXISTS idx_rbac_group_roles_group ON rbac_group_roles(group_id)",
"CREATE INDEX IF NOT EXISTS idx_rbac_role_perms_role ON rbac_role_permissions(role_id)",
"CREATE INDEX IF NOT EXISTS idx_rbac_user_perms_user ON rbac_user_permissions(user_id)",
"CREATE INDEX IF NOT EXISTS idx_rbac_group_perms_group ON rbac_group_permissions(group_id)"
];
function _uuid(){return crypto.randomUUID();}
function _now(){return Math.floor(Date.now()/1000);}
function matchPerm(permStr,resource,action){
  var i=permStr.indexOf(':');if(i<0)return false;
  var pr=permStr.substring(0,i),pa=permStr.substring(i+1);
  return(pr===resource||pr==='*')&&(pa===action||pa==='*');
}
function _matchRA(p,resource,action){
  return(p.resource===resource||p.resource==='*')&&(p.action===action||p.action==='*');
}
function createRBAC(opts){
  var db=opts.db;if(!db)throw new Error('createRBAC: db (ekko:orm connection) is required');

  
  var _cache=Object.create(null);
  function _invalidate(userId){if(userId)delete _cache[userId];else _cache=Object.create(null);}
  function initialize(){for(var i=0;i<_DDL.length;i++)db.exec(_DDL[i]);}
  
  function createRole(name,o){
    o=o||{};var id=_uuid();
    db.from('rbac_roles').insert({id:id,name:name,description:o.description||'',is_system:o.isSystem?1:0,created_at:_now()}).exec();
    return{id:id,name:name};
  }
  function deleteRole(name){
    var r=db.from('rbac_roles').where({name:name}).first();
    if(!r)throw new Error('Role not found: '+name);
    if(r.is_system)throw new Error('Cannot delete system role: '+name);
    db.from('rbac_role_permissions').where({role_id:r.id}).delete().exec();
    db.from('rbac_user_roles').where({role_id:r.id}).delete().exec();
    db.from('rbac_group_roles').where({role_id:r.id}).delete().exec();
    db.from('rbac_roles').where({id:r.id}).delete().exec();
    _invalidate();
  }
  function getRole(name){return db.from('rbac_roles').where({name:name}).first();}
  function listRoles(){return db.from('rbac_roles').orderBy('name').toArray();}
  
  function createGroup(name,o){
    o=o||{};var parentId='';
    if(o.parent){var pg=db.from('rbac_groups').where({name:o.parent}).first();if(!pg)throw new Error('Parent group not found: '+o.parent);parentId=pg.id;}
    var id=_uuid();
    db.from('rbac_groups').insert({id:id,name:name,description:o.description||'',parent_id:parentId,created_at:_now()}).exec();
    return{id:id,name:name};
  }
  function deleteGroup(name){
    var g=db.from('rbac_groups').where({name:name}).first();if(!g)throw new Error('Group not found: '+name);
    db.from('rbac_group_permissions').where({group_id:g.id}).delete().exec();
    db.from('rbac_group_roles').where({group_id:g.id}).delete().exec();
    db.from('rbac_user_groups').where({group_id:g.id}).delete().exec();
    db.from('rbac_groups').where({parent_id:g.id}).update({parent_id:g.parent_id||''}).exec();
    db.from('rbac_groups').where({id:g.id}).delete().exec();
    _invalidate();
  }
  function getGroup(name){return db.from('rbac_groups').where({name:name}).first();}
  function listGroups(){return db.from('rbac_groups').orderBy('name').toArray();}
  function getGroupHierarchy(name){
    var result=[];var g=db.from('rbac_groups').where({name:name}).first();
    var depth=0;
    while(g&&depth<10){result.push(g);if(!g.parent_id)break;g=db.from('rbac_groups').where({id:g.parent_id}).first();depth++;}
    return result;
  }
  
  function _getOrCreatePerm(resource,action,description){
    var existing=db.from('rbac_permissions').where({resource:resource,action:action}).first();
    if(existing)return existing;
    var id=_uuid();db.from('rbac_permissions').insert({id:id,resource:resource,action:action,description:description||''}).exec();
    return{id:id,resource:resource,action:action};
  }
  function definePermission(resource,action,description){return _getOrCreatePerm(resource,action,description);}
  function removePermission(resource,action){
    var p=db.from('rbac_permissions').where({resource:resource,action:action}).first();
    if(!p)return;
    db.from('rbac_role_permissions').where({permission_id:p.id}).delete().exec();
    db.from('rbac_user_permissions').where({permission_id:p.id}).delete().exec();
    db.from('rbac_group_permissions').where({permission_id:p.id}).delete().exec();
    db.from('rbac_permissions').where({id:p.id}).delete().exec();
    _invalidate();
  }
  function listPermissions(){return db.from('rbac_permissions').orderBy('resource').toArray();}
  
  function _rolePermOp(roleName,resource,action,effect){
    var r=db.from('rbac_roles').where({name:roleName}).first();if(!r)throw new Error('Role not found: '+roleName);
    var p=_getOrCreatePerm(resource,action);
    var existing=db.from('rbac_role_permissions').where({role_id:r.id,permission_id:p.id}).first();
    if(existing){db.from('rbac_role_permissions').where({role_id:r.id,permission_id:p.id}).update({effect:effect}).exec();}
    else{db.from('rbac_role_permissions').insert({role_id:r.id,permission_id:p.id,effect:effect}).exec();}
    _invalidate();
  }
  function grant(roleName,resource,action){_rolePermOp(roleName,resource,action,'grant');}
  function deny(roleName,resource,action){_rolePermOp(roleName,resource,action,'deny');}
  function revokeFromRole(roleName,resource,action){
    var r=db.from('rbac_roles').where({name:roleName}).first();if(!r)return;
    var p=db.from('rbac_permissions').where({resource:resource,action:action}).first();if(!p)return;
    db.from('rbac_role_permissions').where({role_id:r.id,permission_id:p.id}).delete().exec();
    _invalidate();
  }
  
  function assignRole(userId,roleName){
    var r=db.from('rbac_roles').where({name:roleName}).first();if(!r)throw new Error('Role not found: '+roleName);
    if(!db.from('rbac_user_roles').where({user_id:userId,role_id:r.id}).exists()){
      db.from('rbac_user_roles').insert({user_id:userId,role_id:r.id}).exec();
    }
    _invalidate(userId);
  }
  function revokeRole(userId,roleName){
    var r=db.from('rbac_roles').where({name:roleName}).first();if(!r)return;
    db.from('rbac_user_roles').where({user_id:userId,role_id:r.id}).delete().exec();
    _invalidate(userId);
  }
  function getUserRoles(userId){
    return db.from('rbac_user_roles').join('rbac_roles','rbac_user_roles.role_id = rbac_roles.id').where({user_id:userId}).select('rbac_roles.name','rbac_roles.description').toArray();
  }
  
  function addToGroup(userId,groupName){
    var g=db.from('rbac_groups').where({name:groupName}).first();if(!g)throw new Error('Group not found: '+groupName);
    if(!db.from('rbac_user_groups').where({user_id:userId,group_id:g.id}).exists()){
      db.from('rbac_user_groups').insert({user_id:userId,group_id:g.id}).exec();
    }
    _invalidate(userId);
  }
  function removeFromGroup(userId,groupName){
    var g=db.from('rbac_groups').where({name:groupName}).first();if(!g)return;
    db.from('rbac_user_groups').where({user_id:userId,group_id:g.id}).delete().exec();
    _invalidate(userId);
  }
  function getUserGroups(userId){
    return db.from('rbac_user_groups').join('rbac_groups','rbac_user_groups.group_id = rbac_groups.id').where({user_id:userId}).select('rbac_groups.name','rbac_groups.description').toArray();
  }
  
  function assignGroupRole(groupName,roleName){
    var g=db.from('rbac_groups').where({name:groupName}).first();if(!g)throw new Error('Group not found: '+groupName);
    var r=db.from('rbac_roles').where({name:roleName}).first();if(!r)throw new Error('Role not found: '+roleName);
    if(!db.from('rbac_group_roles').where({group_id:g.id,role_id:r.id}).exists()){
      db.from('rbac_group_roles').insert({group_id:g.id,role_id:r.id}).exec();
    }
    _invalidate();
  }
  function revokeGroupRole(groupName,roleName){
    var g=db.from('rbac_groups').where({name:groupName}).first();if(!g)return;
    var r=db.from('rbac_roles').where({name:roleName}).first();if(!r)return;
    db.from('rbac_group_roles').where({group_id:g.id,role_id:r.id}).delete().exec();
    _invalidate();
  }
  
  function _userPermOp(userId,resource,action,effect){
    var p=_getOrCreatePerm(resource,action);
    var existing=db.from('rbac_user_permissions').where({user_id:userId,permission_id:p.id}).first();
    if(existing){db.from('rbac_user_permissions').where({user_id:userId,permission_id:p.id}).update({effect:effect}).exec();}
    else{db.from('rbac_user_permissions').insert({user_id:userId,permission_id:p.id,effect:effect}).exec();}
    _invalidate(userId);
  }
  function grantUser(userId,resource,action){_userPermOp(userId,resource,action,'grant');}
  function denyUser(userId,resource,action){_userPermOp(userId,resource,action,'deny');}
  function revokeUserPermission(userId,resource,action){
    var p=db.from('rbac_permissions').where({resource:resource,action:action}).first();if(!p)return;
    db.from('rbac_user_permissions').where({user_id:userId,permission_id:p.id}).delete().exec();
    _invalidate(userId);
  }
  
  function _groupPermOp(groupName,resource,action,effect){
    var g=db.from('rbac_groups').where({name:groupName}).first();if(!g)throw new Error('Group not found: '+groupName);
    var p=_getOrCreatePerm(resource,action);
    var existing=db.from('rbac_group_permissions').where({group_id:g.id,permission_id:p.id}).first();
    if(existing){db.from('rbac_group_permissions').where({group_id:g.id,permission_id:p.id}).update({effect:effect}).exec();}
    else{db.from('rbac_group_permissions').insert({group_id:g.id,permission_id:p.id,effect:effect}).exec();}
    _invalidate();
  }
  function grantGroup(groupName,resource,action){_groupPermOp(groupName,resource,action,'grant');}
  function denyGroup(groupName,resource,action){_groupPermOp(groupName,resource,action,'deny');}
  function revokeGroupPermission(groupName,resource,action){
    var g=db.from('rbac_groups').where({name:groupName}).first();if(!g)return;
    var p=db.from('rbac_permissions').where({resource:resource,action:action}).first();if(!p)return;
    db.from('rbac_group_permissions').where({group_id:g.id,permission_id:p.id}).delete().exec();
    _invalidate();
  }
  
  function _getUserGroupsHierarchy(userId){
    var directGroups=db.from('rbac_user_groups').join('rbac_groups','rbac_user_groups.group_id = rbac_groups.id').where({user_id:userId}).select('rbac_groups.id','rbac_groups.name','rbac_groups.parent_id').toArray();
    var all=[];var seen=Object.create(null);
    for(var di=0;di<directGroups.length;di++){
      var g=directGroups[di];var depth=0;
      while(g&&!seen[g.id]&&depth<10){seen[g.id]=true;all.push(g);if(!g.parent_id)break;g=db.from('rbac_groups').where({id:g.parent_id}).first();depth++;}
    }
    return all;
  }
  function _loadTiers(userId){
    if(_cache[userId])return _cache[userId];
    var userPerms=db.from('rbac_user_permissions').join('rbac_permissions','rbac_user_permissions.permission_id = rbac_permissions.id').where({user_id:userId}).select('rbac_permissions.resource','rbac_permissions.action','rbac_user_permissions.effect').toArray();
    var groups=_getUserGroupsHierarchy(userId);
    var groupPerms=[];
    for(var gi=0;gi<groups.length;gi++){
      var gp=db.from('rbac_group_permissions').join('rbac_permissions','rbac_group_permissions.permission_id = rbac_permissions.id').where({group_id:groups[gi].id}).select('rbac_permissions.resource','rbac_permissions.action','rbac_group_permissions.effect').toArray();
      for(var gpi=0;gpi<gp.length;gpi++)groupPerms.push(gp[gpi]);
    }
    var directRoleIds=db.from('rbac_user_roles').where({user_id:userId}).select('role_id').toArray().map(function(r){return r.role_id;});
    for(var gri=0;gri<groups.length;gri++){
      var gr=db.from('rbac_group_roles').where({group_id:groups[gri].id}).select('role_id').toArray();
      for(var j=0;j<gr.length;j++){if(directRoleIds.indexOf(gr[j].role_id)<0)directRoleIds.push(gr[j].role_id);}
    }
    var rolePerms=[];
    for(var ri=0;ri<directRoleIds.length;ri++){
      var rp=db.from('rbac_role_permissions').join('rbac_permissions','rbac_role_permissions.permission_id = rbac_permissions.id').where({role_id:directRoleIds[ri]}).select('rbac_permissions.resource','rbac_permissions.action','rbac_role_permissions.effect').toArray();
      for(var rpi=0;rpi<rp.length;rpi++)rolePerms.push(rp[rpi]);
    }
    var roleNames=[];
    for(var i=0;i<directRoleIds.length;i++){var rn=db.from('rbac_roles').where({id:directRoleIds[i]}).select('name').first();if(rn)roleNames.push(rn.name);}
    var groupNames=groups.map(function(g){return g.name;});
    var result={_userPerms:userPerms,_groupPerms:groupPerms,_rolePerms:rolePerms,roles:roleNames,groups:groupNames};
    _cache[userId]=result;
    return result;
  }

  function _tierDecision(perms,resource,action){
    var grant=false;
    for(var i=0;i<perms.length;i++){
      if(_matchRA(perms[i],resource,action)){
        if(perms[i].effect==='deny')return 'deny';
        grant=true;
      }
    }
    return grant?'grant':null;
  }
  function _canFromTiers(tiers,resource,action){

    var d=_tierDecision(tiers._userPerms,resource,action);if(d)return d==='grant';
    d=_tierDecision(tiers._groupPerms,resource,action);if(d)return d==='grant';
    d=_tierDecision(tiers._rolePerms,resource,action);if(d)return d==='grant';
    return false;
  }
  function resolve(userId){
    var t=_loadTiers(userId);
    var allPerms=t._userPerms.concat(t._groupPerms).concat(t._rolePerms);
    var seen=Object.create(null);var grants=[];var denies=[];
    for(var i=0;i<allPerms.length;i++){
      var key=allPerms[i].resource+':'+allPerms[i].action;
      if(seen[key])continue;seen[key]=true;
      if(_canFromTiers(t,allPerms[i].resource,allPerms[i].action)){grants.push(key);}else{denies.push(key);}
    }
    return{grants:grants,denies:denies,roles:t.roles,groups:t.groups};
  }
  function can(userId,resource,action){return _canFromTiers(_loadTiers(userId),resource,action);}
  function cannot(userId,resource,action){return !can(userId,resource,action);}
  
  function middleware(resource,action){
    return function(req,res,next){
      if(!req.user||!req.user.username){res.status(401).json({error:'Authentication required'});return;}
      if(!can(req.user.username,resource,action)){res.status(403).json({error:'Forbidden — requires '+resource+':'+action});return;}
      next();
    };
  }
  function middlewareAny(resource,actions){
    return function(req,res,next){
      if(!req.user||!req.user.username){res.status(401).json({error:'Authentication required'});return;}
      for(var i=0;i<actions.length;i++){if(can(req.user.username,resource,actions[i])){next();return;}}
      res.status(403).json({error:'Forbidden — requires one of: '+actions.map(function(a){return resource+':'+a;}).join(', ')});
    };
  }
  function middlewareAll(resource,actions){
    return function(req,res,next){
      if(!req.user||!req.user.username){res.status(401).json({error:'Authentication required'});return;}
      for(var i=0;i<actions.length;i++){if(!can(req.user.username,resource,actions[i])){res.status(403).json({error:'Forbidden — requires '+resource+':'+actions[i]});return;}}
      next();
    };
  }
  
  function claimsFromUser(userId){var r=resolve(userId);return{roles:r.roles,groups:r.groups,grants:r.grants,denies:r.denies};}
  function scopesToPermissions(scopes){
    var result=[];
    for(var i=0;i<scopes.length;i++){
      var s=scopes[i];
      var perms=db.from('rbac_permissions').whereLike('action',s).toArray();
      if(perms.length===0)perms=db.from('rbac_permissions').whereLike('resource',s).toArray();
      for(var j=0;j<perms.length;j++)result.push({resource:perms[j].resource,action:perms[j].action});
    }
    return result;
  }
  function syncFromLegacyRole(userId,role){
    var r=db.from('rbac_roles').where({name:role}).first();
    if(r&&!db.from('rbac_user_roles').where({user_id:userId,role_id:r.id}).exists()){
      db.from('rbac_user_roles').insert({user_id:userId,role_id:r.id}).exec();
    }
    _invalidate(userId);
  }
  function invalidate(userId){_invalidate(userId);}
  return{
    initialize:initialize,
    createRole:createRole,deleteRole:deleteRole,getRole:getRole,listRoles:listRoles,
    createGroup:createGroup,deleteGroup:deleteGroup,getGroup:getGroup,listGroups:listGroups,getGroupHierarchy:getGroupHierarchy,
    definePermission:definePermission,removePermission:removePermission,listPermissions:listPermissions,
    grant:grant,deny:deny,revokeFromRole:revokeFromRole,
    assignRole:assignRole,revokeRole:revokeRole,getUserRoles:getUserRoles,
    addToGroup:addToGroup,removeFromGroup:removeFromGroup,getUserGroups:getUserGroups,
    assignGroupRole:assignGroupRole,revokeGroupRole:revokeGroupRole,
    grantUser:grantUser,denyUser:denyUser,revokeUserPermission:revokeUserPermission,
    grantGroup:grantGroup,denyGroup:denyGroup,revokeGroupPermission:revokeGroupPermission,
    resolve:resolve,can:can,cannot:cannot,
    middleware:middleware,middlewareAny:middlewareAny,middlewareAll:middlewareAll,
    claimsFromUser:claimsFromUser,scopesToPermissions:scopesToPermissions,syncFromLegacyRole:syncFromLegacyRole,
    invalidate:invalidate
  };
}

function createRbacHelpers(deps){
  var rbacAtom=deps.rbacAtom;var useAtomValue=deps.useAtomValue;
  if(!rbacAtom||!useAtomValue)throw new Error('createRbacHelpers: rbacAtom and useAtomValue are required');
  function usePermission(resource,action){
    var rbac=useAtomValue(rbacAtom);
    if(!rbac)return false;
    for(var i=0;i<(rbac.denies||[]).length;i++){if(matchPerm(rbac.denies[i],resource,action))return false;}
    for(var i=0;i<(rbac.grants||[]).length;i++){if(matchPerm(rbac.grants[i],resource,action))return true;}
    return false;
  }
  function useCan(resource,action){return usePermission(resource,action);}
  function useCannot(resource,action){return !usePermission(resource,action);}
  function useRole(roleName){var rbac=useAtomValue(rbacAtom);return rbac&&rbac.roles?rbac.roles.indexOf(roleName)>=0:false;}
  function useGroup(groupName){var rbac=useAtomValue(rbacAtom);return rbac&&rbac.groups?rbac.groups.indexOf(groupName)>=0:false;}
  function Can(props){var parts=(props.permission||'').split(':');return usePermission(parts[0]||'',parts[1]||'')?props.children:(props.fallback||null);}
  function Cannot(props){var parts=(props.permission||'').split(':');return !usePermission(parts[0]||'',parts[1]||'')?props.children:null;}
  function PermissionGate(props){return Can(props);}
  function HasRole(props){return useRole(props.role)?props.children:(props.fallback||null);}
  function InGroup(props){return useGroup(props.group)?props.children:(props.fallback||null);}
  return{usePermission:usePermission,useCan:useCan,useCannot:useCannot,useRole:useRole,useGroup:useGroup,Can:Can,Cannot:Cannot,PermissionGate:PermissionGate,HasRole:HasRole,InGroup:InGroup};
}
return{createRBAC:createRBAC,createRbacHelpers:createRbacHelpers,matchPerm:matchPerm};
})()
