// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



use crate::module_loader;

pub fn mock_module(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let spec = args.get(0).to_rust_string_lossy(scope);
    let obj = match v8::Local::<v8::Object>::try_from(args.get(1)) {
        Ok(o) => o,
        Err(_) => {
            let m = v8::String::new(scope, "mock.module: exports must be an object").unwrap();
            scope.throw_exception(m.into());
            return;
        }
    };
    let key = module_loader::register_mock_module(scope, spec, obj);
    if let Some(s) = v8::String::new(scope, &key) {
        rv.set(s.into());
    }
}

pub fn unmock_module(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut _rv: v8::ReturnValue,
) {
    let key = args.get(0).to_rust_string_lossy(scope);
    module_loader::unregister_mock_module(&key);
}
