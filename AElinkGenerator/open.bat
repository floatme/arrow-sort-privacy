@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install the LTS build from https://nodejs.org then run this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo AElinkGenerator on this desktop
echo -------------------------------
echo 1. Keep THIS window open.
echo 2. Chrome will open the AliExpress Link Generator. Sign in if asked.
echo 3. Your site: http://localhost:3000
echo 4. Set Windows sleep to Never while this is running.
echo.
start "" http://localhost:3000
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0keep-awake.ps1"
echo.
pause
