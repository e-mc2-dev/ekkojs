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
use std::sync::{Arc, Mutex, LazyLock};
use std::sync::atomic::{AtomicI64, Ordering};
use tokio::sync::{mpsc, Notify};

pub struct ServerRequest {
    pub json: String,
    pub response_handle: i64,
}

pub struct BridgeSender {
    tx: mpsc::Sender<ServerRequest>,
    notify: Arc<Notify>,
}

pub struct BridgeReceiver {
    pub rx: mpsc::Receiver<ServerRequest>,
    pub notify: Arc<Notify>,
}

static BRIDGE_REGISTRY: LazyLock<Mutex<HashMap<i64, Arc<BridgeSender>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static NEXT_BRIDGE_ID: AtomicI64 = AtomicI64::new(1);

pub fn register_sender(sender: Arc<BridgeSender>) -> i64 {
    let id = NEXT_BRIDGE_ID.fetch_add(1, Ordering::Relaxed);
    if id == i64::MAX {
        NEXT_BRIDGE_ID.store(1, Ordering::Relaxed);
    }
    BRIDGE_REGISTRY.lock().unwrap().insert(id, sender);
    id
}

pub fn unregister_sender(id: i64) {
    BRIDGE_REGISTRY.lock().unwrap().remove(&id);
}

pub fn create_bridge() -> (Arc<BridgeSender>, BridgeReceiver) {
    let (tx, rx) = mpsc::channel(1024);
    let notify = Arc::new(Notify::new());
    (
        Arc::new(BridgeSender { tx, notify: notify.clone() }),
        BridgeReceiver { rx, notify },
    )
}

use crate::ffi::generated::web_api::NativeString;

pub extern "C" fn on_server_request(
    request_json: NativeString,
    response_handle: i64,
    context: i64,
) {
    let sender = match BRIDGE_REGISTRY.lock().unwrap().get(&context).cloned() {
        Some(s) => s,
        None => {
            eprintln!("[security] callback_bridge: invalid context id {}, dropping request", context);
            return;
        }
    };

    let json = request_json.to_string_lossy();
    let _ = sender.tx.blocking_send(ServerRequest { json, response_handle });
    sender.notify.notify_one();
}
