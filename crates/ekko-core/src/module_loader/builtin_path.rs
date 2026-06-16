// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



pub(super) fn path_module_eval<'a>(
    context: v8::Local<'a, v8::Context>,
    module: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Value>> {
    let scope = &mut unsafe { v8::CallbackScope::new(context) };

    set_export_fn!(scope, module, "join", path_join);
    set_export_fn!(scope, module, "resolve", path_resolve);
    set_export_fn!(scope, module, "dirname", path_dirname);
    set_export_fn!(scope, module, "basename", path_basename);
    set_export_fn!(scope, module, "extname", path_extname);
    set_export_fn!(scope, module, "isAbsolute", path_is_absolute);
    set_export_fn!(scope, module, "normalize", path_normalize);

    let key = v8::String::new(scope, "sep").unwrap();
    let val = v8::String::new(scope, std::path::MAIN_SEPARATOR_STR).unwrap();
    let _ = module.set_synthetic_module_export(scope, key, val.into());

    Some(v8::undefined(scope).into())
}

fn vurl_split(s: &str) -> Option<(&str, &str)> {
    s.find(":///").map(|i| (&s[..i + 4], &s[i + 4..]))
}

fn vurl_join(base: &str, seg: &str) -> String {
    let (scheme, body) = match vurl_split(base) { Some(x) => x, None => return base.to_string() };
    let mut parts: Vec<String> = body.split('/').filter(|p| !p.is_empty()).map(|s| s.to_string()).collect();
    for s in seg.replace('\\', "/").split('/') {
        match s { "" | "." => {} ".." => { parts.pop(); } other => parts.push(other.to_string()) }
    }
    format!("{}{}", scheme, parts.join("/"))
}

fn path_join(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let segs: Vec<String> = (0..args.length()).map(|i| args.get(i).to_rust_string_lossy(scope)).collect();
    if segs.first().map_or(false, |s| s.contains("://")) {
        let mut acc = segs[0].clone();
        for s in &segs[1..] { acc = vurl_join(&acc, s); }
        rv.set(v8::String::new(scope, &acc).unwrap_or_else(|| v8::String::empty(scope)).into());
        return;
    }
    let mut result = std::path::PathBuf::new();
    for s in &segs { result.push(s); }
    rv.set(v8::String::new(scope, &result.to_string_lossy()).unwrap().into());
}

fn path_resolve(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let mut base = crate::engine::v8_runtime::app_root()
        .and_then(|r| r.virtual_root.clone())
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default().to_string_lossy().to_string());
    for i in 0..args.length() {
        let seg = args.get(i).to_rust_string_lossy(scope);
        if seg.is_empty() { continue; }
        if seg.contains("://") { base = seg; continue; }
        if std::path::Path::new(&seg).is_absolute() {
            base = std::path::Path::new(&seg).to_string_lossy().to_string();
            continue;
        }
        if base.contains("://") {
            base = vurl_join(&base, &seg);
        } else {
            base = std::path::Path::new(&base).join(&seg).to_string_lossy().to_string();
        }
    }
    #[cfg(windows)]
    if base.starts_with("\\\\?\\") {
        base = base[4..].to_string();
    }
    rv.set(v8::String::new(scope, &base).unwrap_or_else(|| v8::String::empty(scope)).into());
}

fn dirname_str(input: &str) -> String {
    match std::path::Path::new(input).parent() {
        Some(parent) => {
            let s = parent.to_string_lossy().to_string();
            if s.is_empty() { ".".to_string() } else { s }
        }
        None => ".".to_string(),
    }
}

fn path_dirname(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let input = args.get(0).to_rust_string_lossy(scope);
    rv.set(v8::String::new(scope, &dirname_str(&input)).unwrap().into());
}

fn path_basename(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let input = args.get(0).to_rust_string_lossy(scope);
    let p = std::path::Path::new(&input);
    let name = p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    let result = if args.length() > 1 && args.get(1).is_string() {
        let ext = args.get(1).to_rust_string_lossy(scope);
        name.strip_suffix(&ext).unwrap_or(&name).to_string()
    } else {
        name
    };
    rv.set(v8::String::new(scope, &result).unwrap_or_else(|| v8::String::empty(scope)).into());
}

fn path_extname(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let input = args.get(0).to_rust_string_lossy(scope);
    let p = std::path::Path::new(&input);
    let ext = p.extension()
        .map(|e| format!(".{}", e.to_string_lossy()))
        .unwrap_or_default();
    rv.set(v8::String::new(scope, &ext).unwrap_or_else(|| v8::String::empty(scope)).into());
}

fn path_is_absolute(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let input = args.get(0).to_rust_string_lossy(scope);
    rv.set(v8::Boolean::new(scope, std::path::Path::new(&input).is_absolute()).into());
}

fn normalize_str(input: &str) -> String {
    use std::path::Component;
    let mut components: Vec<Component> = Vec::new();
    for c in std::path::Path::new(input).components() {
        match c {
            Component::CurDir => {}
            Component::ParentDir => match components.last() {
                Some(Component::Normal(_)) => { components.pop(); }
                
                Some(Component::RootDir) | Some(Component::Prefix(_)) => {}
                
                _ => components.push(Component::ParentDir),
            },
            other => components.push(other),
        }
    }
    components.iter().collect::<std::path::PathBuf>().to_string_lossy().to_string()
}

fn path_normalize(scope: &mut v8::HandleScope, args: v8::FunctionCallbackArguments, mut rv: v8::ReturnValue) {
    let input = args.get(0).to_rust_string_lossy(scope);
    rv.set(v8::String::new(scope, &normalize_str(&input)).unwrap().into());
}

#[cfg(test)]
mod tests {
    use super::{dirname_str, normalize_str};

    
    #[test]
    fn fuzz_path_normalize_no_panic_idempotent() {
        crate::fuzz_support::run_fuzz("path", |s| {
            let n = normalize_str(s);
            let n2 = normalize_str(&n);
            assert_eq!(n, n2, "normalize_str not idempotent for input {:?}", s);
        });
    }

    #[test]
    fn dirname_maps_empty_parent_to_dot() {
        assert_eq!(dirname_str("a"), ".");          
        assert_eq!(dirname_str(""), ".");
        assert_eq!(dirname_str("a/b"), "a");
        assert_eq!(dirname_str("/a/b/c.txt"), "/a/b");
        assert_eq!(dirname_str("/"), ".");
    }

    #[test]
    fn normalize_preserves_leading_dotdot_and_clamps_root() {
        assert_eq!(normalize_str("a/b/../c/./d"), "a/c/d");
        assert_eq!(normalize_str("a/b/.."), "a");
        assert_eq!(normalize_str("./a"), "a");
        assert_eq!(normalize_str(""), "");
        assert_eq!(normalize_str("../a"), "../a");       
        assert_eq!(normalize_str("../../x"), "../../x"); 
        assert_eq!(normalize_str("/a/../../b"), "/b");   
        assert_eq!(normalize_str("a/b/c/../.."), "a");
    }
}

#[cfg(test)]
mod virtual_url_tests {
    use super::{vurl_split, vurl_join};
    #[test]
    fn splits_scheme_and_body() {
        assert_eq!(vurl_split("ekl:///@ekkojs/smtp-dev"), Some(("ekl:///", "@ekkojs/smtp-dev")));
        assert_eq!(vurl_split("store:///pkg/a"), Some(("store:///", "pkg/a")));
        assert_eq!(vurl_split("/real/path"), None);
        assert_eq!(vurl_split("./rel"), None);
    }
    #[test]
    fn joins_member_keeping_scheme() {
        assert_eq!(vurl_join("ekl:///@pkg", "./x"), "ekl:///@pkg/x");
        assert_eq!(vurl_join("ekl:///@pkg/dir", "../y"), "ekl:///@pkg/y");
        assert_eq!(vurl_join("ekl:///@pkg/a/b", "../../c"), "ekl:///@pkg/c");
        assert_eq!(vurl_join("store:///p", "sub/f.js"), "store:///p/sub/f.js");

        assert_eq!(vurl_join("ekl:///@pkg", "../../../../etc/passwd"), "ekl:///etc/passwd");
        assert_eq!(vurl_join("store:///p/v", "../../../../../../x"), "store:///x");
    }
}
