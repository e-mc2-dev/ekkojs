// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::cell::RefCell;
use std::rc::Rc;
use crate::tooling::coverage::{ScriptCoverage, FunctionCoverage, CoverageRange};

pub struct CoverageChannel {
    base: v8::inspector::ChannelBase,
    pub responses: Rc<RefCell<Vec<String>>>,
}

impl CoverageChannel {
    
    pub fn new(responses: Rc<RefCell<Vec<String>>>) -> Self {
        Self {
            base: v8::inspector::ChannelBase::new::<Self>(),
            responses,
        }
    }
}

impl v8::inspector::ChannelImpl for CoverageChannel {
    fn base(&self) -> &v8::inspector::ChannelBase { &self.base }
    fn base_mut(&mut self) -> &mut v8::inspector::ChannelBase { &mut self.base }
    unsafe fn base_ptr(this: *const Self) -> *const v8::inspector::ChannelBase {
        std::ptr::addr_of!((*this).base)
    }
    
    fn send_response(&mut self, _call_id: i32, message: v8::UniquePtr<v8::inspector::StringBuffer>) {
        if let Some(buf) = message.as_ref() {
            let view = buf.string();
            let s = view.to_string();
            self.responses.borrow_mut().push(s);
        }
    }
    fn send_notification(&mut self, _message: v8::UniquePtr<v8::inspector::StringBuffer>) {}
    fn flush_protocol_notifications(&mut self) {}
}

pub struct CoverageClient {
    base: v8::inspector::V8InspectorClientBase,
}

impl CoverageClient {
    
    pub fn new() -> Self {
        Self {
            base: v8::inspector::V8InspectorClientBase::new::<Self>(),
        }
    }
}

impl v8::inspector::V8InspectorClientImpl for CoverageClient {
    fn base(&self) -> &v8::inspector::V8InspectorClientBase { &self.base }
    fn base_mut(&mut self) -> &mut v8::inspector::V8InspectorClientBase { &mut self.base }
    unsafe fn base_ptr(this: *const Self) -> *const v8::inspector::V8InspectorClientBase {
        std::ptr::addr_of!((*this).base)
    }
}

fn send_cdp(session: &mut v8::inspector::V8InspectorSession, id: i32, method: &str, params: &str) {
    let msg = if params.is_empty() {
        format!("{{\"id\":{},\"method\":\"{}\"}}", id, method)
    } else {
        format!("{{\"id\":{},\"method\":\"{}\",\"params\":{}}}", id, method, params)
    };
    let msg_u16: Vec<u16> = msg.encode_utf16().collect();
    let view = v8::inspector::StringView::from(msg_u16.as_slice());
    session.dispatch_protocol_message(view);
}

pub fn parse_coverage_response(json: &str) -> Vec<ScriptCoverage> {
    let mut scripts = Vec::new();

    let result_key = "\"result\":[";
    let search_start = match json.find(result_key) {
        Some(p) => p + result_key.len(),
        None => return scripts,
    };

    let mut pos = search_start;
    while pos < json.len() {
        match json[pos..].find("\"scriptId\"") {
            None => break,
            Some(offset) => {
                let script_start = pos + offset;
                let url = extract_string(json, script_start, "url");

                if url.is_empty() || url.starts_with("v8:") {
                    pos = script_start + 1;
                    continue;
                }

                let funcs_key = "\"functions\":[";
                if let Some(funcs_offset) = json[script_start..].find(funcs_key) {
                    let funcs_start = script_start + funcs_offset + funcs_key.len();
                    let functions = parse_functions(json, funcs_start, json.len());

                    scripts.push(ScriptCoverage { url, functions });
                }

                pos = script_start + 1;
            }
        }
    }

    scripts
}

fn extract_string(json: &str, from: usize, key: &str) -> String {
    let search = format!("\"{}\":\"", key);
    if let Some(start) = json[from..].find(&search) {
        let val_start = from + start + search.len();
        if let Some(end) = json[val_start..].find('"') {
            return json[val_start..val_start + end].to_string();
        }
    }
    String::new()
}

fn parse_functions(json: &str, from: usize, limit: usize) -> Vec<FunctionCoverage> {
    let mut functions = Vec::new();
    let mut pos = from;

    while pos < limit {
        match json[pos..].find("\"functionName\"") {
            None => break,
            Some(offset) => {
                let func_start = pos + offset;
                if let Some(ns) = json[pos..].find("\"scriptId\"") {
                    if func_start > pos + ns { break; }
                }
                let name = extract_string(json, func_start, "functionName");
                let ranges = parse_ranges(json, func_start);
                functions.push(FunctionCoverage { function_name: name, ranges });
                pos = func_start + 1;
            }
        }
    }
    functions
}

fn parse_ranges(json: &str, from: usize) -> Vec<CoverageRange> {
    let mut ranges = Vec::new();
    let key = "\"ranges\":[";
    let start = match json[from..].find(key) {
        Some(p) => from + p + key.len(),
        None => return ranges,
    };
    let end = match json[start..].find(']') {
        Some(p) => start + p,
        None => return ranges,
    };
    let section = &json[start..end];
    let mut pos = 0;
    while pos < section.len() {
        match section[pos..].find("\"startOffset\"") {
            None => break,
            Some(offset) => {
                let entry = pos + offset;
                let s = extract_num(section, entry, "startOffset");
                let e = extract_num(section, entry, "endOffset");
                let c = extract_num(section, entry, "count");
                ranges.push(CoverageRange {
                    start_offset: s as usize,
                    end_offset: e as usize,
                    count: c as u32,
                });
                pos = entry + 1;
            }
        }
    }
    ranges
}

fn extract_num(json: &str, from: usize, key: &str) -> i64 {
    let search = format!("\"{}\":", key);
    if let Some(start) = json[from..].find(&search) {
        let val_start = from + start + search.len();
        let mut end = val_start;
        while end < json.len() {
            let b = json.as_bytes()[end];
            if b == b',' || b == b'}' || b == b']' { break; }
            end += 1;
        }
        json[val_start..end].trim().parse().unwrap_or(0)
    } else { 0 }
}
