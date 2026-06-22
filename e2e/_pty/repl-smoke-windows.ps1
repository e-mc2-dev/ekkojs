# Windows REPL smoke for `ekko repl` (posix PTY harness can't run on Windows). Pipes scripted lines into
# the binary's stdin (rustyline falls back to line reads on a non-tty) and asserts the printed results.
# Usage: powershell -File e2e/_pty/repl-smoke-windows.ps1 [path\to\ekko.exe]
param([string]$Ekko = ".\_bin\ekko.exe")

$lines = @(
  "1+1", "const x = 41", "x + 1",
  "function add(a,b){ return a+b }", "add(2,3)",
  "await Promise.resolve(7)",
  "const n = await Promise.resolve(10)", "n * 2",
  "throw new Error('boom')", "2+2",
  "this is !@# bad", "5*5",
  "typeof (await import('ekko:fs'))",
  ".exit"
)
$input = ($lines -join "`n") + "`n"
$out = ($input | & $Ekko repl 2>&1 | Where-Object { $_ -notmatch 'integrity|expected:|actual:|path:' } | Out-String)

$checks = @(
  @{ n = "expr echo 1+1->2";              ok = ($out -match "(^|\n)2(\r?\n|$)") },
  @{ n = "state persists x+1->42";        ok = ($out -match "42") },
  @{ n = "function add(2,3)->5";          ok = ($out -match "(^|\n)5(\r?\n|$)") },
  @{ n = "top-level await->7";            ok = ($out -match "(^|\n)7(\r?\n|$)") },
  @{ n = "await+const persists n*2->20";  ok = ($out -match "20") },
  @{ n = "thrown Error printed (boom)";   ok = ($out -match "boom") },
  @{ n = "survives throw: 2+2->4";        ok = ($out -match "(^|\n)4(\r?\n|$)") },
  @{ n = "syntax error reported";         ok = ($out -match "SyntaxError") },
  @{ n = "survives syntax error: 5*5->25";ok = ($out -match "25") },
  @{ n = "dynamic import()->object";      ok = ($out -match "object") }
)
$pass = 0; $fail = 0
foreach ($c in $checks) {
  if ($c.ok) { $pass++; Write-Host "  PASS: $($c.n)" } else { $fail++; Write-Host "  FAIL: $($c.n)" }
}
Write-Host "`nPTY-REPL-WIN: $pass passed, $fail failed"
Write-Host ("PTY-REPL-WIN-DONE " + $(if ($fail -eq 0) { "PASS" } else { "FAIL" }))
if ($fail -ne 0) { exit 1 }
