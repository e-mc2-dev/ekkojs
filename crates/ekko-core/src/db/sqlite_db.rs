// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::collections::HashMap;
use std::sync::{Arc, Mutex, atomic::{AtomicI32, Ordering}};
use rusqlite::{Connection, params_from_iter, types::Value as SqlValue};

static NEXT_DB_ID: AtomicI32 = AtomicI32::new(1);
static NEXT_STMT_ID: AtomicI32 = AtomicI32::new(1);

thread_local! {
    static DB_HANDLES: std::cell::RefCell<HashMap<i32, Connection>> = std::cell::RefCell::new(HashMap::new());
    static STMT_CACHE: std::cell::RefCell<HashMap<i32, (i32, String)>> = std::cell::RefCell::new(HashMap::new());
}

pub fn db_open(path: &str) -> Result<i32, String> {
    let conn = if path == ":memory:" {
        Connection::open_in_memory()
    } else {
        Connection::open(path)
    }.map_err(|e| format!("db: {}", e))?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| format!("db: {}", e))?;

    
    conn.authorizer(Some(db_authorizer));
    let id = NEXT_DB_ID.fetch_add(1, Ordering::SeqCst);
    DB_HANDLES.with(|h| h.borrow_mut().insert(id, conn));
    Ok(id)
}

fn db_authorizer(ctx: rusqlite::hooks::AuthContext<'_>) -> rusqlite::hooks::Authorization {
    use rusqlite::hooks::{AuthAction, Authorization};
    match ctx.action {
        AuthAction::Attach { filename } => {
            if filename.is_empty()
                || filename == ":memory:"
                || crate::engine::v8_runtime::check_permission_path("fs", filename)
            {
                Authorization::Allow
            } else {
                Authorization::Deny
            }
        }
        _ => Authorization::Allow,
    }
}

pub fn db_exec(handle: i32, sql: &str, params_json: &str) -> Result<i32, String> {
    DB_HANDLES.with(|h| {
        let handles = h.borrow();
        let conn = handles.get(&handle).ok_or("db: invalid handle")?;
        let params = parse_params(params_json);
        if params.is_empty() {

            
            conn.execute_batch(sql).map_err(|e| format!("db: {}", e))?;
            Ok(conn.changes() as i32)
        } else {
            let named: Vec<(&str, &dyn rusqlite::types::ToSql)> = params.iter()
                .map(|(k, v)| (k.as_str(), v as &dyn rusqlite::types::ToSql))
                .collect();
            let affected = conn.execute(sql, named.as_slice())
                .map_err(|e| format!("db: {}", e))?;
            Ok(affected as i32)
        }
    })
}

pub fn db_query(handle: i32, sql: &str, params_json: &str) -> Result<String, String> {
    DB_HANDLES.with(|h| {
        let handles = h.borrow();
        let conn = handles.get(&handle).ok_or("db: invalid handle")?;
        let params = parse_params(params_json);
        let mut stmt = conn.prepare(sql).map_err(|e| format!("db: {}", e))?;
        query_to_json(&mut stmt, &params)
    })
}

pub fn db_prepare(handle: i32, sql: &str) -> Result<i32, String> {
    DB_HANDLES.with(|h| {
        let handles = h.borrow();
        let _conn = handles.get(&handle).ok_or("db: invalid handle")?;
        let stmt_id = NEXT_STMT_ID.fetch_add(1, Ordering::SeqCst);
        STMT_CACHE.with(|s| s.borrow_mut().insert(stmt_id, (handle, sql.to_string())));
        Ok(stmt_id)
    })
}

pub fn db_stmt_exec(stmt_handle: i32, params_json: &str) -> Result<i32, String> {
    let (db_handle, sql) = STMT_CACHE.with(|s| {
        s.borrow().get(&stmt_handle).cloned().ok_or("db: invalid statement handle".to_string())
    })?;
    db_exec(db_handle, &sql, params_json)
}

pub fn db_stmt_query(stmt_handle: i32, params_json: &str) -> Result<String, String> {
    let (db_handle, sql) = STMT_CACHE.with(|s| {
        s.borrow().get(&stmt_handle).cloned().ok_or("db: invalid statement handle".to_string())
    })?;
    db_query(db_handle, &sql, params_json)
}

pub fn db_stmt_close(stmt_handle: i32) {
    STMT_CACHE.with(|s| s.borrow_mut().remove(&stmt_handle));
}

pub fn db_close(handle: i32) {
    DB_HANDLES.with(|h| h.borrow_mut().remove(&handle));
}

fn query_to_json(stmt: &mut rusqlite::Statement, params: &Vec<(String, SqlValue)>) -> Result<String, String> {
    use serde_json::{Value, Number};
    let col_count = stmt.column_count();
    let col_names: Vec<String> = (0..col_count).map(|i| stmt.column_name(i).unwrap_or("?").to_string()).collect();

    let named: Vec<(&str, &dyn rusqlite::types::ToSql)> = params.iter()
        .map(|(k, v)| (k.as_str(), v as &dyn rusqlite::types::ToSql))
        .collect();

    let mut rows_vec: Vec<Vec<SqlValue>> = Vec::new();
    if params.is_empty() {
        let mut qr = stmt.query([]).map_err(|e| format!("db: {}", e))?;
        while let Some(row) = qr.next().map_err(|e| format!("db: {}", e))? {
            rows_vec.push(row_to_values(row, col_count));
        }
    } else {
        let mut qr = stmt.query(named.as_slice()).map_err(|e| format!("db: {}", e))?;
        while let Some(row) = qr.next().map_err(|e| format!("db: {}", e))? {
            rows_vec.push(row_to_values(row, col_count));
        }
    }

    

    let columns: Vec<Value> = col_names.into_iter().map(Value::String).collect();
    let rows: Vec<Value> = rows_vec.iter().map(|vals| {
        Value::Array(vals.iter().map(|v| match v {
            SqlValue::Null => Value::Null,
            SqlValue::Integer(n) => Value::Number((*n).into()),
            
            SqlValue::Real(f) => Number::from_f64(*f).map(Value::Number).unwrap_or(Value::Null),
            SqlValue::Text(s) => Value::String(s.clone()),
            SqlValue::Blob(_) => Value::Null, 
        }).collect())
    }).collect();

    serde_json::to_string(&serde_json::json!({ "columns": columns, "rows": rows }))
        .map_err(|e| format!("db: {}", e))
}

fn row_to_values(row: &rusqlite::Row, count: usize) -> Vec<SqlValue> {
    (0..count).map(|i| row.get::<_, SqlValue>(i).unwrap_or(SqlValue::Null)).collect()
}

fn parse_params(json: &str) -> Vec<(String, SqlValue)> {
    if json.is_empty() || json == "{}" || json == "null" { return Vec::new(); }
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(json);
    match parsed {
        Ok(serde_json::Value::Object(map)) => {
            map.into_iter().map(|(k, v)| {
                let key = if k.starts_with('@') { k } else { format!("@{}", k) };
                let val = match v {
                    serde_json::Value::Null => SqlValue::Null,
                    serde_json::Value::Bool(b) => SqlValue::Integer(if b { 1 } else { 0 }),
                    serde_json::Value::Number(n) => {
                        if let Some(i) = n.as_i64() { SqlValue::Integer(i) }
                        else if let Some(f) = n.as_f64() { SqlValue::Real(f) }
                        else { SqlValue::Null }
                    }
                    serde_json::Value::String(s) => SqlValue::Text(s),
                    _ => SqlValue::Text(v.to_string()),
                };
                (key, val)
            }).collect()
        }
        _ => Vec::new(),
    }
}

#[cfg(test)]
mod fuzz_tests {
    use super::*;

    
    #[test]
    fn fuzz_db_no_panic() {
        crate::fuzz_support::run_fuzz("db", |s| {
            if let Ok(h) = db_open(":memory:") {
                let _ = db_exec(h, "CREATE TABLE IF NOT EXISTS t(a)", "[]");
                
                let _ = db_exec(h, s, "[]");
                let _ = db_query(h, s, "[]");
                
                let params = serde_json::to_string(&vec![s]).unwrap_or_else(|_| "[]".to_string());
                let _ = db_exec(h, "INSERT INTO t VALUES(?1)", &params);
                let _ = db_query(h, "SELECT a FROM t", "[]");
                db_close(h);
            }
        });
    }
}
