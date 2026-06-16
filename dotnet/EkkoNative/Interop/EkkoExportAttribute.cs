// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

using System;

[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public class EkkoExportAttribute : Attribute
{
    public string Name { get; }
    public EkkoExportAttribute(string name) { Name = name; }
}
