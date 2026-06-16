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
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;

static NEXT_ID: AtomicU32 = AtomicU32::new(1);

#[derive(Clone)]
pub struct ChannelHandle {
    pub tx: mpsc::Sender<String>,
    pub rx: Arc<Mutex<mpsc::Receiver<String>>>,
    pub closed: Arc<AtomicBool>,
    pub capacity: usize,
}

pub struct ChannelRegistry {
    channels: HashMap<u32, ChannelHandle>,
}

impl ChannelRegistry {
    
    pub fn new() -> Arc<Mutex<Self>> {
        Arc::new(Mutex::new(Self {
            channels: HashMap::new(),
        }))
    }

    pub fn create(&mut self, capacity: usize) -> u32 {
        let id = NEXT_ID.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = mpsc::channel(capacity);
        self.channels.insert(
            id,
            ChannelHandle {
                tx,
                rx: Arc::new(Mutex::new(rx)),
                closed: Arc::new(AtomicBool::new(false)),
                capacity,
            },
        );
        id
    }

    pub fn get(&self, id: u32) -> Option<ChannelHandle> {
        self.channels.get(&id).cloned()
    }

    pub fn close(&self, id: u32) {
        if let Some(ch) = self.channels.get(&id) {
            ch.closed.store(true, Ordering::SeqCst);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn create_and_send_recv() {
        let reg = ChannelRegistry::new();
        let id = reg.lock().unwrap().create(4);
        let ch = reg.lock().unwrap().get(id).unwrap();
        ch.tx.send("hello".into()).await.unwrap();
        let msg = ch.rx.lock().unwrap().try_recv().unwrap();
        assert_eq!(msg, "hello");
    }

    #[tokio::test]
    async fn backpressure() {
        let reg = ChannelRegistry::new();
        let id = reg.lock().unwrap().create(2);
        let ch = reg.lock().unwrap().get(id).unwrap();
        ch.tx.send("1".into()).await.unwrap();
        ch.tx.send("2".into()).await.unwrap();
        assert!(ch.tx.try_send("3".into()).is_err());
        let _ = ch.rx.lock().unwrap().try_recv();
        assert!(ch.tx.try_send("3".into()).is_ok());
    }

    #[tokio::test]
    async fn close_semantics() {
        let reg = ChannelRegistry::new();
        let id = reg.lock().unwrap().create(4);
        let ch = reg.lock().unwrap().get(id).unwrap();
        ch.tx.send("buffered".into()).await.unwrap();
        reg.lock().unwrap().close(id);
        assert!(ch.closed.load(Ordering::SeqCst));
        let msg = ch.rx.lock().unwrap().try_recv().unwrap();
        assert_eq!(msg, "buffered");
    }

    #[tokio::test]
    async fn cross_thread() {
        let reg = ChannelRegistry::new();
        let id = reg.lock().unwrap().create(8);
        let ch = reg.lock().unwrap().get(id).unwrap();
        let tx = ch.tx.clone();

        tokio::task::spawn_blocking(move || {
            for i in 0..3 {
                tx.blocking_send(format!("{}", i)).unwrap();
            }
        })
        .await
        .unwrap();

        let rx = ch.rx.clone();
        for expected in ["0", "1", "2"] {
            let msg = rx.lock().unwrap().try_recv().unwrap();
            assert_eq!(msg, expected);
        }
    }
}
