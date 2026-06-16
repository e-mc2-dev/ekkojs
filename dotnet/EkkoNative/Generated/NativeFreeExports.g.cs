// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

using System.Runtime.InteropServices;

public static class NativeFreeExports
{
    [UnmanagedCallersOnly(EntryPoint = "ekko_native_free_string")]
    public static void FreeString(NativeString s) => s.Free();

    [UnmanagedCallersOnly(EntryPoint = "ekko_native_free_buffer")]
    public static void FreeBuffer(NativeBuffer b) => b.Free();
}
