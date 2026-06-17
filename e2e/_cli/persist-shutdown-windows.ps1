# Windows persistence + clean-shutdown smoke (Tech-Preview B5). Mirrors _build/remote/29-persist-shutdown.sh:
# fs+db values survive a separate process, and server stop releases the port.
# Usage: powershell -File e2e/_cli/persist-shutdown-windows.ps1 [path\to\ekko.exe]
param([string]$Ekko = ".\_bin\ekko.exe")
$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0
$d = Join-Path $env:TEMP ("ekko-b5-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $d | Out-Null
$dj = ($d -replace '\\','/')

function OK($name, $out, $want) {
  if ($out -match [regex]::Escape($want)) { $script:pass++; Write-Host "  PASS: $name" }
  else { $script:fail++; Write-Host "  FAIL: $name"; ($out -split "`n" | Select-Object -Last 4) | ForEach-Object { Write-Host "    | $_" } }
}

Set-Content -Encoding utf8 (Join-Path $d "writer.ts") @"
import { writeText } from "ekko:fs";
import { Database } from "ekko:db";
writeText("$dj/data.txt", "persist-v1");
const db = new Database("$dj/data.db");
db.exec("CREATE TABLE IF NOT EXISTS kv (k TEXT, v TEXT)");
db.exec("DELETE FROM kv");
db.prepare("INSERT INTO kv VALUES (@k,@v)").exec({ k: "greeting", v: "hello-persist" });
db.close();
console.log("WROTE");
"@
Set-Content -Encoding utf8 (Join-Path $d "reader.ts") @"
import { readText } from "ekko:fs";
import { Database } from "ekko:db";
console.log("FILE:", readText("$dj/data.txt"));
const db = new Database("$dj/data.db");
console.log("DB:", db.query("SELECT v FROM kv WHERE k='greeting'").rows[0][0]);
db.close();
"@
Set-Content -Encoding utf8 (Join-Path $d "rebind.ts") @'
import { createServer, fetch } from "ekko:web";
for (let i = 0; i < 2; i++) {
  const app: any = createServer({ host: "127.0.0.1", port: 8151 });
  app.get("/", (_q: any, res: any) => res.text("ok" + i));
  app.start();
  const r: any = await fetch("http://127.0.0.1:8151/");
  console.log("ITER", i, await r.text());
  app.stop();
}
console.log("REBIND-OK");
'@

$w = (& $Ekko run --allow=fs (Join-Path $d "writer.ts") 2>&1 | Out-String); OK "writer process wrote fs+db" $w "WROTE"
$r = (& $Ekko run --allow=fs (Join-Path $d "reader.ts") 2>&1 | Out-String)
OK "fs value survived restart" $r "FILE: persist-v1"
OK "db value survived restart" $r "DB: hello-persist"
$rb = (& $Ekko run --allow=net (Join-Path $d "rebind.ts") 2>&1 | Out-String); OK "server stop releases port (rebind)" $rb "REBIND-OK"

Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue
Write-Host "`nPERSIST-WIN: $pass passed, $fail failed"
Write-Host ("PERSIST-WIN-DONE " + $(if ($fail -eq 0) { "PASS" } else { "FAIL" }))
if ($fail -ne 0) { exit 1 }
