// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { add, multiply, PI } from "@test/math";
import { factorial, fibonacci } from "@test/math/advanced";

const r1 = add(2, 3);
const r2 = multiply(4, 5);
const r3 = factorial(5);
const r4 = fibonacci(10);

console.log(`add(2,3) = ${r1}`);
console.log(`multiply(4,5) = ${r2}`);
console.log(`PI = ${PI}`);
console.log(`factorial(5) = ${r3}`);
console.log(`fibonacci(10) = ${r4}`);

if (r1 !== 5) throw new Error(`add failed: ${r1}`);
if (r2 !== 20) throw new Error(`multiply failed: ${r2}`);
if (r3 !== 120) throw new Error(`factorial failed: ${r3}`);
if (r4 !== 55) throw new Error(`fibonacci failed: ${r4}`);

console.log("ALL WORKSPACE IMPORTS PASS");
