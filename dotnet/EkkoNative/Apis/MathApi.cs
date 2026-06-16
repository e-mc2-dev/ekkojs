// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

using System.Threading.Tasks;

public static class MathApi
{
    [EkkoExport("math.add")]
    public static int Add(int a, int b) => a + b;

    [EkkoExport("math.multiply")]
    public static long Multiply(long a, long b) => a * b;

    [EkkoExport("math.divide")]
    public static double Divide(double a, double b) => a / b;

    [EkkoExport("math.greet")]
    public static string Greet(string name) => "Hello, " + name + "!";

    [EkkoExport("math.slowAdd")]
    public static async Task<long> SlowAdd(long a, long b)
    {
        await Task.Delay(1);
        return a + b;
    }
}
