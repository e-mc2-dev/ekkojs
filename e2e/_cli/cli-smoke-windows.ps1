# Windows CLI smoke for the Tech-Preview gate (B1/B3.1). Mirrors _build/remote/27-cli-smoke.sh: --version,
# --help, the init->run onboarding path, eval/run/check/test happy paths, and every subcommand's --help.
# Usage: powershell -File e2e/_cli/cli-smoke-windows.ps1 [path\to\ekko.exe]
param([string]$Ekko = ".\_bin\ekko.exe")
$ErrorActionPreference = "Continue"
$repo = (Resolve-Path ".").Path
$pass = 0; $fail = 0

function Scrub($t) { ($t -split "`n" | Where-Object { $_ -notmatch 'integrity check|expected:|actual:|path:|EkkoNative' }) -join "`n" }
function Chk($name, $want, [scriptblock]$run) {
  $out = Scrub((& $run) 2>&1 | Out-String)
  $ok = ($LASTEXITCODE -eq 0) -and ([string]::IsNullOrEmpty($want) -or ($out -match [regex]::Escape($want)))
  if ($ok) { $script:pass++; Write-Host "  PASS: $name" }
  else { $script:fail++; Write-Host "  FAIL: $name (rc=$LASTEXITCODE)"; ($out -split "`n" | Select-Object -Last 4) | ForEach-Object { Write-Host "    | $_" } }
}

Chk "ekko --version"         ""      { & $Ekko --version }
Chk "ekko --help lists run"  "run"   { & $Ekko --help }
Chk "ekko --help lists init" "init"  { & $Ekko --help }
Chk "ekko --help lists repl" "repl"  { & $Ekko --help }

$work = Join-Path $env:TEMP ("ekko-smoke-" + [System.Guid]::NewGuid().ToString("N"))
Chk "ekko init scaffolds"    "create" { & $Ekko init $work --name smoke-app }
$runOut = Scrub((& $Ekko run (Join-Path $work "main.ts")) 2>&1 | Out-String)
if ($runOut -match "Hello from EkkoJS!") { $pass++; Write-Host "  PASS: ekko init -> run main.ts" } else { $fail++; Write-Host "  FAIL: ekko init -> run main.ts" }
Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue

Chk "ekko eval"              "42"                { & $Ekko eval "6*7" }
Chk "ekko run example"       "Hello from EkkoJS" { & $Ekko run (Join-Path $repo "examples\01-hello.ts") }
Chk "ekko check"             ""                  { & $Ekko check (Join-Path $repo "examples\01-hello.ts") }

foreach ($cmd in @("run","eval","repl","test","build","pack","add","remove","publish","update","vendor","audit","login","search","list","check","dev","init","gui","tui","ekl")) {
  Chk "ekko $cmd --help" $cmd ([scriptblock]::Create("& `"$Ekko`" $cmd --help"))
}
# `x` is a passthrough exec command: --help is forwarded, so usage + a tip is printed (rc nonzero by design).
$xout = Scrub((& $Ekko x --help 2>&1) | Out-String)
if ($xout -match "(?i)usage:|pass '--help' as a value") {
  $pass++; Write-Host "  PASS: ekko x --help (passthrough usage shown)"
} else {
  $fail++; Write-Host "  FAIL: ekko x --help"
}

Write-Host "`nCLI-SMOKE-WIN: $pass passed, $fail failed"
Write-Host ("CLI-SMOKE-WIN-DONE " + $(if ($fail -eq 0) { "PASS" } else { "FAIL" }))
if ($fail -ne 0) { exit 1 }
