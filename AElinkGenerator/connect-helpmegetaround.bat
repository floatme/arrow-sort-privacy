@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "DOMAIN=helpmegetaround.com"
set "TUNNEL_NAME=aelinkgenerator"
set "PORT=3000"

echo.
echo  helpmegetaround.com — one-click connect
echo  ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed. Get LTS from https://nodejs.org
  pause
  exit /b 1
)

where cloudflared >nul 2>&1
if errorlevel 1 (
  echo cloudflared is not installed. Running install-cloudflared.bat ...
  call "%~dp0install-cloudflared.bat"
  where cloudflared >nul 2>&1
  if errorlevel 1 (
    echo Install cloudflared, open a NEW Command Prompt, run this file again.
    pause
    exit /b 1
  )
)

if not exist node_modules (
  echo Installing npm packages...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo [1/5] Starting the converter on http://localhost:%PORT% ...
echo       Chrome will open for AliExpress Portals login if needed.
echo       Keep that window open.
start "AElinkGenerator" cmd /k "cd /d "%~dp0" && node server.js"
timeout /t 3 /nobreak >nul

set /a tries=0
:wait_server
curl -s -o nul http://127.0.0.1:%PORT%/api/health
if not errorlevel 1 goto :server_up
set /a tries+=1
if !tries! geq 40 (
  echo Server did not start on port %PORT%. Check the AElinkGenerator window.
  pause
  exit /b 1
)
timeout /t 2 /nobreak >nul
goto :wait_server

:server_up
echo       Server is up.

echo.
echo [2/5] Cloudflare login — your browser will open once. Pick the account
echo       that owns %DOMAIN% and authorize the tunnel.
echo.
cloudflared tunnel login
if errorlevel 1 (
  echo Cloudflare login failed.
  pause
  exit /b 1
)

echo.
echo [3/5] Creating tunnel "%TUNNEL_NAME%" (skip if it already exists)...
cloudflared tunnel create %TUNNEL_NAME% 2>nul

echo.
echo [4/5] Pointing DNS for %DOMAIN% and www.%DOMAIN% at the tunnel...
cloudflared tunnel route dns %TUNNEL_NAME% %DOMAIN%
if errorlevel 1 (
  echo.
  echo DNS route failed. Common causes:
  echo   - %DOMAIN% is not added as a site in your Cloudflare account
  echo   - Nameservers at Namecheap do not match that Cloudflare zone
  echo.
  echo Run: node scripts\diagnose-dns.js
  echo Then fix Cloudflare / Namecheap and run this file again.
  pause
  exit /b 1
)
cloudflared tunnel route dns %TUNNEL_NAME% www.%DOMAIN%

echo.
echo [5/5] Writing cloudflared config and starting the tunnel...
node scripts\write-cloudflared-config.js %TUNNEL_NAME% %PORT%
if errorlevel 1 (
  echo Could not write config.yml — see messages above.
  pause
  exit /b 1
)

start "Cloudflare Tunnel" cmd /k "cloudflared tunnel run %TUNNEL_NAME%"

echo.
echo ========================================
echo  Done. In 1-3 minutes try:
echo    https://%DOMAIN%
echo.
echo  Leave BOTH windows open (AElinkGenerator + Cloudflare Tunnel).
echo  Run this file again after a reboot.
echo ========================================
echo.
pause
