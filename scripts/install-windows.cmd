@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

set "ROOT=%~dp0.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
set "LOG=%ROOT%\install-windows.log"
set "CHECK_ONLY=0"
if /I "%~1"=="--check-only" set "CHECK_ONLY=1"

echo ============================================================
echo  TBWC Windows 一键环境安装器
echo  项目目录：%ROOT%
echo  日志文件：%LOG%
echo ============================================================
echo [%date% %time%] installer started>>"%LOG%"

if "%CHECK_ONLY%"=="0" (
  net session >nul 2>&1
  if errorlevel 1 (
    echo [信息] 正在请求管理员权限，请在弹窗中选择“是”。
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%ComSpec%' -Verb RunAs -ArgumentList '/d /c ""%~f0""'"
    exit /b 0
  )
)

where winget >nul 2>&1
if errorlevel 1 (
  echo [错误] 未找到 winget。请先从 Microsoft Store 安装“应用安装程序”，然后重新运行。
  echo [ERROR] winget not found>>"%LOG%"
  exit /b 2
)

if "%CHECK_ONLY%"=="0" winget source update --disable-interactivity >>"%LOG%" 2>&1

call :ensure "Git" git.exe Git.Git
if errorlevel 1 exit /b !errorlevel!
call :ensure "PowerShell 7" pwsh.exe Microsoft.PowerShell
if errorlevel 1 exit /b !errorlevel!
call :ensure "Node.js LTS" node.exe OpenJS.NodeJS.LTS
if errorlevel 1 exit /b !errorlevel!
call :ensure "Go" go.exe GoLang.Go
if errorlevel 1 exit /b !errorlevel!
call :ensure "Docker Desktop" docker.exe Docker.DockerDesktop
if errorlevel 1 exit /b !errorlevel!

if "%CHECK_ONLY%"=="1" (
  echo.
  echo [完成] 环境检查结束。未执行安装、初始化或启动。
  exit /b 0
)

rem Refresh common machine-install locations for this CMD process.
set "PATH=%PATH%;%ProgramFiles%\Git\cmd;%ProgramFiles%\PowerShell\7;%ProgramFiles%\nodejs;%ProgramFiles%\Go\bin;%ProgramFiles%\Docker\Docker\resources\bin"

where pwsh.exe >nul 2>&1
if errorlevel 1 (
  echo [需要重启] PowerShell 7 已安装，但当前进程尚未获得新 PATH。请重启电脑后再次运行本脚本。
  exit /b 3010
)

echo [1/5] 启用 Node Corepack...
corepack enable >>"%LOG%" 2>&1
if errorlevel 1 (
  echo [警告] Corepack 启用失败；稍后仍可使用 Docker 模式启动。详见日志。
) else (
  call corepack prepare pnpm@9.15.4 --activate >>"%LOG%" 2>&1
)

echo [2/5] 创建本地环境配置...
pwsh.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root='%ROOT%'; $example=Join-Path $root '.env.example'; $env=Join-Path $root '.env'; if(-not(Test-Path $env)){Copy-Item $example $env}; $text=Get-Content -Raw $env; if($text -match 'COLLECTOR_SERVICE_TOKEN=replace-with-at-least-32-random-characters'){ $token=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant(); $text=$text -replace 'COLLECTOR_SERVICE_TOKEN=replace-with-at-least-32-random-characters',('COLLECTOR_SERVICE_TOKEN='+$token); Set-Content -Encoding utf8 $env $text }" >>"%LOG%" 2>&1
if errorlevel 1 goto :failed

echo [3/5] 下载锁定版本 TradeMind 并应用淘宝集成补丁...
pwsh.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\bootstrap-trademind.ps1" >>"%LOG%" 2>&1
if errorlevel 1 goto :failed

echo [4/5] 验证集成清单...
pwsh.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\verify-integration.ps1" >>"%LOG%" 2>&1
if errorlevel 1 goto :failed

echo [5/5] 启动 Docker Desktop 和项目服务...
docker info >nul 2>&1
if errorlevel 1 (
  if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
  echo [等待] Docker Desktop 正在启动，最多等待 120 秒...
  for /L %%S in (1,1,24) do (
    timeout /t 5 /nobreak >nul
    docker info >nul 2>&1 && goto :docker_ready
  )
  echo [需要操作] Docker Desktop 尚未就绪。首次安装可能要求注销、重启或完成 WSL 2 设置。
  echo 完成后再次运行本脚本，它会从现有文件继续。
  exit /b 3010
)

:docker_ready
docker compose -f "%ROOT%\vendor\trademind-ai\docker-compose.full.yml" up -d --build >>"%LOG%" 2>&1
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo  安装与启动完成
echo  管理端：http://127.0.0.1:8000
echo  后端 API：http://127.0.0.1:8081
echo  采集器：http://127.0.0.1:3100
echo  配置文件：%ROOT%\.env
echo  日志文件：%LOG%
echo ============================================================
start "" "http://127.0.0.1:8000"
exit /b 0

:ensure
set "LABEL=%~1"
set "COMMAND=%~2"
set "PACKAGE=%~3"
where "%COMMAND%" >nul 2>&1
if not errorlevel 1 (
  echo [已安装] %LABEL%
  exit /b 0
)
if "%CHECK_ONLY%"=="1" (
  echo [缺少] %LABEL%（winget 包：%PACKAGE%）
  exit /b 0
)
echo [安装] %LABEL% ...
winget install --id "%PACKAGE%" --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity >>"%LOG%" 2>&1
if errorlevel 1 (
  echo [错误] %LABEL% 安装失败，详见：%LOG%
  exit /b 10
)
echo [完成] %LABEL%
exit /b 0

:failed
echo.
echo [失败] 安装或初始化未完成。请查看日志：%LOG%
echo 修复提示的问题后再次运行本脚本，已完成步骤会被复用。
exit /b 20
