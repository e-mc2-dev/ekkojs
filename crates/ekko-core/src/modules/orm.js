// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



(function(__ekko_db_open){

function E(d){this.op=d.op;this.field=d.field;this.table=d.table;this.value=d.value;this.left=d.left;this.right=d.right;this.child=d.child;}
E.prototype.and=function(o){return new E({op:'AND',left:this,right:o});};
E.prototype.or=function(o){return new E({op:'OR',left:this,right:o});};
E.prototype.not=function(){return new E({op:'NOT',child:this});};

var _cmpOps={eq:'EQ',neq:'NEQ',gt:'GT',lt:'LT',gte:'GTE',lte:'LTE',like:'LIKE',notLike:'NOT_LIKE'};

function createExprProxy(tableName,path,schema){
  path=path||[];
  return new Proxy({__is_expr:true,__path:path,__table:tableName,__schema:schema||null},{
    get:function(_,prop){
      if(prop==='__is_expr')return true;
      if(prop==='__path')return path;
      if(prop==='__table')return tableName;
      if(prop==='__schema')return schema||null;
      var fieldStr=path.join('.');
      
      if(_cmpOps[prop]){var op=_cmpOps[prop];return function(v){return new E({op:op,field:fieldStr,table:tableName,value:v});};}
      if(prop==='eqField')return function(other){return new E({op:'EQ',field:fieldStr,table:tableName,value:{__fieldRef:true,field:other.__path.join('.'),table:other.__table}});};
      if(prop==='isIn')return function(v){return new E({op:'IN',field:fieldStr,table:tableName,value:v});};
      if(prop==='isNull')return function(){return new E({op:'IS_NULL',field:fieldStr,table:tableName});};
      if(prop==='isNotNull')return function(){return new E({op:'IS_NOT_NULL',field:fieldStr,table:tableName});};
      if(prop==='between')return function(a,b){return new E({op:'BETWEEN',field:fieldStr,table:tableName,value:[a,b]});};
      if(prop==='match')return function(v){return new E({op:'MATCH',field:fieldStr,table:tableName,value:v});};
      
      if(schema&&schema._relations&&schema._relations[prop]){
        var rel=schema._relations[prop];
        var relTable=rel.target._name;
        return{
          __is_relation:true,__rel:rel,__relName:prop,
          any:function(fn){
            var rp=createExprProxy(relTable,[], rel.target);
            var innerExpr=fn(rp);
            var link=new E({op:'EQ',field:rel.foreignKey,table:relTable,value:{__fieldRef:true,field:rel.localKey,table:tableName}});
            var combined=link.and(innerExpr);
            return new E({op:'EXISTS',table:relTable,child:combined});
          },
          none:function(fn){
            var rp=createExprProxy(relTable,[],rel.target);
            var innerExpr=fn(rp);
            var link=new E({op:'EQ',field:rel.foreignKey,table:relTable,value:{__fieldRef:true,field:rel.localKey,table:tableName}});
            return new E({op:'NOT_EXISTS',table:relTable,child:link.and(innerExpr)});
          },
          count:function(){
            return{
              __is_subquery_count:true,__rel:rel,__table:relTable,__parentTable:tableName,
              gt:function(v){return new E({op:'SUBQUERY_COUNT_GT',table:relTable,value:v,child:{rel:rel,parentTable:tableName}});},
              gte:function(v){return new E({op:'SUBQUERY_COUNT_GTE',table:relTable,value:v,child:{rel:rel,parentTable:tableName}});},
              lt:function(v){return new E({op:'SUBQUERY_COUNT_LT',table:relTable,value:v,child:{rel:rel,parentTable:tableName}});},
              eq:function(v){return new E({op:'SUBQUERY_COUNT_EQ',table:relTable,value:v,child:{rel:rel,parentTable:tableName}});},
            };
          },
        };
      }
      
      return createExprProxy(tableName,path.concat([prop]),schema);
    }
  });
}

function ColBuilder(type){
  this.type=type;this._pk=false;this._ai=false;this._null=false;this._uniq=false;
  this._def=undefined;this._idx=false;this._ft=false;this._ref=null;
}
ColBuilder.prototype.primaryKey=function(){var c=this._clone();c._pk=true;return c;};
ColBuilder.prototype.autoIncrement=function(){var c=this._clone();c._ai=true;return c;};
ColBuilder.prototype.nullable=function(){var c=this._clone();c._null=true;return c;};
ColBuilder.prototype.unique=function(){var c=this._clone();c._uniq=true;return c;};
ColBuilder.prototype.default=function(v){var c=this._clone();c._def=v;return c;};
ColBuilder.prototype.index=function(){var c=this._clone();c._idx=true;return c;};
ColBuilder.prototype.fulltext=function(){var c=this._clone();c._ft=true;return c;};
ColBuilder.prototype.references=function(schema,key){var c=this._clone();c._ref={target:schema,key:key};return c;};
ColBuilder.prototype._clone=function(){
  var c=new ColBuilder(this.type);c._pk=this._pk;c._ai=this._ai;c._null=this._null;
  c._uniq=this._uniq;c._def=this._def;c._idx=this._idx;c._ft=this._ft;c._ref=this._ref;return c;
};
ColBuilder.prototype._toConfig=function(){
  return{type:this.type,primaryKey:this._pk,autoIncrement:this._ai,nullable:this._null,
    unique:this._uniq,default:this._def,_index:this._idx,_fulltext:this._ft,_ref:this._ref};
};

var col={
  int:function(){return new ColBuilder('INT');},
  text:function(){return new ColBuilder('TEXT');},
  real:function(){return new ColBuilder('REAL');},
  bool:function(){return new ColBuilder('INT');},
  blob:function(){return new ColBuilder('BLOB');},
  json:function(){return new ColBuilder('TEXT');},
  timestamp:function(){return new ColBuilder('INT');},
};

function idx(){
  var columns=Array.prototype.slice.call(arguments);
  var def={columns:columns,_name:null,_unique:false,_desc:false,_partial:null,_fulltext:false};
  return{
    columns:columns,
    name:function(n){def._name=n;return this;},
    unique:function(){def._unique=true;return this;},
    desc:function(){def._desc=true;return this;},
    where:function(fn){def._partial=fn;return this;},
    fulltext:function(){def._fulltext=true;return this;},
    _def:def,
  };
}

function defineTable(name,columns,opts){
  var cols={};var indexes=[];var relations={};
  for(var k in columns){
    if(!columns.hasOwnProperty(k))continue;
    var raw=columns[k];
    var c=(raw instanceof ColBuilder)?raw._toConfig():(typeof raw==='function'?raw():raw);
    c.name=k;cols[k]=c;
    if(c._index)indexes.push({columns:[k],_name:null,_unique:false,_desc:false,_partial:null,_fulltext:false});
    if(c._fulltext)indexes.push({columns:[k],_name:null,_unique:false,_desc:false,_partial:null,_fulltext:true});
  }
  if(opts&&opts.indexes){
    for(var i=0;i<opts.indexes.length;i++){
      var ix=opts.indexes[i];
      indexes.push(ix._def||ix);
    }
  }
  if(opts&&opts.primaryKey)var _compositePK=opts.primaryKey;
  var schema={
    _name:name,_columns:cols,_indexes:indexes,_relations:relations,_compositePrimaryKey:_compositePK||null,
    hasMany:function(target,o){o=o||{};relations[o.as||target._name]=
      {type:'hasMany',target:target,foreignKey:o.foreignKey,localKey:o.localKey||'id'};return schema;},
    belongsTo:function(target,o){o=o||{};relations[o.as||target._name]=
      {type:'belongsTo',target:target,foreignKey:o.foreignKey,localKey:o.localKey||'id'};return schema;},
    hasOne:function(target,o){o=o||{};relations[o.as||target._name]=
      {type:'hasOne',target:target,foreignKey:o.foreignKey,localKey:o.localKey||'id'};return schema;},
    manyToMany:function(target,o){o=o||{};relations[o.as||target._name]=
      {type:'manyToMany',target:target,through:o.through,foreignKey:o.foreignKey,otherKey:o.otherKey};return schema;},
  };
  return schema;
}

function Dialect(name){this.name=name;this.isSql=false;}
function _abstractDialectMethod(m){
  return function(){throw new Error('Dialect.'+m+' is abstract — use a concrete dialect (SqlDialect or MongoDialect)');};
}
Dialect.prototype.compileExpr=_abstractDialectMethod('compileExpr');
Dialect.prototype.compileSelect=_abstractDialectMethod('compileSelect');
Dialect.prototype.compileAggregate=_abstractDialectMethod('compileAggregate');
Dialect.prototype.compileInsert=_abstractDialectMethod('compileInsert');
Dialect.prototype.compileUpdate=_abstractDialectMethod('compileUpdate');
Dialect.prototype.compileDelete=_abstractDialectMethod('compileDelete');
Dialect.prototype.compileCreateTable=_abstractDialectMethod('compileCreateTable');
Dialect.prototype.compileCreateIndexes=_abstractDialectMethod('compileCreateIndexes');
Dialect.prototype.compileDropTable=_abstractDialectMethod('compileDropTable');

var _SQL_CMP={EQ:'=',NEQ:'!=',GT:'>',LT:'<',GTE:'>=',LTE:'<=',LIKE:'LIKE',NOT_LIKE:'NOT LIKE'};
function SqlDialect(name){Dialect.call(this,name);this._paramIdx=0;this.isSql=true;}
SqlDialect.prototype=Object.create(Dialect.prototype);
SqlDialect.prototype.constructor=SqlDialect;
SqlDialect.prototype.resetParams=function(){this._paramIdx=0;this._params={};};
SqlDialect.prototype.param=function(value){
  if(typeof value==='boolean')value=value?1:0;
  var name='p'+this._paramIdx++;
  this._params[name]=value;
  return '@'+name;
};
SqlDialect.prototype.quote=function(id){return id;};
SqlDialect.prototype.autoIncrement=function(){return 'AUTOINCREMENT';};
SqlDialect.prototype.columnType=function(t){return t;};

SqlDialect.prototype.compileExpr=function(node){
  if(!node)return '';
  if(node.op==='AND')return '('+this.compileExpr(node.left)+' AND '+this.compileExpr(node.right)+')';
  if(node.op==='OR')return '('+this.compileExpr(node.left)+' OR '+this.compileExpr(node.right)+')';
  if(node.op==='NOT')return 'NOT ('+this.compileExpr(node.child)+')';
  if(node.op==='IS_NULL')return node.field+' IS NULL';
  if(node.op==='IS_NOT_NULL')return node.field+' IS NOT NULL';
  if(node.op==='IN'){
    var placeholders=[];for(var i=0;i<node.value.length;i++)placeholders.push(this.param(node.value[i]));
    return node.field+' IN ('+placeholders.join(',')+')';
  }
  if(node.op==='BETWEEN')return node.field+' BETWEEN '+this.param(node.value[0])+' AND '+this.param(node.value[1]);
  if(node.op==='MATCH')return node.field+' MATCH '+this.param(node.value);
  if(node.op==='EXISTS')return 'EXISTS (SELECT 1 FROM '+node.table+' WHERE '+this.compileExpr(node.child)+')';
  if(node.op==='NOT_EXISTS')return 'NOT EXISTS (SELECT 1 FROM '+node.table+' WHERE '+this.compileExpr(node.child)+')';
  if(node.op==='SUBQUERY_COUNT_GT')return '(SELECT COUNT(*) FROM '+node.table+' WHERE '+node.child.rel.foreignKey+' = '+node.child.parentTable+'.'+node.child.rel.localKey+') > '+this.param(node.value);
  if(node.op==='SUBQUERY_COUNT_GTE')return '(SELECT COUNT(*) FROM '+node.table+' WHERE '+node.child.rel.foreignKey+' = '+node.child.parentTable+'.'+node.child.rel.localKey+') >= '+this.param(node.value);
  if(node.op==='SUBQUERY_COUNT_LT')return '(SELECT COUNT(*) FROM '+node.table+' WHERE '+node.child.rel.foreignKey+' = '+node.child.parentTable+'.'+node.child.rel.localKey+') < '+this.param(node.value);
  if(node.op==='SUBQUERY_COUNT_EQ')return '(SELECT COUNT(*) FROM '+node.table+' WHERE '+node.child.rel.foreignKey+' = '+node.child.parentTable+'.'+node.child.rel.localKey+') = '+this.param(node.value);
  
  if(node.value&&node.value.__fieldRef){
    var lf=node.table?node.table+'.'+node.field:node.field;
    var rf=node.value.table?node.value.table+'.'+node.value.field:node.value.field;
    return lf+' '+(_SQL_CMP[node.op]||node.op)+' '+rf;
  }
  return node.field+' '+(_SQL_CMP[node.op]||node.op)+' '+this.param(node.value);
};

SqlDialect.prototype.appendJoins=function(plan){
  if(!plan.joins||!plan.joins.length)return '';
  var s='';
  for(var i=0;i<plan.joins.length;i++){
    var j=plan.joins[i];
    s+=' '+j.type+' '+j.table+' ON '+(j.on&&j.on.__rawOn?j.on.__rawOn:this.compileExpr(j.on));
  }
  return s;
};

SqlDialect.prototype.compileTop=function(plan){return '';};
SqlDialect.prototype.compileLimitOffset=function(plan){
  var s='';
  if(plan.limit!=null)s+=' LIMIT '+plan.limit;
  if(plan.offset!=null)s+=' OFFSET '+plan.offset;
  return s;
};

SqlDialect.prototype.compileSelect=function(plan){
  this.resetParams();
  var d=plan.distinct?'DISTINCT ':'';
  var sql='SELECT '+d+this.compileTop(plan)+plan.fields.join(', ')+' FROM '+this.quote(plan.table)+this.appendJoins(plan);
  if(plan.where)sql+=' WHERE '+this.compileExpr(plan.where);
  if(plan.groups&&plan.groups.length)sql+=' GROUP BY '+plan.groups.join(', ');
  if(plan.having)sql+=' HAVING '+this.compileExpr(plan.having);
  if(plan.orders&&plan.orders.length)sql+=' ORDER BY '+plan.orders.map(function(o){return o.field+' '+o.dir;}).join(', ');
  sql+=this.compileLimitOffset(plan);
  return{query:sql,params:this._params};
};

SqlDialect.prototype.compileAggregate=function(plan){
  this.resetParams();
  var agg=plan.aggregate;
  var fn=agg.fn.toUpperCase();
  var field=agg.field==='*'?'*':agg.field;
  var q='SELECT '+fn+'('+field+') AS '+agg.alias+' FROM '+this.quote(plan.table)+this.appendJoins(plan);
  if(plan.where)q+=' WHERE '+this.compileExpr(plan.where);
  if(plan.groups&&plan.groups.length)q+=' GROUP BY '+plan.groups.join(', ');
  if(plan.having)q+=' HAVING '+this.compileExpr(plan.having);
  return{query:q,params:this._params};
};

SqlDialect.prototype.compileInsert=function(plan){
  this.resetParams();
  var keys=Object.keys(plan.data);
  var vals=[];for(var i=0;i<keys.length;i++)vals.push(this.param(plan.data[keys[i]]));
  return{query:'INSERT INTO '+this.quote(plan.table)+' ('+keys.join(', ')+') VALUES ('+vals.join(', ')+')',params:this._params};
};

SqlDialect.prototype.compileUpdate=function(plan){
  this.resetParams();
  var keys=Object.keys(plan.data);
  var sets=[];for(var i=0;i<keys.length;i++)sets.push(keys[i]+' = '+this.param(plan.data[keys[i]]));
  var sql='UPDATE '+this.quote(plan.table)+' SET '+sets.join(', ');
  if(plan.where)sql+=' WHERE '+this.compileExpr(plan.where);
  return{query:sql,params:this._params};
};

SqlDialect.prototype.compileDelete=function(plan){
  this.resetParams();
  var sql='DELETE FROM '+this.quote(plan.table);
  if(plan.where)sql+=' WHERE '+this.compileExpr(plan.where);
  return{query:sql,params:this._params};
};

SqlDialect.prototype.compileCreateTable=function(schema){
  var self=this;
  var cols=[];
  for(var k in schema._columns){
    if(!schema._columns.hasOwnProperty(k))continue;
    var c=schema._columns[k];
    var s=self.quote(k)+' '+self.columnType(c.type);
    if(c.primaryKey)s+=' PRIMARY KEY';
    if(c.autoIncrement)s+=' '+self.autoIncrement();
    if(c.unique)s+=' UNIQUE';
    if(!c.nullable&&!c.primaryKey)s+=' NOT NULL';
    if(c.default!==undefined)s+=' DEFAULT '+(typeof c.default==='string'?"'"+c.default+"'":c.default);
    cols.push(s);
  }
  if(schema._compositePrimaryKey)cols.push('PRIMARY KEY ('+schema._compositePrimaryKey.join(', ')+')');
  return 'CREATE TABLE IF NOT EXISTS '+self.quote(schema._name)+' ('+cols.join(', ')+')';
};

SqlDialect.prototype.compileCreateIndexes=function(schema){
  var stmts=[];
  for(var i=0;i<schema._indexes.length;i++){
    var ix=schema._indexes[i];
    if(ix._fulltext){
      var fts=this.compileFulltextIndex(schema,ix);
      if(fts)stmts.push(fts);
      continue;
    }
    var name=ix._name||('idx_'+schema._name+'_'+ix.columns.join('_'));
    var unique=ix._unique?'UNIQUE ':'';
    var colList=ix.columns.map(function(c){return c+(ix._desc?' DESC':'');}).join(', ');
    var sql='CREATE '+unique+'INDEX IF NOT EXISTS '+name+' ON '+schema._name+' ('+colList+')';
    if(ix._partial){

      
      this.resetParams();
      var proxy=createExprProxy(schema._name,[],schema);
      var expr=ix._partial(proxy);
      var savedParam=this.param;
      this.param=function(value){
        if(value===null||value===undefined)return 'NULL';
        if(typeof value==='boolean')return value?'1':'0';
        if(typeof value==='number')return String(value);
        return "'"+String(value).replace(/'/g,"''")+"'";
      };
      try{sql+=' WHERE '+this.compileExpr(expr);}finally{this.param=savedParam;}
    }
    stmts.push(sql);
  }
  return stmts;
};

SqlDialect.prototype.compileDropTable=function(name){
  return 'DROP TABLE IF EXISTS '+this.quote(typeof name==='object'?name._name:name);
};

SqlDialect.prototype.compileFulltextIndex=function(){return null;};

function SqliteDialect(){SqlDialect.call(this,'sqlite');}
SqliteDialect.prototype=Object.create(SqlDialect.prototype);
SqliteDialect.prototype.constructor=SqliteDialect;
SqliteDialect.prototype.columnType=function(t){if(t==='INT')return 'INTEGER';if(t==='REAL')return 'REAL';return t;};
SqliteDialect.prototype.compileFulltextIndex=function(schema,ix){
  var cols=ix.columns.join(', ');
  return 'CREATE VIRTUAL TABLE IF NOT EXISTS '+schema._name+'_fts USING fts5('+cols+', content='+schema._name+')';
};

function Connection(dialect){this.dialect=dialect;}
Connection.prototype.execute=function(){throw new Error('Connection.execute not implemented');};
Connection.prototype.query=function(){throw new Error('Connection.query not implemented');};
Connection.prototype.beginTransaction=function(){throw new Error('Connection.beginTransaction not implemented');};
Connection.prototype.close=function(){};

function Transaction(dialect){Connection.call(this,dialect);this._done=false;}
Transaction.prototype=Object.create(Connection.prototype);
Transaction.prototype.commit=function(){throw new Error('Transaction.commit not implemented');};
Transaction.prototype.rollback=function(){throw new Error('Transaction.rollback not implemented');};

function _sqliteToParams(params){var o={};for(var k in params)if(params.hasOwnProperty(k))o['@'+k]=params[k];return o;}

function SqliteClient(pathOrDb){

  
  if(typeof pathOrDb==='object'&&pathOrDb&&pathOrDb._handle!=null){this._db=pathOrDb;this._borrowed=true;}
  else if(typeof pathOrDb==='object'&&pathOrDb&&pathOrDb.path){this._db=__ekko_db_open(pathOrDb.path);this._borrowed=false;}
  else {this._db=__ekko_db_open(pathOrDb||':memory:');this._borrowed=false;}
}
SqliteClient.prototype.exec=function(sql,params){
  var p=params&&Object.keys(params).length?_sqliteToParams(params):undefined;
  if(p){var stmt=this._db.prepare(sql);var r=stmt.exec(p);stmt.close();return{affectedRows:r||0};}
  return{affectedRows:this._db.exec(sql)||0};
};
SqliteClient.prototype.query=function(sql,params){
  var p=params&&Object.keys(params).length?_sqliteToParams(params):undefined;
  if(p){var stmt=this._db.prepare(sql);var r=stmt.query(p);stmt.close();return r;}
  return this._db.query(sql);
};
SqliteClient.prototype.beginTransaction=function(){
  this._db.exec('BEGIN');return new SqliteClientTransaction(this._db);
};
SqliteClient.prototype.close=function(){if(!this._borrowed)this._db.close();};
SqliteClient.prototype.destroy=function(){this._db.close();};

function SqliteClientTransaction(db){this._db=db;this._done=false;}
SqliteClientTransaction.prototype.exec=function(sql,params){
  if(this._done)throw new Error('Transaction already ended');
  var p=params&&Object.keys(params).length?_sqliteToParams(params):undefined;
  if(p){var stmt=this._db.prepare(sql);var r=stmt.exec(p);stmt.close();return{affectedRows:r||0};}
  return{affectedRows:this._db.exec(sql)||0};
};
SqliteClientTransaction.prototype.query=function(sql,params){
  if(this._done)throw new Error('Transaction already ended');
  var p=params&&Object.keys(params).length?_sqliteToParams(params):undefined;
  if(p){var stmt=this._db.prepare(sql);var r=stmt.query(p);stmt.close();return r;}
  return this._db.query(sql);
};
SqliteClientTransaction.prototype.commit=function(){if(!this._done){this._db.exec('COMMIT');this._done=true;}};
SqliteClientTransaction.prototype.rollback=function(){if(!this._done){this._db.exec('ROLLBACK');this._done=true;}};

function SqliteConnection(clientOrDb){
  var client=(clientOrDb instanceof SqliteClient)?clientOrDb:new SqliteClient(clientOrDb);
  Connection.call(this,new SqliteDialect());this._client=client;
}
SqliteConnection.prototype=Object.create(Connection.prototype);
SqliteConnection.prototype.constructor=SqliteConnection;
SqliteConnection.prototype.execute=function(q,params){return this._client.exec(q,params);};
SqliteConnection.prototype.query=function(q,params){return this._client.query(q,params);};
SqliteConnection.prototype.beginTransaction=function(){
  var tx=this._client.beginTransaction();return new SqliteOrmTransaction(tx,this.dialect);
};
SqliteConnection.prototype.close=function(){this._client.close();};
SqliteConnection.prototype.destroy=function(){this._client.destroy();};

function SqliteOrmTransaction(tx,dialect){Transaction.call(this,dialect);this._tx=tx;}
SqliteOrmTransaction.prototype=Object.create(Transaction.prototype);
SqliteOrmTransaction.prototype.constructor=SqliteOrmTransaction;
SqliteOrmTransaction.prototype.execute=function(q,params){return this._tx.exec(q,params);};
SqliteOrmTransaction.prototype.query=function(q,params){return this._tx.query(q,params);};
SqliteOrmTransaction.prototype.commit=function(){this._tx.commit();};
SqliteOrmTransaction.prototype.rollback=function(){this._tx.rollback();};

function Pool(factory,config){
  this._factory=factory;this._config=config||{};
  this._available=[];this._busy=new Set();
  var min=config.min||1;
  for(var i=0;i<min;i++)this._available.push(factory());
}
Pool.prototype.acquire=function(){
  if(this._available.length>0){var c=this._available.pop();this._busy.add(c);return c;}
  if(this._busy.size<(this._config.max||10)){var c=this._factory();this._busy.add(c);return c;}
  throw new Error('Pool exhausted');
};
Pool.prototype.release=function(conn){this._busy.delete(conn);this._available.push(conn);};

Pool.prototype.query=function(sql,params){var c=this.acquire();try{return c.query(sql,params);}finally{this.release(c);}};
Pool.prototype.execute=function(sql,params){var c=this.acquire();try{return c.execute(sql,params);}finally{this.release(c);}};
Pool.prototype.transaction=function(fn){
  var conn=this.acquire();var tx=conn.beginTransaction();
  try{var r=fn(tx);tx.commit();this.release(conn);return r;}
  catch(e){tx.rollback();this.release(conn);throw e;}
};
Pool.prototype.stats=function(){return{total:this._available.length+this._busy.size,available:this._available.length,busy:this._busy.size};};
Pool.prototype.close=function(){for(var i=0;i<this._available.length;i++)this._available[i].close();this._available=[];this._busy.forEach(function(c){c.close();});this._busy.clear();};

function Query(conn,schema){
  this._conn=conn;
  this._schema=schema;
  this._table=typeof schema==='string'?schema:schema._name;
  this._plan={type:'select',table:this._table,fields:['*'],distinct:false,
    where:null,aggregate:null,orders:[],limit:null,offset:null,joins:[],groups:[],having:null,
    data:null,includes:[]};
}

Query.prototype._clone=function(){
  var q=new Query(this._conn,this._schema);
  q._plan={type:this._plan.type,table:this._plan.table,
    fields:this._plan.fields.slice(),distinct:this._plan.distinct,
    where:this._plan.where,aggregate:this._plan.aggregate,
    orders:this._plan.orders.slice(),limit:this._plan.limit,offset:this._plan.offset,
    joins:this._plan.joins.slice(),groups:this._plan.groups.slice(),
    having:this._plan.having,data:this._plan.data,includes:this._plan.includes.slice()};
  return q;
};

Query.prototype._mergeWhere=function(expr){
  if(!this._plan.where)return expr;
  return new E({op:'AND',left:this._plan.where,right:expr});
};

Query.prototype.where=function(cond){
  var q=this._clone();
  if(typeof cond==='function'){
    var proxy=createExprProxy(this._table,[],typeof this._schema==='object'?this._schema:null);
    q._plan.where=q._mergeWhere(cond(proxy));
  }else if(typeof cond==='object'&&cond!==null){
    var keys=Object.keys(cond);
    var expr=null;
    for(var i=0;i<keys.length;i++){
      var _v=cond[keys[i]];
      
      var node=(_v===null)
        ? new E({op:'IS_NULL',field:keys[i],table:this._table})
        : new E({op:'EQ',field:keys[i],table:this._table,value:_v});
      expr=expr?expr.and(node):node;
    }
    if(expr)q._plan.where=q._mergeWhere(expr);
  }
  return q;
};

Query.prototype.select=function(){
  var q=this._clone();
  if(arguments.length===1&&typeof arguments[0]==='function'){
    var proxy=createExprProxy(this._table);
    var result=arguments[0](proxy);
    if(Array.isArray(result))q._plan.fields=result.map(function(r){return r&&r.__is_expr?r.__path.join('.'):String(r);});
  }else{
    q._plan.fields=Array.prototype.slice.call(arguments);
  }
  return q;
};

Query.prototype.distinct=function(){var q=this._clone();q._plan.distinct=true;return q;};

function _ormIdent(name){
  if(typeof name!=='string'||!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(name))
    throw new Error('ORM: invalid column identifier '+JSON.stringify(name)+' (SQL-injection guard)');
  return name;
}
function _ormDir(dir){return String(dir==null?'ASC':dir).toUpperCase()==='DESC'?'DESC':'ASC';}
function _ormInt(n){var i=Number(n);if(!Number.isInteger(i)||i<0)throw new Error('ORM: limit/offset must be a non-negative integer (SQL-injection guard)');return i;}

Query.prototype.orderBy=function(field,dir){
  var q=this._clone();
  if(typeof field==='function'){
    var proxy=createExprProxy(this._table);
    var result=field(proxy);
    q._plan.orders.push({field:result.__path.map(_ormIdent).join('.'),dir:_ormDir(dir)});
  }else{
    q._plan.orders.push({field:_ormIdent(field),dir:_ormDir(dir)});
  }
  return q;
};
Query.prototype.orderByDesc=function(field){return this.orderBy(field,'DESC');};

Query.prototype.take=function(n){var q=this._clone();q._plan.limit=_ormInt(n);return q;};
Query.prototype.skip=function(n){var q=this._clone();q._plan.offset=_ormInt(n);return q;};
Query.prototype.groupBy=function(){var q=this._clone();q._plan.groups=Array.prototype.slice.call(arguments).map(_ormIdent);return q;};

Query.prototype.having=function(fn){
  var q=this._clone();
  if(typeof fn==='function'){var proxy=createExprProxy(this._table);q._plan.having=fn(proxy);}
  return q;
};

Query.prototype.join=function(schema,fn){
  var q=this._clone();var t=typeof schema==='string'?schema:schema._name;
  if(typeof fn==='string'){q._plan.joins.push({type:'JOIN',table:t,on:{__rawOn:fn}});return q;}
  var lp=createExprProxy(this._table,[],typeof this._schema==='object'?this._schema:null);
  var rp=createExprProxy(t,[],typeof schema==='object'?schema:null);
  q._plan.joins.push({type:'JOIN',table:t,on:fn(lp,rp)});
  return q;
};
Query.prototype.leftJoin=function(schema,fn){
  var q=this._clone();var t=typeof schema==='string'?schema:schema._name;
  if(typeof fn==='string'){q._plan.joins.push({type:'LEFT JOIN',table:t,on:{__rawOn:fn}});return q;}
  var lp=createExprProxy(this._table,[],typeof this._schema==='object'?this._schema:null);
  var rp=createExprProxy(t,[],typeof schema==='object'?schema:null);
  q._plan.joins.push({type:'LEFT JOIN',table:t,on:fn(lp,rp)});
  return q;
};

Query.prototype.include=function(fn){
  var q=this._clone();
  if(typeof this._schema==='object'&&this._schema._relations){
    var proxy=createExprProxy(this._table,[],this._schema);
    var rel=fn(proxy);
    if(rel&&rel.__is_relation)q._plan.includes.push({rel:rel.__rel,as:rel.__relName});
  }
  return q;
};

Query.prototype.search=function(fn){
  var q=this._clone();
  var proxy=createExprProxy(this._table,[],typeof this._schema==='object'?this._schema:null);
  var expr=fn(proxy);
  if(expr)q._plan.where=q._mergeWhere(expr);
  return q;
};

Query.prototype.insert=function(data){var q=this._clone();q._plan.type='insert';q._plan.data=data;return q;};
Query.prototype.update=function(data){var q=this._clone();q._plan.type='update';q._plan.data=data;return q;};
Query.prototype.delete=function(){var q=this._clone();q._plan.type='delete';return q;};

Query.prototype._compile=function(){
  var d=this._conn.dialect;
  if(this._plan.type==='select')return d.compileSelect(this._plan);
  if(this._plan.type==='aggregate')return d.compileAggregate(this._plan);
  if(this._plan.type==='insert')return d.compileInsert(this._plan);
  if(this._plan.type==='update')return d.compileUpdate(this._plan);
  if(this._plan.type==='delete')return d.compileDelete(this._plan);
  return{query:'',params:{}};
};

Query.prototype.toArray=function(){
  var compiled=this._compile();
  var r=this._conn.query(compiled.query,compiled.params);
  if(!r||!r.rows)return[];var cols=r.columns||[];
  var rows=r.rows.map(function(row){var o={};cols.forEach(function(c,i){o[c]=row[i];});return o;});

  
  
  if(this._plan.includes.length&&rows.length){
    var conn=this._conn;
    for(var i=0;i<this._plan.includes.length;i++){
      var inc=this._plan.includes[i];
      var rel=inc.rel;var as=inc.as;
      if(rel.type==='belongsTo'){
        var bFk=rel.foreignKey;var bKey=rel.localKey||'id';
        var fkVals=[];for(var j=0;j<rows.length;j++){var fv=rows[j][bFk];if(fv!=null&&fkVals.indexOf(fv)<0)fkVals.push(fv);}
        var byKey={};
        if(fkVals.length){
          var prows=new Query(conn,rel.target).where(function(c){return c[bKey].isIn(fkVals);}).__rawToArray();
          for(var j=0;j<prows.length;j++)byKey[prows[j][bKey]]=prows[j];
        }
        for(var j=0;j<rows.length;j++)rows[j][as]=byKey[rows[j][bFk]]||null;
        continue;
      }
      if(rel.type==='manyToMany'){
        var mFk=rel.foreignKey;var mOther=rel.otherKey;var mThrough=rel.through;
        var pIds=[];for(var j=0;j<rows.length;j++){var pv=rows[j].id;if(pv!=null&&pIds.indexOf(pv)<0)pIds.push(pv);}
        var linkMap={};
        if(pIds.length){
          var jrows=new Query(conn,mThrough).where(function(c){return c[mFk].isIn(pIds);}).__rawToArray();
          var otherIds=[];for(var j=0;j<jrows.length;j++){var ov=jrows[j][mOther];if(ov!=null&&otherIds.indexOf(ov)<0)otherIds.push(ov);}
          var tById={};
          if(otherIds.length){
            var trows=new Query(conn,rel.target).where(function(c){return c.id.isIn(otherIds);}).__rawToArray();
            for(var j=0;j<trows.length;j++)tById[trows[j].id]=trows[j];
          }
          for(var j=0;j<jrows.length;j++){var lk=jrows[j][mFk];var t=tById[jrows[j][mOther]];if(t){if(!linkMap[lk])linkMap[lk]=[];linkMap[lk].push(t);}}
        }
        for(var j=0;j<rows.length;j++)rows[j][as]=linkMap[rows[j].id]||[];
        continue;
      }
      
      var localKey=rel.localKey||'id';
      var fk=rel.foreignKey;
      var ids=[];for(var j=0;j<rows.length;j++){var id=rows[j][localKey];if(id!=null&&ids.indexOf(id)<0)ids.push(id);}
      if(ids.length){
        var childQ=new Query(conn,rel.target);
        var childRows=childQ.where(function(c){return c[fk].isIn(ids);}).__rawToArray();
        var grouped={};
        for(var j=0;j<childRows.length;j++){
          var key=childRows[j][fk];
          if(!grouped[key])grouped[key]=[];
          grouped[key].push(childRows[j]);
        }
        for(var j=0;j<rows.length;j++){
          var pk=rows[j][localKey];
          if(rel.type==='hasMany')rows[j][as]=grouped[pk]||[];
          else rows[j][as]=(grouped[pk]&&grouped[pk][0])||null;
        }
      }else{
        for(var j=0;j<rows.length;j++)rows[j][as]=rel.type==='hasMany'?[]:null;
      }
    }
  }
  return rows;
};

Query.prototype.__rawToArray=function(){
  var compiled=this._compile();
  var r=this._conn.query(compiled.query,compiled.params);
  if(!r||!r.rows)return[];var cols=r.columns||[];
  return r.rows.map(function(row){var o={};cols.forEach(function(c,i){o[c]=row[i];});return o;});
};

Query.prototype.first=function(){return this.take(1).toArray()[0]||null;};
Query.prototype.firstOrThrow=function(){var r=this.first();if(!r)throw new Error('No rows found');return r;};
Query.prototype.exists=function(){return this.count()>0;};

Query.prototype.count=function(){var q=this._clone();q._plan.type='aggregate';q._plan.aggregate={fn:'count',field:'*',alias:'__cnt'};var r=q.toArray();return r[0]?r[0].__cnt:0;};
Query.prototype.sum=function(f){var q=this._clone();q._plan.type='aggregate';q._plan.aggregate={fn:'sum',field:f,alias:'__v'};var r=q.toArray();return r[0]?r[0].__v:0;};
Query.prototype.avg=function(f){var q=this._clone();q._plan.type='aggregate';q._plan.aggregate={fn:'avg',field:f,alias:'__v'};var r=q.toArray();return r[0]?r[0].__v:0;};
Query.prototype.min=function(f){var q=this._clone();q._plan.type='aggregate';q._plan.aggregate={fn:'min',field:f,alias:'__v'};var r=q.toArray();return r[0]?r[0].__v:0;};
Query.prototype.max=function(f){var q=this._clone();q._plan.type='aggregate';q._plan.aggregate={fn:'max',field:f,alias:'__v'};var r=q.toArray();return r[0]?r[0].__v:0;};

Query.prototype.exec=function(){var compiled=this._compile();return this._conn.execute(compiled.query,compiled.params);};

Query.prototype.toCommand=function(){return this._compile();};

Query.prototype.toSQL=function(){if(!this._conn.dialect.isSql)throw new Error('toSQL() requires a SQL dialect; use toCommand()');return this._compile().query;};
Query.prototype.toPlan=function(){return JSON.parse(JSON.stringify(this._plan));};

var drivers={};
function registerDriver(name,factory){drivers[name]=factory;}
registerDriver('sqlite',function(config){return new SqliteConnection(config);});

function connect(nameOrDb,config){
  
  var makeConn=function(){
    if(typeof nameOrDb==='string'){
      var factory=drivers[nameOrDb];
      if(factory)return factory(config||{});

      
      return new SqliteConnection(nameOrDb);
    }
    return new SqliteConnection(nameOrDb);
  };
  var conn=makeConn();
  return{
    _conn:conn,
    dialect:conn.dialect,
    from:function(schema){return new Query(conn,schema);},
    exec:function(sql,params){return conn.execute(sql,params);},
    query:function(sql,params){return conn.query(sql,params);},
    transaction:function(fn){
      var tx=conn.beginTransaction();
      try{
        var ctx={from:function(t){return new Query(tx,t);},exec:function(s,p){return tx.execute(s,p);},query:function(s,p){return tx.query(s,p);}};
        var r=fn(ctx);tx.commit();return r;
      }catch(e){tx.rollback();throw e;}
    },
    createPool:function(poolConfig){return new Pool(makeConn,poolConfig||{});},
    createTable:function(schema){
      conn.execute(conn.dialect.compileCreateTable(schema),{});
      var idxStmts=conn.dialect.compileCreateIndexes(schema);
      for(var i=0;i<idxStmts.length;i++)conn.execute(idxStmts[i],{});
    },
    dropTable:function(name){conn.execute(conn.dialect.compileDropTable(name),{});},
    close:function(){conn.close();},
  };
}

var orm={connect:connect,registerDriver:registerDriver,defineTable:defineTable,col:col,idx:idx,
  Dialect:Dialect,SqlDialect:SqlDialect,SqliteDialect:SqliteDialect,Connection:Connection,Transaction:Transaction,Pool:Pool,Query:Query,
  SqliteClient:SqliteClient,SqliteClientTransaction:SqliteClientTransaction};
return{orm:orm,defineTable:defineTable,connect:connect,registerDriver:registerDriver,
  Dialect:Dialect,SqlDialect:SqlDialect,Connection:Connection,Transaction:Transaction,Pool:Pool,Query:Query,col:col,idx:idx,
  SqliteClient:SqliteClient,SqliteClientTransaction:SqliteClientTransaction};
})

