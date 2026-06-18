# Windows error-legibility smoke (Tech-Preview B6). Mirrors _build/remote/28-error-legibility.sh: common
# user mistakes must yield a clear message and NEVER a Rust panic/backtrace.
# Usage: powershell -File e2e/_cli/error-legibility-windows.ps1 [path\to\ekko.exe]
param([string]$Ekko = ".\_bin\ekko.exe")
$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0
$panic = 'panicked|stack backtrace|RUST_BACKTRACE|note: run with'

$d = Join-Path $env:TEMP ("ekko-b6-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $d | Out-Null
Set-Content -Encoding utf8 (Join-Path $d "syntax.ts") "const x: number = ;`n@#`$ bad"
Set-Content -Encoding utf8 (Join-Path $d "perm.ts") 'import { readText } from "ekko:fs"; readText("C:/Windows/win.ini");'
Set-Content -Encoding utf8 (Join-Path $d "throw.ts") 'throw new Error("user boom");'
Set-Content -Encoding utf8 (Join-Path $d "badmod.ts") 'import x from "ekko:doesnotexist";'
Set-Content -Encoding utf8 (Join-Path $d "referr.ts") 'console.log(undefinedVariable);'

function ECase($name, $want, [scriptblock]$run) {
  $out = ((& $run) 2>&1 | Out-String)
  $clean = -not ($out -match $panic)
  $hit = ($out -match [regex]::Escape($want))
  if ($clean -and $hit) {
    $script:pass++; Write-Host "  PASS: $name"
  } else {
    $script:fail++; Write-Host "  FAIL: $name (clean=$clean hit=$hit)"
    ($out -split "`n" | Select-Object -Last 4) | ForEach-Object { Write-Host "    | $_" }
  }
}

ECase "missing file"          "file not found"     { & $Ekko run (Join-Path $d "NOPE.ts") }
ECase "syntax error"          "Syntax"             { & $Ekko run (Join-Path $d "syntax.ts") }
ECase "permission denied"     "PermissionError"    { & $Ekko run (Join-Path $d "perm.ts") }
ECase "user throw"            "user boom"          { & $Ekko run (Join-Path $d "throw.ts") }
ECase "unknown module"        "ekko:doesnotexist"  { & $Ekko run (Join-Path $d "badmod.ts") }
ECase "reference error"       "ReferenceError"     { & $Ekko run (Join-Path $d "referr.ts") }
ECase "eval bad syntax"       "SyntaxError"        { & $Ekko eval "@#`$ bad" }
ECase "unknown --allow warns" "unknown permission" { & $Ekko run --allow=filesystem (Join-Path $d "throw.ts") }

Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue
Write-Host "`nERRLEGIB-WIN: $pass passed, $fail failed"
Write-Host ("ERRLEGIB-WIN-DONE " + $(if ($fail -eq 0) { "PASS" } else { "FAIL" }))
if ($fail -ne 0) { exit 1 }
