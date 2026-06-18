// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

use std::path::{Path, PathBuf};
use anyhow::Context;

pub struct NativeRuntime {
    _lib: libloading::Library,
    version_fn: unsafe extern "C" fn() -> *mut std::ffi::c_char,
    free_string_fn: unsafe extern "C" fn(*mut std::ffi::c_char),
}

impl std::fmt::Debug for NativeRuntime {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("NativeRuntime").finish_non_exhaustive()
    }
}

impl NativeRuntime {

    pub fn load(search_dir: Option<&Path>) -> anyhow::Result<Self> {
        let lib_path = Self::find_library(search_dir)?;
        let lib = unsafe {
            libloading::Library::new(&lib_path)
                .with_context(|| format!("failed to load native library: {}", lib_path.display()))?
        };

        let (version_fn, free_string_fn) = unsafe {
            let vf: libloading::Symbol<unsafe extern "C" fn() -> *mut std::ffi::c_char> =
                lib.get(b"ekko_native_version")
                    .context("symbol ekko_native_version not found")?;
            let ff: libloading::Symbol<unsafe extern "C" fn(*mut std::ffi::c_char)> =
                lib.get(b"ekko_native_free_string")
                    .context("symbol ekko_native_free_string not found")?;
            (*vf, *ff)
        };

        Ok(Self { _lib: lib, version_fn, free_string_fn })
    }

    pub fn version(&self) -> String {
        unsafe {
            let ptr = (self.version_fn)();
            let s = std::ffi::CStr::from_ptr(ptr).to_string_lossy().to_string();
            (self.free_string_fn)(ptr);
            s
        }
    }

    fn find_library(search_dir: Option<&Path>) -> anyhow::Result<PathBuf> {
        let name = Self::lib_filename();

        if let Some(dir) = search_dir {
            let path = dir.join(&name);
            if path.exists() {
                return Ok(path);
            }
        }

        if let Ok(exe) = std::env::current_exe() {
            if let Some(dir) = exe.parent() {
                let path = dir.join(&name);
                if path.exists() {
                    return Ok(path);
                }
            }
        }

        let path = PathBuf::from(&name);
        if path.exists() {
            return Ok(path);
        }

        anyhow::bail!(
            "native library '{}' not found. Build with: cd dotnet/EkkoNative && dotnet publish -c Release -p:PublishAot=true",
            name
        )
    }

    fn lib_filename() -> String {
        if cfg!(target_os = "windows") {
            "EkkoNative.dll".to_string()
        } else if cfg!(target_os = "macos") {
            "EkkoNative.dylib".to_string()
        } else {
            "EkkoNative.so".to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lib_filename_has_ekko() {
        let name = NativeRuntime::lib_filename();
        assert!(name.contains("EkkoNative"));
    }

    #[test]
    fn load_missing_lib_gives_clear_error() {
        let err = NativeRuntime::load(Some(Path::new("/nonexistent"))).unwrap_err();
        let msg = format!("{}", err);
        assert!(msg.contains("not found"), "error was: {}", msg);
    }
}
