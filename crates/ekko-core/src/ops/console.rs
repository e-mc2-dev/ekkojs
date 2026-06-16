// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────


pub fn console_log(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    println!("{}", format_args_js(scope, &args));
}

pub fn console_error(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    eprintln!("{}", format_args_js(scope, &args));
}

pub fn console_table(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    if args.length() == 0 {
        println!();
        return;
    }

    let data = args.get(0);

    if data.is_array() {
        let arr = v8::Local::<v8::Array>::try_from(data).unwrap();
        let len = arr.length();

        let mut all_keys: Vec<String> = Vec::new();
        for i in 0..len {
            if let Some(elem) = arr.get_index(scope, i) {
                if elem.is_object() && !elem.is_null() && !elem.is_array() {
                    let obj = v8::Local::<v8::Object>::try_from(elem).unwrap();
                    for key in get_own_keys(scope, obj) {
                        if !all_keys.contains(&key) {
                            all_keys.push(key);
                        }
                    }
                }
            }
        }

        if all_keys.is_empty() {
            let headers = vec!["(index)".to_string(), "Values".to_string()];
            let mut rows = Vec::new();
            for i in 0..len {
                let val = arr.get_index(scope, i);
                rows.push(vec![i.to_string(), value_to_cell(scope, val)]);
            }
            print_table(&headers, &rows);
        } else {
            let mut headers = vec!["(index)".to_string()];
            headers.extend(all_keys.iter().cloned());

            let mut rows = Vec::new();
            for i in 0..len {
                let mut row = vec![i.to_string()];
                if let Some(elem) = arr.get_index(scope, i) {
                    if elem.is_object() && !elem.is_null() {
                        let obj = v8::Local::<v8::Object>::try_from(elem).unwrap();
                        for key in &all_keys {
                            let k = v8::String::new(scope, key).unwrap();
                            let val = obj.get(scope, k.into());
                            row.push(value_to_cell(scope, val));
                        }
                    } else {
                        for _ in &all_keys {
                            row.push(String::new());
                        }
                    }
                }
                rows.push(row);
            }
            print_table(&headers, &rows);
        }
    } else if data.is_object() && !data.is_null() {
        let obj = v8::Local::<v8::Object>::try_from(data).unwrap();
        let keys = get_own_keys(scope, obj);
        let headers = vec!["(index)".to_string(), "Values".to_string()];
        let mut rows = Vec::new();
        for key in &keys {
            let k = v8::String::new(scope, key).unwrap();
            let val = obj.get(scope, k.into());
            rows.push(vec![key.clone(), value_to_cell(scope, val)]);
        }
        print_table(&headers, &rows);
    } else {
        let s = data
            .to_string(scope)
            .map(|s| s.to_rust_string_lossy(scope))
            .unwrap_or_else(|| "undefined".to_string());
        println!("{}", s);
    }
}

fn format_args_js(scope: &mut v8::HandleScope, args: &v8::FunctionCallbackArguments) -> String {
    let mut parts = Vec::with_capacity(args.length() as usize);
    for i in 0..args.length() {
        let arg = args.get(i);

        if arg.is_string() {
            parts.push(arg.to_rust_string_lossy(scope));
        } else {
            let mut seen = Vec::new();
            parts.push(inspect_value(scope, arg, 0, &mut seen));
        }
    }
    parts.join(" ")
}

fn is_ident_key(s: &str) -> bool {
    let mut chars = s.chars();
    match chars.next() {
        Some(c) if c.is_ascii_alphabetic() || c == '_' || c == '$' => {}
        _ => return false,
    }
    chars.all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '$')
}

fn inspect_value(
    scope: &mut v8::HandleScope,
    val: v8::Local<v8::Value>,
    depth: usize,
    seen: &mut Vec<i32>,
) -> String {
    const MAX_DEPTH: usize = 4;
    const MAX_ITEMS: u32 = 100;

    if val.is_null() { return "null".to_string(); }
    if val.is_undefined() { return "undefined".to_string(); }
    if val.is_string() {
        let s = val.to_rust_string_lossy(scope);
        if depth == 0 { return s; }
        return format!("'{}'", s.replace('\\', "\\\\").replace('\'', "\\'").replace('\n', "\\n"));
    }
    if val.is_boolean() || val.is_number() { return val.to_rust_string_lossy(scope); }
    if val.is_big_int() { return format!("{}n", val.to_rust_string_lossy(scope)); }
    if val.is_symbol() || val.is_function() {
        
        if val.is_function() {
            let name = v8::Local::<v8::Function>::try_from(val)
                .ok()
                .map(|f| f.get_name(scope).to_rust_string_lossy(scope))
                .unwrap_or_default();
            return if name.is_empty() { "[Function (anonymous)]".to_string() } else { format!("[Function: {}]", name) };
        }
        return val.to_rust_string_lossy(scope);
    }
    
    if val.is_native_error() {
        return val.to_rust_string_lossy(scope);
    }
    if val.is_date() {
        return val.to_rust_string_lossy(scope);
    }

    if val.is_object() {
        if let Ok(obj) = v8::Local::<v8::Object>::try_from(val) {
            let id = obj.get_identity_hash().get();
            if seen.contains(&id) { return "[Circular]".to_string(); }
            if depth >= MAX_DEPTH {
                return if val.is_array() { "[Array]".to_string() } else { "[Object]".to_string() };
            }
            seen.push(id);

            let out = if val.is_array() {
                let arr = v8::Local::<v8::Array>::try_from(val).unwrap();
                let len = arr.length();
                let mut items = Vec::new();
                for i in 0..len.min(MAX_ITEMS) {
                    let elem = arr.get_index(scope, i).unwrap_or_else(|| v8::undefined(scope).into());
                    items.push(inspect_value(scope, elem, depth + 1, seen));
                }
                if len > MAX_ITEMS { items.push(format!("... {} more", len - MAX_ITEMS)); }
                if items.is_empty() { "[]".to_string() } else { format!("[ {} ]", items.join(", ")) }
            } else {
                let keys = get_own_keys(scope, obj);
                let mut items = Vec::new();
                for (n, key) in keys.iter().enumerate() {
                    if n as u32 >= MAX_ITEMS { items.push(format!("... {} more", keys.len() - n)); break; }
                    let k = v8::String::new(scope, key).unwrap();
                    let v = obj.get(scope, k.into()).unwrap_or_else(|| v8::undefined(scope).into());
                    let vs = inspect_value(scope, v, depth + 1, seen);
                    if is_ident_key(key) { items.push(format!("{}: {}", key, vs)); }
                    else { items.push(format!("'{}': {}", key, vs)); }
                }
                if items.is_empty() { "{}".to_string() } else { format!("{{ {} }}", items.join(", ")) }
            };
            seen.pop();
            return out;
        }
    }
    val.to_rust_string_lossy(scope)
}

const MAX_CELL_WIDTH: usize = 30;

fn truncate_cell(s: &str) -> String {
    if s.chars().count() > MAX_CELL_WIDTH {
        let truncated: String = s.chars().take(MAX_CELL_WIDTH - 3).collect();
        format!("{}...", truncated)
    } else {
        s.to_string()
    }
}

fn value_to_cell(scope: &mut v8::HandleScope, val: Option<v8::Local<v8::Value>>) -> String {
    match val {
        None => String::new(),
        Some(v) if v.is_undefined() => String::new(),
        Some(v) if v.is_string() => {
            let s = v.to_rust_string_lossy(scope);
            format!("'{}'", s)
        }
        Some(v) => v
            .to_string(scope)
            .map(|s| s.to_rust_string_lossy(scope))
            .unwrap_or_default(),
    }
}

fn get_own_keys(scope: &mut v8::HandleScope, obj: v8::Local<v8::Object>) -> Vec<String> {
    let args = v8::GetPropertyNamesArgs {
        mode: v8::KeyCollectionMode::OwnOnly,
        property_filter: v8::PropertyFilter::ONLY_ENUMERABLE | v8::PropertyFilter::SKIP_SYMBOLS,
        index_filter: v8::IndexFilter::SkipIndices,
        key_conversion: v8::KeyConversionMode::ConvertToString,
    };
    match obj.get_own_property_names(scope, args) {
        Some(keys) => {
            let mut result = Vec::with_capacity(keys.length() as usize);
            for i in 0..keys.length() {
                if let Some(k) = keys.get_index(scope, i) {
                    result.push(k.to_rust_string_lossy(scope));
                }
            }
            result
        }
        None => Vec::new(),
    }
}

fn print_table(headers: &[String], rows: &[Vec<String>]) {
    let col_count = headers.len();

    let mut widths: Vec<usize> = headers.iter().map(|h| h.len()).collect();
    for row in rows {
        for (i, cell) in row.iter().enumerate() {
            if i < col_count {
                widths[i] = widths[i].max(truncate_cell(cell).len());
            }
        }
    }

    let top: Vec<String> = widths.iter().map(|w| "\u{2500}".repeat(w + 2)).collect();
    println!("\u{250c}{}\u{2510}", top.join("\u{252c}"));

    let hdr: Vec<String> = headers
        .iter()
        .enumerate()
        .map(|(i, h)| format!(" {:^w$} ", h, w = widths[i]))
        .collect();
    println!("\u{2502}{}\u{2502}", hdr.join("\u{2502}"));

    let sep: Vec<String> = widths.iter().map(|w| "\u{2500}".repeat(w + 2)).collect();
    println!("\u{251c}{}\u{2524}", sep.join("\u{253c}"));

    for row in rows {
        let cells: Vec<String> = (0..col_count)
            .map(|i| {
                let cell = row.get(i).map(|s| truncate_cell(s)).unwrap_or_default();
                format!(" {:^w$} ", cell, w = widths[i])
            })
            .collect();
        println!("\u{2502}{}\u{2502}", cells.join("\u{2502}"));
    }

    let bot: Vec<String> = widths.iter().map(|w| "\u{2500}".repeat(w + 2)).collect();
    println!("\u{2514}{}\u{2518}", bot.join("\u{2534}"));
}
