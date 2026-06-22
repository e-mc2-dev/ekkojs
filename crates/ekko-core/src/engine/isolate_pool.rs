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
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::thread;
use std::time::{Duration, Instant};
use tokio::sync::{mpsc, oneshot};
use tokio::time::Instant as TokioInstant;

use crate::engine::channel::ChannelRegistry;
use crate::ops::async_state::AsyncState;
use crate::ops::performance::PerformanceState;
use crate::ops::timers::{TimerEntry, TimerState};

const IDLE_SHRINK_SECS: u64 = 30;

struct WorkerTeardownGuard(i64);
impl Drop for WorkerTeardownGuard {
    fn drop(&mut self) {
        crate::module_loader::reset_worker_thread_caches();
        crate::ops::callback_bridge::unregister_sender(self.0);
    }
}

pub struct ChildTracker {
    handles: Vec<v8::IsolateHandle>,
}

impl ChildTracker {
    
    pub fn new() -> Arc<Mutex<Self>> {
        Arc::new(Mutex::new(Self { handles: Vec::new() }))
    }

    pub fn register(&mut self, handle: v8::IsolateHandle) {
        self.handles.push(handle);
    }

    pub fn abort_all(&self) {
        for handle in &self.handles {
            handle.terminate_execution();
        }
    }
}

pub struct WorkRequest {
    pub fn_source: String,
    pub args_json: String,
    pub respond: oneshot::Sender<Result<String, String>>,
    pub pool: Arc<Mutex<IsolatePool>>,
    pub registry: Arc<Mutex<ChannelRegistry>>,
    pub timeout_ms: Option<u64>,
    pub heap_limit: Option<usize>,
    pub parent_tracker: Arc<Mutex<ChildTracker>>,
    pub permissions: crate::ffi::ffi_runtime::PermissionSet,
}

struct WorkerHandle {
    tx: mpsc::Sender<WorkRequest>,
}

pub struct IsolatePool {
    workers: Vec<Option<WorkerHandle>>,
    idle: Vec<usize>,
    max_size: usize,
    pub last_dispatch: Instant,
    min_size: usize,
}

impl IsolatePool {
    
    pub fn new(warm_count: usize, max_size: usize) -> Self {
        crate::engine::v8_runtime::init_v8();
        let cpus = thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(4);
        let mut pool = Self {
            workers: Vec::new(),
            idle: Vec::new(),
            max_size,
            last_dispatch: Instant::now(),
            min_size: cpus.min(2),
        };
        for _ in 0..warm_count {
            pool.spawn_worker();
        }
        pool
    }

    pub fn default_pool() -> Self {
        let cpus = thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(4);
        let warm = cpus.min(4);
        let max = (cpus * 4).min(256);
        Self::new(warm, max)
    }

    fn spawn_worker(&mut self) -> usize {
        let id = self.workers.len();
        let (tx, mut rx) = mpsc::channel::<WorkRequest>(1);

        

        thread::Builder::new().stack_size(8 * 1024 * 1024).spawn(move || {
            crate::engine::v8_runtime::init_v8();
            
            crate::engine::v8_runtime::prewarm_worker_native_apis();
            while let Some(req) = rx.blocking_recv() {
                crate::engine::v8_runtime::set_context_permissions(req.permissions.clone());
                let result = run_in_worker(
                    &req.fn_source,
                    &req.args_json,
                    req.pool,
                    req.registry,
                    req.timeout_ms,
                    req.heap_limit,
                    req.parent_tracker,
                );
                let _ = req.respond.send(result);
            }
        }).expect("spawn isolate-pool worker thread");

        self.workers.push(Some(WorkerHandle { tx }));
        self.idle.push(id);
        id
    }

    fn shrink_if_idle(&mut self) {
        if self.last_dispatch.elapsed() < Duration::from_secs(IDLE_SHRINK_SECS) {
            return;
        }
        while self.idle.len() > self.min_size {
            if let Some(id) = self.idle.pop() {
                self.workers[id] = None;
            }
        }
    }

    pub fn claim(&mut self) -> Result<(usize, mpsc::Sender<WorkRequest>), String> {
        self.shrink_if_idle();
        self.last_dispatch = Instant::now();

        while let Some(id) = self.idle.pop() {
            if let Some(ref handle) = self.workers[id] {
                return Ok((id, handle.tx.clone()));
            }
        }

        let alive = self.workers.iter().filter(|w| w.is_some()).count();
        if alive >= self.max_size {
            return Err(format!(
                "isolate pool at capacity ({}/{})",
                alive, self.max_size
            ));
        }
        let id = self.spawn_worker();
        self.idle.pop();
        Ok((id, self.workers[id].as_ref().unwrap().tx.clone()))
    }

    pub fn release(&mut self, id: usize) {
        if id < self.workers.len() && self.workers[id].is_some() && !self.idle.contains(&id) {
            self.idle.push(id);
        }
    }

    pub fn idle_count(&self) -> usize {
        self.idle.len()
    }

    pub fn worker_count(&self) -> usize {
        self.workers.iter().filter(|w| w.is_some()).count()
    }
}

fn run_in_worker(
    fn_source: &str,
    args_json: &str,
    pool: Arc<Mutex<IsolatePool>>,
    registry: Arc<Mutex<ChannelRegistry>>,
    timeout_ms: Option<u64>,
    heap_limit: Option<usize>,
    parent_tracker: Arc<Mutex<ChildTracker>>,
) -> Result<String, String> {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|e| e.to_string())?;

    rt.block_on(async {
        let mut params = v8::CreateParams::default();
        if let Some(limit) = heap_limit {
            params = params.heap_limits(0, limit);
        }
        let isolate = &mut v8::Isolate::new(params);

        if heap_limit.is_some() {
            extern "C" fn near_heap_limit(
                data: *mut std::ffi::c_void,
                current_heap_limit: usize,
                _initial_heap_limit: usize,
            ) -> usize {
                unsafe {
                    let handle = &*(data as *const v8::IsolateHandle);
                    handle.terminate_execution();
                }
                current_heap_limit.saturating_mul(2)
            }
            let handle = Box::new(isolate.thread_safe_handle());
            let handle_ptr = Box::into_raw(handle) as *mut std::ffi::c_void;
            isolate.add_near_heap_limit_callback(near_heap_limit, handle_ptr);
        }

        let isolate_handle = if timeout_ms.is_some() {
            Some(isolate.thread_safe_handle())
        } else {
            None
        };

        parent_tracker.lock().unwrap().register(isolate.thread_safe_handle());
        let own_tracker = ChildTracker::new();

        isolate.set_slot(TimerState::new());
        isolate.set_slot(AsyncState::new());
        isolate.set_slot(pool);
        isolate.set_slot(registry);
        isolate.set_slot(PerformanceState::new());
        isolate.set_slot(own_tracker.clone());

        

        let _teardown_guard = WorkerTeardownGuard(crate::engine::v8_runtime::install_worker_native_apis(isolate));

        let hs = &mut v8::HandleScope::new(isolate);
        let ctx = v8::Context::new(hs, Default::default());
        let scope = &mut v8::ContextScope::new(hs, ctx);

        crate::engine::v8_runtime::setup_globals(scope);

        let timeout_abort = if let (Some(ms), Some(handle)) = (timeout_ms, isolate_handle) {
            let (abort_tx, abort_rx) = std::sync::mpsc::channel::<()>();
            std::thread::spawn(move || {
                match abort_rx.recv_timeout(Duration::from_millis(ms)) {
                    Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                        handle.terminate_execution();
                    }
                    _ => {}
                }
            });
            Some(abort_tx)
        } else {
            None
        };

        
        let wrapper_src = "(function(__src,__aj){\
            function __rk(a){if(!a||typeof a!=='object')return a;\
              if(typeof a.__ekko_ch==='number')return Ekko.Channel.fromId(a.__ekko_ch);\
              if(Array.isArray(a))return a.map(__rk);\
              var o={};for(var k in a)o[k]=__rk(a[k]);return o;}\
            var __fn=(0,eval)('('+__src+')');\
            var __args=JSON.parse(__aj).map(__rk);\
            return Promise.resolve(__fn.apply(null,__args)).then(\
              function(r){return JSON.stringify(r);},\
              function(e){throw JSON.stringify({message:String(e),stack:(e&&e.stack)||''});}\
            );\
        })";

        let tc = &mut v8::TryCatch::new(scope);

        let wrapper_code = v8::String::new(tc, wrapper_src).unwrap();
        let wrapper_script = match v8::Script::compile(tc, wrapper_code, None) {
            Some(s) => s,
            None => {
                let exc = tc.exception().unwrap();
                return Err(exc.to_string(tc).unwrap().to_rust_string_lossy(tc));
            }
        };
        let wrapper_fn_val = match wrapper_script.run(tc) {
            Some(v) => v,
            None => {
                let exc = tc.exception().unwrap();
                return Err(exc.to_string(tc).unwrap().to_rust_string_lossy(tc));
            }
        };
        let wrapper_fn = v8::Local::<v8::Function>::try_from(wrapper_fn_val)
            .map_err(|_| "worker wrapper is not a function".to_string())?;

        let fn_src_v8 = v8::String::new(tc, fn_source).unwrap();
        let args_json_v8 = v8::String::new(tc, if args_json.is_empty() { "[]" } else { args_json }).unwrap();
        let undefined = v8::undefined(tc).into();

        let call_result = wrapper_fn.call(tc, undefined, &[fn_src_v8.into(), args_json_v8.into()]);

        let result_promise = match call_result {
            Some(v) => {
                match v8::Local::<v8::Promise>::try_from(v) {
                    Ok(p) => Some(v8::Global::new(tc, p)),
                    Err(_) => {
                        
                        if let Some(tx) = timeout_abort { let _ = tx.send(()); }
                        own_tracker.lock().unwrap().abort_all();
                        return Ok(v.to_rust_string_lossy(tc));
                    }
                }
            }
            None => {
                if let Some(tx) = timeout_abort { let _ = tx.send(()); }
                own_tracker.lock().unwrap().abort_all();
                if tc.has_terminated() {
                    return Err(if timeout_ms.is_some() {
                        format!("Worker timed out after {}ms", timeout_ms.unwrap())
                    } else {
                        "Worker exceeded heap limit".to_string()
                    });
                }
                let exc = tc.exception().unwrap();
                return Err(exc.to_string(tc).unwrap().to_rust_string_lossy(tc));
            }
        };

        tc.perform_microtask_checkpoint();

        loop {
            tc.perform_microtask_checkpoint();

            let timer_state = tc.get_slot::<Rc<RefCell<TimerState>>>().unwrap().clone();
            {
                let now = TokioInstant::now();
                let mut to_fire = Vec::new();
                let mut to_reschedule = Vec::new();
                {
                    let mut st = timer_state.borrow_mut();
                    let expired: Vec<u32> = st
                        .timers
                        .iter()
                        .filter(|(_, e)| e.fire_at <= now)
                        .map(|(&id, _)| id)
                        .collect();
                    for id in expired {
                        let entry = st.timers.remove(&id).unwrap();
                        to_fire.push(entry.callback.clone());
                        if let Some(ms) = entry.interval_ms {
                            to_reschedule.push((id, entry.callback, ms));
                        }
                    }
                    for (id, cb, ms) in to_reschedule {
                        st.timers.insert(id, TimerEntry {
                            callback: cb,
                            fire_at: TokioInstant::now() + Duration::from_millis(ms),
                            interval_ms: Some(ms),
                        });
                    }
                }
                for global_cb in to_fire {
                    let tc = &mut v8::HandleScope::new(tc); 
                    let cb = v8::Local::new(tc, &global_cb);
                    let undef = v8::undefined(tc).into();
                    cb.call(tc, undef, &[]);
                }
            }

            let async_state = tc.get_slot::<Rc<RefCell<AsyncState>>>().unwrap().clone();
            {
                let mut completions = Vec::new();
                {
                    let mut st = async_state.borrow_mut();
                    while let Ok(c) = st.rx.try_recv() {
                        completions.push(c);
                    }
                }
                for c in completions {
                    let mut st = async_state.borrow_mut();
                    if let Some(meta) = st.pending_promises.remove(&c.id) {
                        drop(st);

                        
                        let tc = &mut v8::HandleScope::new(tc);
                        let resolver = v8::Local::new(tc, &meta.resolver);
                        match c.result {
                            Ok(json_str) => {
                                let v8_str = v8::String::new(tc, &json_str).unwrap();
                                let parsed = v8::json::parse(tc, v8_str)
                                    .unwrap_or_else(|| v8::undefined(tc).into());
                                resolver.resolve(tc, parsed);
                            }
                            Err(msg) => {
                                let v = v8::String::new(tc, &msg).unwrap();
                                resolver.reject(tc, v.into());
                            }
                        }
                        tc.perform_microtask_checkpoint();
                    }
                }
            }

            
            if let Some(bridge_slot) = tc.get_slot::<Rc<RefCell<Option<crate::ops::callback_bridge::BridgeReceiver>>>>().cloned() {
                let mut br = bridge_slot.borrow_mut();
                if let Some(ref mut bridge) = *br {
                    while let Ok(req) = bridge.rx.try_recv() {
                        crate::engine::v8_runtime::dispatch_bridge_message(tc, &req);
                    }
                }
            }

            if tc.has_terminated() {
                break;
            }

            let has_timers = !timer_state.borrow().timers.is_empty();
            let has_async = async_state.borrow().has_pending();
            let has_server = tc.get_slot::<Arc<AtomicBool>>().map(|f| f.load(Ordering::Relaxed)).unwrap_or(false);
            let active_kids = tc.get_slot::<Arc<AtomicUsize>>().map(|c| c.load(Ordering::Relaxed)).unwrap_or(0);
            if !has_timers && !has_async && !has_server && active_kids == 0 {
                break;
            }

            let next_timer = timer_state.borrow().timers.values()
                .map(|t| t.fire_at)
                .min();
            let notify = async_state.borrow().notify.clone();
            let bridge_notify = tc.get_slot::<Rc<RefCell<Option<crate::ops::callback_bridge::BridgeReceiver>>>>()
                .and_then(|b| b.borrow().as_ref().map(|r| r.notify.clone()));

            match (next_timer, bridge_notify) {
                (Some(deadline), Some(bn)) => {
                    tokio::select! {
                        _ = tokio::time::sleep_until(deadline) => {}
                        _ = notify.notified() => {}
                        _ = bn.notified() => {}
                    }
                }
                (Some(deadline), None) => {
                    tokio::select! {
                        _ = tokio::time::sleep_until(deadline) => {}
                        _ = notify.notified() => {}
                    }
                }
                (None, Some(bn)) => {
                    tokio::select! {
                        _ = notify.notified() => {}
                        _ = bn.notified() => {}
                    }
                }
                (None, None) => {
                    notify.notified().await;
                }
            }
        }

        if let Some(tx) = timeout_abort {
            let _ = tx.send(());
        }

        let final_result = if tc.has_terminated() {
            Err(if timeout_ms.is_some() {
                format!("Worker timed out after {}ms", timeout_ms.unwrap())
            } else {
                "Worker exceeded heap limit".to_string()
            })
        } else if let Some(ref promise_global) = result_promise {
            let promise = v8::Local::new(tc, promise_global);
            match promise.state() {
                v8::PromiseState::Fulfilled => {
                    let val = promise.result(tc);
                    if val.is_undefined() || val.is_null() {
                        Ok("null".to_string())
                    } else {
                        Ok(val.to_rust_string_lossy(tc))
                    }
                }
                v8::PromiseState::Rejected => {
                    let val = promise.result(tc);
                    Err(val.to_rust_string_lossy(tc))
                }
                v8::PromiseState::Pending => {
                    Err("Worker promise did not resolve".to_string())
                }
            }
        } else {
            Ok("null".to_string())
        };

        own_tracker.lock().unwrap().abort_all();
        final_result
    })
}

pub async fn pool_execute(
    tx: mpsc::Sender<WorkRequest>,
    fn_source: String,
    args_json: String,
    pool: Arc<Mutex<IsolatePool>>,
    registry: Arc<Mutex<ChannelRegistry>>,
) -> Result<String, String> {
    let (respond_tx, respond_rx) = oneshot::channel();
    tx.send(WorkRequest {
        fn_source,
        args_json,
        respond: respond_tx,
        pool,
        registry,
        timeout_ms: None,
        heap_limit: None,
        parent_tracker: ChildTracker::new(),
        permissions: crate::ffi::ffi_runtime::PermissionSet::allow_all(),
    })
    .await
    .map_err(|e| e.to_string())?;
    respond_rx.await.map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_pool_and_registry() -> (Arc<Mutex<IsolatePool>>, Arc<Mutex<ChannelRegistry>>) {
        (
            Arc::new(Mutex::new(IsolatePool::new(0, 1))),
            ChannelRegistry::new(),
        )
    }

    #[tokio::test]
    async fn pool_basic_execute() {
        let mut pool = IsolatePool::new(1, 4);
        let (id, tx) = pool.claim().unwrap();
        let (p, r) = test_pool_and_registry();
        let result = pool_execute(tx, "() => 1 + 2".into(), "[]".into(), p, r)
            .await
            .unwrap();
        pool.release(id);
        assert_eq!(result, "3");
    }

    #[tokio::test]
    async fn pool_spawn_with_args() {
        let mut pool = IsolatePool::new(1, 4);
        let (id, tx) = pool.claim().unwrap();
        let (p, r) = test_pool_and_registry();
        let result = pool_execute(tx, "(a, b) => a * b".into(), "[6, 7]".into(), p, r)
            .await
            .unwrap();
        pool.release(id);
        assert_eq!(result, "42");
    }

    #[tokio::test]
    async fn pool_spawn_string_result() {
        let mut pool = IsolatePool::new(1, 4);
        let (id, tx) = pool.claim().unwrap();
        let (p, r) = test_pool_and_registry();
        let result = pool_execute(
            tx,
            "(name) => 'Hello, ' + name + '!'".into(),
            "[\"EkkoJS\"]".into(),
            p, r,
        )
        .await
        .unwrap();
        pool.release(id);
        assert_eq!(result, "\"Hello, EkkoJS!\"");
    }

    #[tokio::test]
    async fn pool_capacity_enforcement() {
        let mut pool = IsolatePool::new(1, 2);
        let (id1, _) = pool.claim().unwrap();
        let (id2, _) = pool.claim().unwrap();
        assert!(pool.claim().is_err());
        pool.release(id1);
        assert!(pool.claim().is_ok());
        pool.release(id2);
    }

    #[tokio::test]
    async fn pool_error_propagation() {
        let mut pool = IsolatePool::new(1, 4);
        let (id, tx) = pool.claim().unwrap();
        let (p, r) = test_pool_and_registry();
        let result = pool_execute(tx, "() => { throw new Error('boom'); }".into(), "[]".into(), p, r)
            .await;
        pool.release(id);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("boom"));
    }

    #[tokio::test]
    async fn pool_grows_on_demand() {
        let mut pool = IsolatePool::new(1, 8);
        assert_eq!(pool.worker_count(), 1);
        let (id1, _) = pool.claim().unwrap();
        let (id2, _) = pool.claim().unwrap();
        assert_eq!(pool.worker_count(), 2);
        pool.release(id1);
        pool.release(id2);
    }

    #[tokio::test]
    async fn pool_parallel_execution() {
        let mut pool = IsolatePool::new(2, 8);
        let (p, r) = test_pool_and_registry();

        let mut pending = Vec::new();
        for i in 0..4 {
            let (id, tx) = pool.claim().unwrap();
            let (respond_tx, respond_rx) = oneshot::channel();
            tx.send(WorkRequest {
                fn_source: format!("() => {{ return {}; }}", i),
                args_json: "[]".into(),
                respond: respond_tx,
                pool: p.clone(),
                registry: r.clone(),
                timeout_ms: None,
                heap_limit: None,
                parent_tracker: ChildTracker::new(),
                permissions: crate::ffi::ffi_runtime::PermissionSet::allow_all(),
            })
            .await
            .unwrap();
            pending.push((id, respond_rx));
        }

        assert!(
            pool.worker_count() >= 4,
            "pool should have 4+ workers for parallel dispatch, got {}",
            pool.worker_count()
        );

        let mut results = Vec::new();
        for (id, rx) in pending {
            results.push(rx.await.unwrap().unwrap());
            pool.release(id);
        }

        assert_eq!(results.len(), 4);
        for i in 0..4 {
            assert_eq!(results[i], format!("{}", i));
        }
    }

    #[tokio::test]
    async fn pool_worker_reuse() {
        let mut pool = IsolatePool::new(1, 4);
        let (p, r) = test_pool_and_registry();
        for i in 0..10 {
            let (id, tx) = pool.claim().unwrap();
            let result = pool_execute(tx, format!("() => {}", i), "[]".into(), p.clone(), r.clone())
                .await
                .unwrap();
            pool.release(id);
            assert_eq!(result, format!("{}", i));
        }
        assert_eq!(pool.worker_count(), 1);
    }

    #[test]
    fn pool_default_sizing() {
        let pool = IsolatePool::default_pool();
        assert!(pool.worker_count() >= 1);
        assert!(pool.worker_count() <= 4);
    }

    #[tokio::test]
    async fn pool_shrink_on_idle() {
        let mut pool = IsolatePool::new(4, 8);
        assert_eq!(pool.worker_count(), 4);
        pool.last_dispatch = Instant::now() - Duration::from_secs(IDLE_SHRINK_SECS + 1);
        let (id, tx) = pool.claim().unwrap();
        let (p, r) = test_pool_and_registry();
        let _ = pool_execute(tx, "() => 1".into(), "[]".into(), p, r).await.unwrap();
        pool.release(id);
        assert!(
            pool.worker_count() <= pool.min_size + 1,
            "pool should have shrunk to ~min_size, got {}",
            pool.worker_count()
        );
    }

    #[tokio::test]
    async fn pool_regrows_after_shrink() {
        let mut pool = IsolatePool::new(4, 8);
        pool.last_dispatch = Instant::now() - Duration::from_secs(IDLE_SHRINK_SECS + 1);
        let mut claims = Vec::new();
        for _ in 0..4 {
            claims.push(pool.claim().unwrap());
        }
        assert!(pool.worker_count() >= 4);
        for (id, _) in claims {
            pool.release(id);
        }
    }

    #[tokio::test]
    async fn worker_has_full_globals() {
        let mut pool = IsolatePool::new(1, 4);
        let (id, tx) = pool.claim().unwrap();
        let (p, r) = test_pool_and_registry();
        let result = pool_execute(
            tx,
            "() => typeof Ekko.version + '|' + typeof Ekko.sleep + '|' + typeof Ekko.Channel + '|' + typeof setTimeout + '|' + typeof performance.now".into(),
            "[]".into(),
            p, r,
        ).await.unwrap();
        pool.release(id);
        assert_eq!(result, "\"string|function|function|function|function\"");
    }

    #[tokio::test]
    async fn worker_sleep_works() {
        let mut pool = IsolatePool::new(1, 4);
        let (id, tx) = pool.claim().unwrap();
        let (p, r) = test_pool_and_registry();
        let (respond_tx, respond_rx) = oneshot::channel();
        tx.send(WorkRequest {
            fn_source: "async () => { await Ekko.sleep(5); return 'slept'; }".into(),
            args_json: "[]".into(),
            respond: respond_tx,
            pool: p,
            registry: r,
            timeout_ms: None,
            heap_limit: None,
            parent_tracker: ChildTracker::new(),
            permissions: crate::ffi::ffi_runtime::PermissionSet::allow_all(),
        }).await.unwrap();
        let result = respond_rx.await.unwrap().unwrap();
        pool.release(id);
        assert_eq!(result, "\"slept\"");
    }
}
