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
using System.Collections.Concurrent;
using System.Threading;

public static class HandleTable
{
    private static int _nextId = 0;
    private static readonly ConcurrentDictionary<int, object> _handles = new();

    public static int Register(object obj)
    {
        int id = Interlocked.Increment(ref _nextId);
        _handles[id] = obj;
        return id;
    }

    public static T Get<T>(int id) where T : class
    {
        if (!_handles.TryGetValue(id, out var obj))
            throw new InvalidOperationException($"invalid handle: {id}");
        if (obj is not T typed)
            throw new InvalidOperationException($"handle {id}: expected {typeof(T).Name}, got {obj.GetType().Name}");
        return typed;
    }

    public static void Release(int id)
    {
        if (_handles.TryRemove(id, out var obj))
        {
            if (obj is IDisposable d) d.Dispose();
        }
    }

    public static bool Exists(int id) => _handles.ContainsKey(id);
}
