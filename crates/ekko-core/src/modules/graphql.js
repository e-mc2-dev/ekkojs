// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

(function(ops) {

function resolveArgs(argDefs, variables) {
  var out = {};
  for (var k in argDefs) {
    if (!Object.prototype.hasOwnProperty.call(argDefs, k)) continue;
    var v = argDefs[k];
    if (v && v.kind === 'variable') out[k] = variables[v.name];
    else if (v && v.kind === 'string') out[k] = v.value;
    else if (v && v.kind === 'int') out[k] = v.value;
    else if (v && v.kind === 'float') out[k] = v.value;
    else if (v && v.kind === 'boolean') out[k] = v.value;
    else if (v && v.kind === 'null') out[k] = null;
    else if (v && v.kind === 'enum') out[k] = v.value;
    else if (v && v.kind === 'list') out[k] = v.values ? v.values.map(function(i) { return resolveArgValue(i, variables); }) : [];
    else if (v && v.kind === 'object') {
      var obj = {};
      if (v.fields) for (var fk in v.fields) { if (Object.prototype.hasOwnProperty.call(v.fields, fk)) obj[fk] = resolveArgValue(v.fields[fk], variables); }
      out[k] = obj;
    }
    else out[k] = v;
  }
  return out;
}

function resolveArgValue(v, variables) {
  if (!v) return v;
  if (v.kind === 'variable') return variables[v.name];
  if (v.kind === 'string') return v.value;
  if (v.kind === 'int') return v.value;
  if (v.kind === 'float') return v.value;
  if (v.kind === 'boolean') return v.value;
  if (v.kind === 'null') return null;
  if (v.kind === 'enum') return v.value;
  if (v.kind === 'list') return v.values ? v.values.map(function(i) { return resolveArgValue(i, variables); }) : [];
  return v;
}

function getFieldTypeName(schema, parentTypeName, fieldName) {
  var t = schema.types[parentTypeName];
  if (!t || !t.fields || !t.fields[fieldName]) return null;
  return unwrapType(t.fields[fieldName].type);
}

function unwrapType(t) {
  if (!t) return null;
  if (t.kind === 'named') return t.name;
  if (t.kind === 'nonNull' || t.kind === 'list') return unwrapType(t.of);
  return null;
}

var MAX_SPREAD_SELECTIONS = 100000; 
function spreadFragments(selections, fragments, _seen, _budget) {
  _seen = _seen || new Set();
  _budget = _budget || { n: 0 };
  var out = [];
  for (var i = 0; i < selections.length; i++) {
    var sel = selections[i];
    if (sel.kind === 'fragmentSpread') {

      if (_seen.has(sel.name)) continue;
      var frag = fragments[sel.name];
      if (frag && frag.selections) {
        _seen.add(sel.name);
        out = out.concat(spreadFragments(frag.selections, fragments, _seen, _budget));
        _seen.delete(sel.name);
      }
    } else if (sel.kind === 'inlineFragment') {
      if (sel.selections) out = out.concat(spreadFragments(sel.selections, fragments, _seen, _budget));
    } else {
      out.push(sel);
      if (++_budget.n > MAX_SPREAD_SELECTIONS) throw new Error('GraphQL query too large (fragment expansion exceeded ' + MAX_SPREAD_SELECTIONS + ' selections)');
    }
  }
  return out;
}

function resolveField(schema, resolverMap, field, parent, variables, ctx, errors, path, typeName, fragments, depth, maxDepth) {
  if (depth > maxDepth) throw new Error('Query depth ' + depth + ' exceeds maximum allowed depth ' + maxDepth);
  var resolvers = resolverMap[typeName] || {};
  var resolverFn = resolvers[field.name];
  var args = resolveArgs(field.args || {}, variables);
  var result;
  if (resolverFn) {
    result = resolverFn(parent, args, ctx);
  } else if (parent && parent[field.name] !== undefined) {
    result = parent[field.name];
  } else {
    result = null;
  }
  var sels = field.selections || [];
  if (sels.length > 0 && fragments) sels = spreadFragments(sels, fragments);
  if (sels.length > 0 && result !== null && result !== undefined) {
    var childTypeName = getFieldTypeName(schema, typeName, field.name);
    if (Array.isArray(result)) {
      return result.map(function(item, idx) {
        return resolveObject(schema, resolverMap, sels, item, variables, ctx, errors, path.concat([idx]), childTypeName, fragments, depth + 1, maxDepth);
      });
    }
    return resolveObject(schema, resolverMap, sels, result, variables, ctx, errors, path, childTypeName, fragments, depth + 1, maxDepth);
  }
  return result;
}

function resolveObject(schema, resolverMap, selections, obj, variables, ctx, errors, path, typeName, fragments, depth, maxDepth) {
  var out = {};
  for (var i = 0; i < selections.length; i++) {
    var sel = selections[i];
    if (sel.kind !== 'field') continue;
    var key = sel.alias || sel.name;

    if (sel.name === '__typename') { out[key] = typeName; continue; }
    try {
      out[key] = resolveField(schema, resolverMap, sel, obj, variables, ctx, errors, path.concat([sel.name]), typeName, fragments, depth, maxDepth);
    } catch (e) {
      errors.push({ message: String(e.message || e), path: path.concat([sel.name]) });
      out[key] = null;
    }
  }
  return out;
}

function buildSchemaIntrospection(schema) {
  var types = [];
  for (var name in schema.types) {
    if (!Object.prototype.hasOwnProperty.call(schema.types, name)) continue;
    types.push(buildTypeIntrospection(schema, name));
  }
  for (var scalar of ['String', 'Int', 'Float', 'Boolean', 'ID']) {
    if (!schema.types[scalar]) types.push({ kind: 'SCALAR', name: scalar, fields: null });
  }
  return {
    queryType: schema.queryType ? { name: schema.queryType } : null,
    mutationType: schema.mutationType && schema.types[schema.mutationType] ? { name: schema.mutationType } : null,
    subscriptionType: schema.subscriptionType && schema.types[schema.subscriptionType] ? { name: schema.subscriptionType } : null,
    types: types,
    directives: []
  };
}

function buildTypeIntrospection(schema, name) {
  var t = schema.types[name];
  if (!t) return null;
  var kindMap = { object: 'OBJECT', input: 'INPUT_OBJECT', enum: 'ENUM', union: 'UNION', interface: 'INTERFACE', scalar: 'SCALAR' };
  var out = { kind: kindMap[t.kind] || 'OBJECT', name: name };
  if (t.fields) {
    var fields = [];
    for (var fn in t.fields) {
      if (!Object.prototype.hasOwnProperty.call(t.fields, fn)) continue;
      var fd = t.fields[fn];
      var args = [];
      if (fd.args) {
        for (var an in fd.args) {
          if (!Object.prototype.hasOwnProperty.call(fd.args, an)) continue;
          args.push({ name: an, type: introType(fd.args[an].type) });
        }
      }
      fields.push({ name: fn, type: introType(fd.type), args: args });
    }
    out.fields = fields;
  }
  if (t.values) out.enumValues = t.values.map(function(v) { return { name: v }; });
  if (t.members) out.possibleTypes = t.members.map(function(m) { return { name: m }; });
  if (t.interfaces) out.interfaces = t.interfaces.map(function(i) { return { name: i }; });
  return out;
}

function introType(t) {
  if (!t) return null;
  if (t.kind === 'named') return { kind: 'NAMED', name: t.name };
  if (t.kind === 'nonNull') return { kind: 'NON_NULL', ofType: introType(t.of) };
  if (t.kind === 'list') return { kind: 'LIST', ofType: introType(t.of) };
  return null;
}

function executeOperation(schema, ast, resolverMap, variables, ctx, maxDepth) {
  var opType = ast.operation || 'query';
  var rootTypeName = opType === 'query' ? schema.queryType
    : opType === 'mutation' ? schema.mutationType
    : schema.subscriptionType;
  if (!rootTypeName || !schema.types[rootTypeName]) {
    return { errors: [{ message: 'Root type for ' + opType + ' not found' }] };
  }
  var selections = ast.selections || [];
  var fragments = ast.fragments || {};
  if (fragments && Object.keys(fragments).length > 0) {
    try { selections = spreadFragments(selections, fragments); }
    catch (e) { return { errors: [{ message: String(e.message || e) }] }; }
  }
  var data = {};
  var errors = [];
  for (var i = 0; i < selections.length; i++) {
    var sel = selections[i];
    if (sel.kind !== 'field') continue;
    var key = sel.alias || sel.name;
    if (sel.name === '__schema') {
      data[key] = buildSchemaIntrospection(schema);
      continue;
    }
    if (sel.name === '__type') {
      var args = resolveArgs(sel.args || {}, variables);
      data[key] = buildTypeIntrospection(schema, args.name);
      continue;
    }
    if (sel.name === '__typename') {
      data[key] = rootTypeName;
      continue;
    }
    try {
      data[key] = resolveField(schema, resolverMap, sel, null, variables, ctx, errors, [sel.name], rootTypeName, fragments, 1, maxDepth);
    } catch (e) {
      errors.push({ message: String(e.message || e), path: [sel.name] });
      data[key] = null;
    }
  }
  return errors.length > 0 ? { data: data, errors: errors } : { data: data };
}

function createGraphQL(config) {
  var sdl = config.schema;
  var resolvers = config.resolvers || {};
  var ctxFactory = config.context || null;
  var maxDepth = config.maxDepth || 10;

  var schema = ops.parseSchema(sdl);
  if (schema.error) throw new Error('GraphQL schema error: ' + schema.error);

  function execute(queryStr, variables, ctx) {
    var ast = ops.parseQuery(queryStr);
    if (ast.error) return { errors: [{ message: ast.error }] };
    var validation = ops.validate(JSON.stringify(schema), JSON.stringify(ast));
    if (validation && !validation.valid) return { errors: validation.errors };
    return executeOperation(schema, ast, resolvers, variables || {}, ctx || {}, maxDepth);
  }

  function handler(req, res) {
    try {
      var ct = (req.headers && req.headers['content-type'] || '').split(';')[0].trim();
      if (ct && ct !== 'application/json' && ct !== 'application/graphql') { res.status(415).json({ errors: [{ message: 'Unsupported Media Type' }] }); return; }
      var body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.json ? req.json() : req.body || {});
      if (typeof body === 'string') body = JSON.parse(body);
      var query = body.query;
      var variables = body.variables || {};
      if (!query) { res.status(400).json({ errors: [{ message: 'query is required' }] }); return; }
      if (typeof variables !== 'object' || variables === null) variables = {};
      var varsStr = JSON.stringify(variables); if (varsStr.length > 102400) { res.status(400).json({ errors: [{ message: 'variables payload too large (max 100KB)' }] }); return; }
      var ctx = ctxFactory ? ctxFactory(req) : {};
      var result = execute(query, variables, ctx);
      res.json(result);
    } catch (e) {
      console.error('[GraphQL error]', String(e.stack || e));
      res.status(500).json({ errors: [{ message: 'Internal Server Error' }] });
    }
  }

  function wsHandler(sock, req) {
    var subscriptions = {};
    sock.on('message', function(msg) {
      try {
        var data = JSON.parse(msg);
        if (data.type === 'connection_init') {
          sock.send(JSON.stringify({ type: 'connection_ack' }));
          return;
        }
        if (data.type === 'subscribe' && data.id && data.payload) {
          var ctx = ctxFactory ? ctxFactory(req) : {};
          ctx.__subId = data.id;
          ctx.__subSock = sock;
          var result = execute(data.payload.query, data.payload.variables || {}, ctx);
          sock.send(JSON.stringify({ id: data.id, type: 'next', payload: result }));
          sock.send(JSON.stringify({ id: data.id, type: 'complete' }));
          return;
        }
        if (data.type === 'complete' && data.id) {
          delete subscriptions[data.id];
          return;
        }
      } catch (e) {
        sock.send(JSON.stringify({ type: 'error', payload: [{ message: String(e.message || e) }] }));
      }
    });
  }

  return { handler: handler, wsHandler: wsHandler, execute: execute, schema: schema };
}

return { createGraphQL: createGraphQL };
})
