$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot 'tmp'
$dataDir = Join-Path $projectRoot 'data'
$logPath = Join-Path $runtimeDir 'zaowutai-server.log'
$errorLogPath = Join-Path $runtimeDir 'zaowutai-server-error.log'
$pidPath = Join-Path $runtimeDir 'zaowutai-server.pid'
$appUrl = 'http://127.0.0.1:3001'

function Test-ZaowutaiReady {
  try {
    $response = Invoke-RestMethod -Uri "$appUrl/ready" -TimeoutSec 2
    return $response.status -eq 'ok'
  } catch {
    return $false
  }
}

function Open-ZaowutaiInEdge {
  $edgeCandidates = @()
  if (${env:ProgramFiles(x86)}) { $edgeCandidates += Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe' }
  if ($env:ProgramFiles) { $edgeCandidates += Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe' }
  if ($env:LOCALAPPDATA) { $edgeCandidates += Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe' }
  $edge = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($edge) { Start-Process -FilePath $edge -ArgumentList @('--new-window', $appUrl); return }
  Start-Process $appUrl
}

try {
  Set-Location -LiteralPath $projectRoot
  if (Test-ZaowutaiReady) {
    Open-ZaowutaiInEdge
    exit 0
  }

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
  $env:DATA_DIR = $dataDir
  $env:FRONTEND_DIR = Join-Path $projectRoot 'dist'
  $env:BACKUP_DIR = Join-Path $dataDir 'backups'
  $process = Start-Process -FilePath $nodePath -ArgumentList @($tsxCli, 'server/index.ts') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $logPath -RedirectStandardError $errorLogPath -PassThru
  @{ pid = $process.Id; projectRoot = $projectRoot; startedAt = $process.StartTime.ToUniversalTime().ToString('o') } |
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
