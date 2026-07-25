$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pidPath = Join-Path $projectRoot 'tmp\zaowutai-server.pid'

try {
  if (-not (Test-Path -LiteralPath $pidPath)) {
    Write-Host 'Zaowutai is not running from the local launcher.'
    exit 0
  }
  $metadata = Get-Content -LiteralPath $pidPath -Raw | ConvertFrom-Json
  $serverPid = [int]$metadata.pid
  $process = Get-Process -Id $serverPid -ErrorAction SilentlyContinue
  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $serverPid" -ErrorAction SilentlyContinue
  $ownedProcess = $process -and
    $process.ProcessName -eq 'node' -and
    $metadata.projectRoot -eq $projectRoot -and
    $processInfo.CommandLine -like "*$projectRoot*" -and
    $processInfo.CommandLine -like '*server/index.ts*'
  if ($ownedProcess) {
    Stop-Process -Id $serverPid
    [void]$process.WaitForExit(5000)
  } elseif ($process) {
    throw 'The saved PID belongs to another process. It was not stopped.'
  }
  Remove-Item -LiteralPath $pidPath -Force
  Write-Host 'Zaowutai has stopped.'
  exit 0
} catch {
  Write-Error $_
  exit 1
}
