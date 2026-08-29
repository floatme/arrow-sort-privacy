@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "PORT=3000"
set "TUNNEL_NAME=aelinkgenerator"
set "LOGDIR=%~dp0logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"

echo [%date% %time%] start-all beginning>> "%LOGDIR%\autostart.log"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js not found. Install from https://nodejs.org
  echo [%date% %time%] FAIL: no node>> "%LOGDIR%\autostart.log"
  exit /b 1
)

where cloudflared >nul 2>&1
if errorlevel 1 (
  echo cloudflared not found. Run install-cloudflared.bat once.
  echo [%date% %time%] FAIL: no cloudflared>> "%LOGDIR%\autostart.log"
  exit /b 1
)

if not exist node_modules (
  echo Installing npm packages...
  call npm install >> "%LOGDIR%\autostart.log" 2>&1
  if errorlevel 1 exit /b 1
)

REM Skip starting the server if it is already healthy
curl -s -o nul http://127.0.0.1:%PORT%/api/health
if not errorlevel 1 (
  echo Converter already running on port %PORT%.
) else (
  echo Starting converter...
  start "AElinkGenerator" /MIN powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File "%~dp0keep-awake.ps1"
  set /a tries=0
  :wait_server
  curl -s -o nul http://127.0.0.1:%PORT%/api/health
  if not errorlevel 1 goto :server_up
  set /a tries+=1
  if !tries! geq 60 (
    echo Converter did not become healthy. See the AElinkGenerator window.
    echo [%date% %time%] FAIL: server health>> "%LOGDIR%\autostart.log"
    exit /b 1
  )
  timeout /t 2 /nobreak >nul
  goto :wait_server
  :server_up
  echo Converter is up.
)

REM Skip tunnel if cloudflared is already running for this user
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I "cloudflared.exe" >nul
if not errorlevel 1 (
  echo Cloudflare tunnel already running.
) else (
  echo Starting Cloudflare tunnel...
  if exist "%USERPROFILE%\.cloudflared\config.yml" (
    start "Cloudflare Tunnel" /MIN cmd /c "cloudflared tunnel run >> \"%LOGDIR%\tunnel.log\" 2>&1"
  ) else (
    start "Cloudflare Tunnel" /MIN cmd /c "cloudflared tunnel run %TUNNEL_NAME% >> \"%LOGDIR%\tunnel.log\" 2>&1"
  )
)

echo [%date% %time%] start-all OK>> "%LOGDIR%\autostart.log"
echo.
echo helpmegetaround.com should come online in about a minute.
echo Leave the minimized AElinkGenerator / Cloudflare windows running.
echo Sign in to Portals in Chrome if a login window appears.
exit /b 0
