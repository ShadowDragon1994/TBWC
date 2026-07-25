$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pidPath = Join-Path $projectRoot 'tmp\zaowutai-server.pid'
$port = if ($env:ZAOWUTAI_PORT) { [int]$env:ZAOWUTAI_PORT } else { 3001 }
$appUrl = "http://127.0.0.1:$port"

function Test-ZaowutaiReady {
  try {
    $response = Invoke-RestMethod -Uri "$appUrl/ready" -TimeoutSec 2
    return $response.status -eq 'ok' -and $response.application -eq 'zaowutai'
  } catch {
    return $false
  }
}

Write-Host "Address: $appUrl"
if (-not (Test-ZaowutaiReady)) {
  Write-Host 'Zaowutai is not running.'
  exit 0
}

if (Test-Path -LiteralPath $pidPath) {
  try {
    $metadata = Get-Content -LiteralPath $pidPath -Raw | ConvertFrom-Json
    $process = Get-Process -Id ([int]$metadata.pid) -ErrorAction SilentlyContinue
    if ($process -and $process.ProcessName -eq 'node' -and [int]$metadata.port -eq $port) {
      Write-Host "Zaowutai is running. PID: $($process.Id)"
      exit 0
    }
  } catch {}
}

Write-Host 'Zaowutai is running, but it was not started by this launcher.'
exit 0
