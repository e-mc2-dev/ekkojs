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
use std::collections::HashMap;
use std::rc::Rc;
use std::time::Duration;
use tokio::time::Instant;

pub struct TimerState {
    next_id: u32,
    pub timers: HashMap<u32, TimerEntry>,
}

pub struct TimerEntry {
    pub callback: v8::Global<v8::Function>,
    pub fire_at: Instant,
    pub interval_ms: Option<u64>,
}

impl TimerState {
    
    pub fn new() -> Rc<RefCell<Self>> {
        Rc::new(RefCell::new(Self {
            next_id: 1,
            timers: HashMap::new(),
        }))
    }
}

pub fn set_timeout(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let cb = v8::Local::<v8::Function>::try_from(args.get(0)).unwrap();
    let ms = args.get(1).number_value(scope).unwrap_or(0.0) as u64;
    let global_cb = v8::Global::new(scope, cb);
    let state = scope
        .get_slot::<Rc<RefCell<TimerState>>>()
        .unwrap()
        .clone();
    let mut st = state.borrow_mut();
    let id = st.next_id;
    st.next_id += 1;
    st.timers.insert(
        id,
        TimerEntry {
            callback: global_cb,
            fire_at: Instant::now() + Duration::from_millis(ms),
            interval_ms: None,
        },
    );
    rv.set(v8::Integer::new(scope, id as i32).into());
}

pub fn set_interval(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let cb = v8::Local::<v8::Function>::try_from(args.get(0)).unwrap();
    let ms = args.get(1).number_value(scope).unwrap_or(0.0) as u64;
    let global_cb = v8::Global::new(scope, cb);
    let state = scope
        .get_slot::<Rc<RefCell<TimerState>>>()
        .unwrap()
        .clone();
    let mut st = state.borrow_mut();
    let id = st.next_id;
    st.next_id += 1;
    st.timers.insert(
        id,
        TimerEntry {
            callback: global_cb,
            fire_at: Instant::now() + Duration::from_millis(ms),
            interval_ms: Some(ms),
        },
    );
    rv.set(v8::Integer::new(scope, id as i32).into());
}

pub fn clear_timeout(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let id = args.get(0).int32_value(scope).unwrap_or(0) as u32;
    let state = scope
        .get_slot::<Rc<RefCell<TimerState>>>()
        .unwrap()
        .clone();
    state.borrow_mut().timers.remove(&id);
}
