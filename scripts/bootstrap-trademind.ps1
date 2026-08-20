param([string]$Destination = "vendor/trademind-ai")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$lock = Get-Content -Raw (Join-Path $root "vendor/trademind.lock.json") | ConvertFrom-Json
$target = Join-Path $root $Destination

if (Test-Path (Join-Path $target ".git")) {
    git -C $target fetch --tags --depth 1 origin $lock.ref
    git -C $target checkout --detach $lock.ref
} else {
    git clone --branch $lock.ref --depth 1 $lock.repository $target
}

$actual = (git -C $target describe --tags --exact-match 2>$null)
if ($LASTEXITCODE -ne 0 -or $actual -ne $lock.ref) {
    throw "TradeMind version verification failed: expected $($lock.ref), got $actual"
}

$patch = Join-Path $root "patches/trademind-taobao.patch"
if (Test-Path $patch) {
    git -C $target apply --check $patch
    if ($LASTEXITCODE -ne 0) {
        throw "TradeMind integration patch verification failed: $patch"
    }
    git -C $target apply $patch
    if ($LASTEXITCODE -ne 0) {
        throw "TradeMind integration patch apply failed: $patch"
    }
}

Copy-Item (Join-Path $root ".env") (Join-Path $target ".env") -Force
Write-Host "TradeMind $actual is ready at $target"
Write-Host "Integration patch applied: patches/trademind-taobao.patch"
Write-Host "Start: docker compose -f '$target/docker-compose.full.yml' up -d --build"
