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
use std::time::Instant;

struct PerformanceEntry {
    name: String,
    entry_type: String,
    start_time: f64,
    duration: f64,
}

pub struct PerformanceState {
    epoch: Instant,
    entries: Vec<PerformanceEntry>,
}

impl PerformanceState {
    
    pub fn new() -> Rc<RefCell<Self>> {
        Rc::new(RefCell::new(Self {
            epoch: Instant::now(),
            entries: Vec::new(),
        }))
    }

    fn now(&self) -> f64 {
        self.epoch.elapsed().as_secs_f64() * 1000.0
    }
}

pub fn performance_now(
    scope: &mut v8::HandleScope,
    _args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let state = scope
        .get_slot::<Rc<RefCell<PerformanceState>>>()
        .unwrap()
        .clone();
    let ms = state.borrow().now();
    rv.set(v8::Number::new(scope, ms).into());
}

pub fn performance_mark(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let name = args.get(0).to_rust_string_lossy(scope);
    let state = scope
        .get_slot::<Rc<RefCell<PerformanceState>>>()
        .unwrap()
        .clone();
    let start_time = state.borrow().now();
    state.borrow_mut().entries.push(PerformanceEntry {
        name: name.clone(),
        entry_type: "mark".to_string(),
        start_time,
        duration: 0.0,
    });
    rv.set(make_entry_object(scope, &name, "mark", start_time, 0.0).into());
}

pub fn performance_measure(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let name = args.get(0).to_rust_string_lossy(scope);
    let start_mark = args.get(1).to_rust_string_lossy(scope);
    let end_mark = args.get(2).to_rust_string_lossy(scope);

    let state = scope
        .get_slot::<Rc<RefCell<PerformanceState>>>()
        .unwrap()
        .clone();
    let st = state.borrow();

    let start_time = st
        .entries
        .iter()
        .rev()
        .find(|e| e.entry_type == "mark" && e.name == start_mark)
        .map(|e| e.start_time);
    let end_time = st
        .entries
        .iter()
        .rev()
        .find(|e| e.entry_type == "mark" && e.name == end_mark)
        .map(|e| e.start_time);

    match (start_time, end_time) {
        (Some(s), Some(e)) => {
            let duration = e - s;
            drop(st);
            state.borrow_mut().entries.push(PerformanceEntry {
                name: name.clone(),
                entry_type: "measure".to_string(),
                start_time: s,
                duration,
            });
            rv.set(make_entry_object(scope, &name, "measure", s, duration).into());
        }
        _ => {
            drop(st);
            let msg = v8::String::new(scope, "mark not found").unwrap();
            scope.throw_exception(msg.into());
        }
    }
}

pub fn performance_get_entries_by_name(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let name = args.get(0).to_rust_string_lossy(scope);
    let state = scope
        .get_slot::<Rc<RefCell<PerformanceState>>>()
        .unwrap()
        .clone();
    let st = state.borrow();
    let matches: Vec<&PerformanceEntry> = st.entries.iter().filter(|e| e.name == name).collect();
    let arr = v8::Array::new(scope, matches.len() as i32);
    for (i, entry) in matches.iter().enumerate() {
        let obj = make_entry_object(
            scope,
            &entry.name,
            &entry.entry_type,
            entry.start_time,
            entry.duration,
        );
        arr.set_index(scope, i as u32, obj.into());
    }
    rv.set(arr.into());
}

pub fn performance_get_entries_by_type(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let entry_type = args.get(0).to_rust_string_lossy(scope);
    let state = scope
        .get_slot::<Rc<RefCell<PerformanceState>>>()
        .unwrap()
        .clone();
    let st = state.borrow();
    let matches: Vec<&PerformanceEntry> = st
        .entries
        .iter()
        .filter(|e| e.entry_type == entry_type)
        .collect();
    let arr = v8::Array::new(scope, matches.len() as i32);
    for (i, entry) in matches.iter().enumerate() {
        let obj = make_entry_object(
            scope,
            &entry.name,
            &entry.entry_type,
            entry.start_time,
            entry.duration,
        );
        arr.set_index(scope, i as u32, obj.into());
    }
    rv.set(arr.into());
}

fn make_entry_object<'s>(
    scope: &mut v8::HandleScope<'s>,
    name: &str,
    entry_type: &str,
    start_time: f64,
    duration: f64,
) -> v8::Local<'s, v8::Object> {
    let obj = v8::Object::new(scope);

    let k = v8::String::new(scope, "name").unwrap();
    let v = v8::String::new(scope, name).unwrap();
    obj.set(scope, k.into(), v.into());

    let k = v8::String::new(scope, "entryType").unwrap();
    let v = v8::String::new(scope, entry_type).unwrap();
    obj.set(scope, k.into(), v.into());

    let k = v8::String::new(scope, "startTime").unwrap();
    let v = v8::Number::new(scope, start_time);
    obj.set(scope, k.into(), v.into());

    let k = v8::String::new(scope, "duration").unwrap();
    let v = v8::Number::new(scope, duration);
    obj.set(scope, k.into(), v.into());

    obj
}
