// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use serde_json::{json, Value};
use graphql_parser::schema as gql_schema;
use graphql_parser::query as gql_query;

pub fn parse_schema(sdl: &str) -> Value {
    match gql_schema::parse_schema::<String>(sdl) {
        Ok(doc) => convert_schema_doc(&doc),
        Err(e) => json!({ "error": format!("{}", e) }),
    }
}

pub fn parse_query(query: &str) -> Value {
    match gql_query::parse_query::<String>(query) {
        Ok(doc) => convert_query_doc(&doc),
        Err(e) => json!({ "error": format!("{}", e) }),
    }
}

pub fn validate(schema_json: &Value, query_json: &Value) -> Value {
    let types = match schema_json.get("types").and_then(|t| t.as_object()) {
        Some(t) => t,
        None => return json!({ "valid": false, "errors": [{ "message": "Invalid schema" }] }),
    };
    let selections = match query_json.get("selections").and_then(|s| s.as_array()) {
        Some(s) => s,
        None => return json!({ "valid": true, "errors": [] }),
    };
    let op = query_json.get("operation").and_then(|o| o.as_str()).unwrap_or("query");
    let root_type_name = match op {
        "query" => schema_json.get("queryType").and_then(|t| t.as_str()).unwrap_or("Query"),
        "mutation" => schema_json.get("mutationType").and_then(|t| t.as_str()).unwrap_or("Mutation"),
        "subscription" => schema_json.get("subscriptionType").and_then(|t| t.as_str()).unwrap_or("Subscription"),
        _ => "Query",
    };
    let root_type = match types.get(root_type_name) {
        Some(t) => t,
        None => return json!({ "valid": false, "errors": [{ "message": format!("Root type '{}' not found in schema", root_type_name) }] }),
    };
    let mut errors = Vec::new();
    validate_selections(types, root_type, selections, &mut errors, vec![]);
    json!({ "valid": errors.is_empty(), "errors": errors })
}

fn validate_selections(types: &serde_json::Map<String, Value>, parent_type: &Value, selections: &[Value], errors: &mut Vec<Value>, path: Vec<String>) {
    let fields = parent_type.get("fields").and_then(|f| f.as_object());
    for sel in selections {
        if sel.get("kind").and_then(|k| k.as_str()) != Some("field") { continue; }
        let name = match sel.get("name").and_then(|n| n.as_str()) {
            Some(n) => n,
            None => continue,
        };
        if name == "__schema" || name == "__type" || name == "__typename" { continue; }
        let field_def = fields.and_then(|f| f.get(name));
        if field_def.is_none() {
            let type_name = parent_type.get("name").and_then(|n| n.as_str()).unwrap_or("Unknown");
            let mut p = path.clone();
            p.push(name.to_string());
            errors.push(json!({ "message": format!("Field '{}' not found on type '{}'", name, type_name), "path": p }));
            continue;
        }
        if let Some(sub_sels) = sel.get("selections").and_then(|s| s.as_array()) {
            if !sub_sels.is_empty() {
                let field_type_name = get_named_type(field_def.unwrap().get("type").unwrap_or(&Value::Null));
                if let Some(sub_type) = types.get(&field_type_name) {
                    let mut p = path.clone();
                    p.push(name.to_string());
                    validate_selections(types, sub_type, sub_sels, errors, p);
                }
            }
        }
    }
}

fn get_named_type(type_val: &Value) -> String {
    match type_val.get("kind").and_then(|k| k.as_str()) {
        Some("named") => type_val.get("name").and_then(|n| n.as_str()).unwrap_or("").to_string(),
        Some("nonNull") | Some("list") => get_named_type(type_val.get("of").unwrap_or(&Value::Null)),
        _ => String::new(),
    }
}

fn convert_schema_doc(doc: &gql_schema::Document<'_, String>) -> Value {
    let mut types = serde_json::Map::new();
    let mut query_type = "Query".to_string();
    let mut mutation_type = "Mutation".to_string();
    let mut subscription_type = "Subscription".to_string();

    for def in &doc.definitions {
        match def {
            gql_schema::Definition::SchemaDefinition(sd) => {
                if let Some(q) = &sd.query { query_type = q.to_string(); }
                if let Some(m) = &sd.mutation { mutation_type = m.to_string(); }
                if let Some(s) = &sd.subscription { subscription_type = s.to_string(); }
            }
            gql_schema::Definition::TypeDefinition(td) => {
                let (name, val) = convert_type_def(td);
                types.insert(name, val);
            }
            gql_schema::Definition::TypeExtension(te) => {
                let (name, val) = convert_type_ext(te);
                if let Some(existing) = types.get_mut(&name) {
                    if let (Some(ef), Some(nf)) = (existing.get_mut("fields"), val.get("fields")) {
                        if let (Some(em), Some(nm)) = (ef.as_object_mut(), nf.as_object()) {
                            for (k, v) in nm { em.insert(k.clone(), v.clone()); }
                        }
                    }
                } else {
                    types.insert(name, val);
                }
            }
            _ => {}
        }
    }
    json!({ "types": types, "queryType": query_type, "mutationType": mutation_type, "subscriptionType": subscription_type })
}

fn convert_type_def(td: &gql_schema::TypeDefinition<'_, String>) -> (String, Value) {
    match td {
        gql_schema::TypeDefinition::Object(o) => {
            let fields = convert_fields(&o.fields);
            (o.name.to_string(), json!({ "kind": "object", "name": o.name, "fields": fields, "interfaces": o.implements_interfaces.iter().map(|i| i.to_string()).collect::<Vec<_>>() }))
        }
        gql_schema::TypeDefinition::InputObject(i) => {
            let fields = convert_input_fields(&i.fields);
            (i.name.to_string(), json!({ "kind": "input", "name": i.name, "fields": fields }))
        }
        gql_schema::TypeDefinition::Enum(e) => {
            let values: Vec<String> = e.values.iter().map(|v| v.name.to_string()).collect();
            (e.name.to_string(), json!({ "kind": "enum", "name": e.name, "values": values }))
        }
        gql_schema::TypeDefinition::Union(u) => {
            let members: Vec<String> = u.types.iter().map(|t| t.to_string()).collect();
            (u.name.to_string(), json!({ "kind": "union", "name": u.name, "members": members }))
        }
        gql_schema::TypeDefinition::Interface(i) => {
            let fields = convert_fields(&i.fields);
            (i.name.to_string(), json!({ "kind": "interface", "name": i.name, "fields": fields }))
        }
        gql_schema::TypeDefinition::Scalar(s) => {
            (s.name.to_string(), json!({ "kind": "scalar", "name": s.name }))
        }
    }
}

fn convert_type_ext(te: &gql_schema::TypeExtension<'_, String>) -> (String, Value) {
    match te {
        gql_schema::TypeExtension::Object(o) => {
            let fields = convert_fields(&o.fields);
            (o.name.to_string(), json!({ "kind": "object", "name": o.name, "fields": fields }))
        }
        _ => (String::new(), json!({})),
    }
}

fn convert_fields(fields: &[gql_schema::Field<'_, String>]) -> Value {
    let mut map = serde_json::Map::new();
    for f in fields {
        let args = convert_input_values(&f.arguments);
        map.insert(f.name.to_string(), json!({
            "type": convert_type(&f.field_type),
            "args": args,
        }));
    }
    Value::Object(map)
}

fn convert_input_fields(fields: &[gql_schema::InputValue<'_, String>]) -> Value {
    let mut map = serde_json::Map::new();
    for f in fields {
        map.insert(f.name.to_string(), json!({
            "type": convert_type(&f.value_type),
        }));
    }
    Value::Object(map)
}

fn convert_input_values(args: &[gql_schema::InputValue<'_, String>]) -> Value {
    let mut map = serde_json::Map::new();
    for a in args {
        let mut entry = json!({ "type": convert_type(&a.value_type) });
        if let Some(dv) = &a.default_value {
            entry["default"] = convert_default_value(dv);
        }
        map.insert(a.name.to_string(), entry);
    }
    Value::Object(map)
}

fn convert_type(t: &gql_schema::Type<'_, String>) -> Value {
    match t {
        gql_schema::Type::NamedType(name) => json!({ "kind": "named", "name": name }),
        gql_schema::Type::ListType(inner) => json!({ "kind": "list", "of": convert_type(inner) }),
        gql_schema::Type::NonNullType(inner) => json!({ "kind": "nonNull", "of": convert_type(inner) }),
    }
}

fn convert_default_value(v: &gql_schema::Value<'_, String>) -> Value {
    match v {
        gql_schema::Value::String(s) => json!(s),
        gql_schema::Value::Int(n) => json!(n.as_i64()),
        gql_schema::Value::Float(f) => json!(f),
        gql_schema::Value::Boolean(b) => json!(b),
        gql_schema::Value::Null => Value::Null,
        gql_schema::Value::Enum(e) => json!(e),
        gql_schema::Value::List(items) => json!(items.iter().map(convert_default_value).collect::<Vec<_>>()),
        gql_schema::Value::Object(fields) => {
            let mut map = serde_json::Map::new();
            for (k, v) in fields { map.insert(k.to_string(), convert_default_value(v)); }
            Value::Object(map)
        }
        gql_schema::Value::Variable(name) => json!({ "kind": "variable", "name": name }),
    }
}

fn convert_query_doc(doc: &gql_query::Document<'_, String>) -> Value {
    let mut operations = Vec::new();
    let mut fragments = serde_json::Map::new();

    for def in &doc.definitions {
        match def {
            gql_query::Definition::Operation(op) => {
                operations.push(convert_operation(op));
            }
            gql_query::Definition::Fragment(frag) => {
                let gql_query::TypeCondition::On(ref type_name) = frag.type_condition;
                fragments.insert(frag.name.to_string(), json!({
                    "on": type_name.to_string(),
                    "selections": convert_selection_set(&frag.selection_set),
                }));
            }
        }
    }

    if operations.len() == 1 {
        let mut op = operations.into_iter().next().unwrap();
        if !fragments.is_empty() {
            op["fragments"] = Value::Object(fragments);
        }
        op
    } else {
        json!({ "operations": operations, "fragments": fragments })
    }
}

fn convert_operation(op: &gql_query::OperationDefinition<'_, String>) -> Value {
    match op {
        gql_query::OperationDefinition::Query(q) => {
            json!({
                "operation": "query",
                "name": q.name,
                "variables": convert_variable_defs(&q.variable_definitions),
                "selections": convert_selection_set(&q.selection_set),
            })
        }
        gql_query::OperationDefinition::Mutation(m) => {
            json!({
                "operation": "mutation",
                "name": m.name,
                "variables": convert_variable_defs(&m.variable_definitions),
                "selections": convert_selection_set(&m.selection_set),
            })
        }
        gql_query::OperationDefinition::Subscription(s) => {
            json!({
                "operation": "subscription",
                "name": s.name,
                "variables": convert_variable_defs(&s.variable_definitions),
                "selections": convert_selection_set(&s.selection_set),
            })
        }
        gql_query::OperationDefinition::SelectionSet(ss) => {
            json!({
                "operation": "query",
                "name": null,
                "variables": [],
                "selections": convert_selection_set(ss),
            })
        }
    }
}

fn convert_variable_defs(vars: &[gql_query::VariableDefinition<'_, String>]) -> Value {
    json!(vars.iter().map(|v| {
        let mut def = json!({
            "name": v.name,
            "type": convert_query_type(&v.var_type),
        });
        if let Some(dv) = &v.default_value {
            def["default"] = convert_query_value(dv);
        }
        def
    }).collect::<Vec<_>>())
}

fn convert_selection_set(ss: &gql_query::SelectionSet<'_, String>) -> Value {
    json!(ss.items.iter().map(convert_selection).collect::<Vec<_>>())
}

fn convert_selection(sel: &gql_query::Selection<'_, String>) -> Value {
    match sel {
        gql_query::Selection::Field(f) => {
            let mut args = serde_json::Map::new();
            for (name, val) in &f.arguments {
                args.insert(name.to_string(), convert_query_value(val));
            }
            json!({
                "kind": "field",
                "name": f.name,
                "alias": f.alias,
                "args": args,
                "selections": convert_selection_set(&f.selection_set),
            })
        }
        gql_query::Selection::FragmentSpread(fs) => {
            json!({ "kind": "fragmentSpread", "name": fs.fragment_name })
        }
        gql_query::Selection::InlineFragment(inf) => {
            json!({
                "kind": "inlineFragment",
                "on": inf.type_condition.as_ref().map(|tc| { let gql_query::TypeCondition::On(name) = tc; name.to_string() }),
                "selections": convert_selection_set(&inf.selection_set),
            })
        }
    }
}

fn convert_query_type(t: &gql_query::Type<'_, String>) -> Value {
    match t {
        gql_query::Type::NamedType(name) => json!({ "kind": "named", "name": name }),
        gql_query::Type::ListType(inner) => json!({ "kind": "list", "of": convert_query_type(inner) }),
        gql_query::Type::NonNullType(inner) => json!({ "kind": "nonNull", "of": convert_query_type(inner) }),
    }
}

fn convert_query_value(v: &gql_query::Value<'_, String>) -> Value {
    match v {
        gql_query::Value::Variable(name) => json!({ "kind": "variable", "name": name }),
        gql_query::Value::String(s) => json!({ "kind": "string", "value": s }),
        gql_query::Value::Int(n) => json!({ "kind": "int", "value": n.as_i64() }),
        gql_query::Value::Float(f) => json!({ "kind": "float", "value": f }),
        gql_query::Value::Boolean(b) => json!({ "kind": "boolean", "value": b }),
        gql_query::Value::Null => json!({ "kind": "null" }),
        gql_query::Value::Enum(e) => json!({ "kind": "enum", "value": e }),
        gql_query::Value::List(items) => json!({ "kind": "list", "values": items.iter().map(convert_query_value).collect::<Vec<_>>() }),
        gql_query::Value::Object(fields) => {
            let mut map = serde_json::Map::new();
            for (k, v) in fields { map.insert(k.to_string(), convert_query_value(v)); }
            json!({ "kind": "object", "fields": map })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_simple_schema() {
        let result = parse_schema("type Query { hello: String }");
        assert!(result.get("error").is_none());
        let types = result.get("types").unwrap();
        assert!(types.get("Query").is_some());
        let query = types.get("Query").unwrap();
        assert!(query.get("fields").unwrap().get("hello").is_some());
    }

    #[test]
    fn parse_schema_with_args() {
        let result = parse_schema("type Query { user(id: ID!): User } type User { name: String, age: Int }");
        assert!(result.get("error").is_none());
        let user_field = &result["types"]["Query"]["fields"]["user"];
        assert!(user_field["args"]["id"].is_object());
    }

    #[test]
    fn parse_schema_with_enums() {
        let result = parse_schema("enum Status { ACTIVE INACTIVE } type Query { status: Status }");
        assert_eq!(result["types"]["Status"]["kind"], "enum");
        assert_eq!(result["types"]["Status"]["values"][0], "ACTIVE");
    }

    #[test]
    fn parse_schema_with_input() {
        let result = parse_schema("input CreateUser { name: String!, email: String } type Query { ok: Boolean }");
        assert_eq!(result["types"]["CreateUser"]["kind"], "input");
    }

    #[test]
    fn parse_schema_with_interface() {
        let result = parse_schema("interface Node { id: ID! } type User implements Node { id: ID!, name: String } type Query { node: Node }");
        assert_eq!(result["types"]["Node"]["kind"], "interface");
        assert_eq!(result["types"]["User"]["interfaces"][0], "Node");
    }

    #[test]
    fn parse_schema_with_union() {
        let result = parse_schema("type Dog { name: String } type Cat { name: String } union Animal = Dog | Cat type Query { pet: Animal }");
        assert_eq!(result["types"]["Animal"]["kind"], "union");
        assert_eq!(result["types"]["Animal"]["members"][0], "Dog");
    }

    #[test]
    fn parse_schema_with_list_types() {
        let result = parse_schema("type Query { items: [String!]! }");
        let t = &result["types"]["Query"]["fields"]["items"]["type"];
        assert_eq!(t["kind"], "nonNull");
        assert_eq!(t["of"]["kind"], "list");
        assert_eq!(t["of"]["of"]["kind"], "nonNull");
        assert_eq!(t["of"]["of"]["of"]["kind"], "named");
        assert_eq!(t["of"]["of"]["of"]["name"], "String");
    }

    #[test]
    fn parse_schema_error() {
        let result = parse_schema("type Query {{{ broken }}}");
        assert!(result.get("error").is_some());
    }

    #[test]
    fn parse_simple_query() {
        let result = parse_query("{ hello }");
        assert!(result.get("error").is_none());
        assert_eq!(result["operation"], "query");
        assert_eq!(result["selections"][0]["name"], "hello");
    }

    #[test]
    fn parse_query_with_args() {
        let result = parse_query("query { user(id: \"123\") { name } }");
        assert_eq!(result["selections"][0]["name"], "user");
        assert_eq!(result["selections"][0]["args"]["id"]["kind"], "string");
        assert_eq!(result["selections"][0]["selections"][0]["name"], "name");
    }

    #[test]
    fn parse_query_with_variables() {
        let result = parse_query("query GetUser($id: ID!) { user(id: $id) { name } }");
        assert_eq!(result["name"], "GetUser");
        assert_eq!(result["variables"][0]["name"], "id");
        assert_eq!(result["selections"][0]["args"]["id"]["kind"], "variable");
    }

    #[test]
    fn parse_query_with_alias() {
        let result = parse_query("{ me: user(id: \"1\") { name } }");
        assert_eq!(result["selections"][0]["alias"], "me");
        assert_eq!(result["selections"][0]["name"], "user");
    }

    #[test]
    fn parse_mutation() {
        let result = parse_query("mutation { createUser(name: \"test\") { id } }");
        assert_eq!(result["operation"], "mutation");
    }

    #[test]
    fn parse_fragment() {
        let result = parse_query("query { user { ...UserFields } } fragment UserFields on User { name email }");
        assert!(result.get("fragments").is_some());
        assert_eq!(result["fragments"]["UserFields"]["on"], "User");
    }

    #[test]
    fn parse_inline_fragment() {
        let result = parse_query("{ node { ... on User { name } ... on Post { title } } }");
        let sels = &result["selections"][0]["selections"];
        assert_eq!(sels[0]["kind"], "inlineFragment");
        assert_eq!(sels[0]["on"], "User");
    }

    #[test]
    fn parse_query_error() {
        let result = parse_query("{ hello(");
        assert!(result.get("error").is_some());
    }

    #[test]
    fn validate_valid_query() {
        let schema = parse_schema("type Query { hello: String, user(id: ID!): User } type User { name: String }");
        let query = parse_query("{ hello, user(id: \"1\") { name } }");
        let result = validate(&schema, &query);
        assert_eq!(result["valid"], true);
    }

    #[test]
    fn validate_invalid_field() {
        let schema = parse_schema("type Query { hello: String }");
        let query = parse_query("{ hello, nonexistent }");
        let result = validate(&schema, &query);
        assert_eq!(result["valid"], false);
        assert!(result["errors"][0]["message"].as_str().unwrap().contains("nonexistent"));
    }

    #[test]
    fn validate_nested_invalid_field() {
        let schema = parse_schema("type Query { user: User } type User { name: String }");
        let query = parse_query("{ user { name, email } }");
        let result = validate(&schema, &query);
        assert_eq!(result["valid"], false);
        assert!(result["errors"][0]["message"].as_str().unwrap().contains("email"));
    }

    #[test]
    fn validate_introspection_allowed() {
        let schema = parse_schema("type Query { hello: String }");
        let query = parse_query("{ __schema { queryType { name } } }");
        let result = validate(&schema, &query);
        assert_eq!(result["valid"], true);
    }
}
