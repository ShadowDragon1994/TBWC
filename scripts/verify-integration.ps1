$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$lock = Get-Content -Raw (Join-Path $root "vendor/trademind.lock.json") | ConvertFrom-Json
$required = @("backend", "admin", "collector")
foreach ($name in $required) {
    if (-not $lock.images.$name) { throw "Missing upstream image: $name" }
}
$envText = Get-Content -Raw (Join-Path $root ".env.example")
foreach ($key in @("TAOBAO_SEARCH_PROVIDER_BASE_URL", "ADOBE_CLIENT_ID", "TAOBAO_APP_KEY")) {
    if ($envText -notmatch "(?m)^$key=") { throw "Missing environment contract: $key" }
}
Write-Host "Integration manifest verified for $($lock.name) $($lock.ref)"

