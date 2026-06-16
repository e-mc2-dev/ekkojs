// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

console.log("log:", "hello", 42, true);
console.error("error:", "stderr");
console.warn("warn:", "stderr");
console.debug("debug:", "output");
console.table([{name:"Alice",age:30},{name:"Bob",age:25}]);
console.table({host:"localhost",port:8080});
console.table([1,2,3]);
console.log("\nALL PASS — console methods work");
