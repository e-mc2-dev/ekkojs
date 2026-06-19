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
use std::sync::Arc;
use tokio::sync::{mpsc, Notify};

pub struct AsyncCompletion {
    pub id: u32,
    pub result: Result<String, String>,
}

pub struct SpawnMeta {
    pub resolver: v8::Global<v8::PromiseResolver>,
    pub parent_stack: Option<String>,
}

pub struct AsyncState {
    pub rx: mpsc::Receiver<AsyncCompletion>,
    tx: mpsc::Sender<AsyncCompletion>,
    pub notify: Arc<Notify>,
    pub pending_promises: HashMap<u32, SpawnMeta>,
    next_id: u32,
}

impl AsyncState {
    
    pub fn new() -> Rc<RefCell<Self>> {
        let (tx, rx) = mpsc::channel(256);
        Rc::new(RefCell::new(Self {
            rx,
            tx,
            notify: Arc::new(Notify::new()),
            pending_promises: HashMap::new(),
            next_id: 1,
        }))
    }

    
    pub fn register(
        &mut self,
        resolver: v8::Global<v8::PromiseResolver>,
        parent_stack: Option<String>,
    ) -> (u32, mpsc::Sender<AsyncCompletion>, Arc<Notify>) {
        let id = self.next_id;
        self.next_id += 1;
        self.pending_promises.insert(id, SpawnMeta {
            resolver,
            parent_stack,
        });
        (id, self.tx.clone(), self.notify.clone())
    }

    pub fn has_pending(&self) -> bool {
        !self.pending_promises.is_empty()
    }
}
