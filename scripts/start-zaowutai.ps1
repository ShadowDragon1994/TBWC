$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot 'tmp'
$dataDir = Join-Path $projectRoot 'data'
$logPath = Join-Path $runtimeDir 'zaowutai-server.log'
$errorLogPath = Join-Path $runtimeDir 'zaowutai-server-error.log'
$pidPath = Join-Path $runtimeDir 'zaowutai-server.pid'
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

function Open-ZaowutaiInEdge {
  if ($env:ZAOWUTAI_NO_BROWSER -eq '1') { return }
  $edgeCandidates = @()
  if (${env:ProgramFiles(x86)}) { $edgeCandidates += Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe' }
  if ($env:ProgramFiles) { $edgeCandidates += Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe' }
  if ($env:LOCALAPPDATA) { $edgeCandidates += Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe' }
  $edge = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($edge) { Start-Process -FilePath $edge -ArgumentList @('--new-window', $appUrl); return }
  Start-Process $appUrl
}

function Test-PortInUse {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $result = $client.BeginConnect('127.0.0.1', $port, $null, $null)
    return $result.AsyncWaitHandle.WaitOne(300) -and $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

try {
  Set-Location -LiteralPath $projectRoot
  if (Test-ZaowutaiReady) {
    Open-ZaowutaiInEdge
    exit 0
  }
  if (Test-Path -LiteralPath $pidPath) {
    $metadata = Get-Content -LiteralPath $pidPath -Raw | ConvertFrom-Json
    $savedProcess = Get-Process -Id ([int]$metadata.pid) -ErrorAction SilentlyContinue
    if ($savedProcess) { throw "The saved Zaowutai process is running but not ready. Check: $errorLogPath" }
    Remove-Item -LiteralPath $pidPath -Force
  }
  if (Test-PortInUse) { throw "Port $port is already used by another application. Zaowutai was not started." }

  if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) {
    Write-Host 'First run: installing local dependencies...'
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
  }

  Write-Host 'Building Zaowutai...'
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }

  New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
  New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
  $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
  $tsxCli = Join-Path $projectRoot 'node_modules\tsx\dist\cli.mjs'
  if (-not (Test-Path -LiteralPath $tsxCli)) { throw 'Local tsx launcher is missing.' }

  $env:NODE_ENV = 'production'
  $env:PORT = [string]$port
  $env:DATA_DIR = $dataDir
  $env:FRONTEND_DIR = Join-Path $projectRoot 'dist'
  $env:BACKUP_DIR = Join-Path $dataDir 'backups'
  if (-not $env:SOURCING_1688_MODE) { $env:SOURCING_1688_MODE = 'rpa' }
  $process = Start-Process -FilePath $nodePath -ArgumentList @($tsxCli, 'server/index.ts') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $logPath -RedirectStandardError $errorLogPath -PassThru
  @{ pid = $process.Id; port = $port; projectRoot = $projectRoot; startedAt = $process.StartTime.ToUniversalTime().ToString('o') } |
    ConvertTo-Json -Compress |
    Set-Content -LiteralPath $pidPath -Encoding ascii

  $ready = $false
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    Start-Sleep -Milliseconds 500
    if (Test-ZaowutaiReady) { $ready = $true; break }
    if ($process.HasExited) { break }
  }
  if (-not $ready) {
    if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
    throw "Zaowutai failed to start. Check the log: $errorLogPath"
  }

  Open-ZaowutaiInEdge
  Write-Host 'Zaowutai is ready. Opening Microsoft Edge.'
  exit 0
} catch {
  Write-Error $_
  exit 1
}
