@echo off
setlocal
cd /d "%~dp0"

where cloudflared >nul 2>&1
if errorlevel 1 (
  echo cloudflared is not installed.
  echo Run install-cloudflared.bat first, then open a NEW Command Prompt.
  pause
  exit /b 1
)

echo Checking that the local site is running on port 3000...
curl -s -o nul http://127.0.0.1:3000/
if errorlevel 1 (
  echo http://localhost:3000 is not up.
  echo Start open.bat first and leave it open, then run this file.
  pause
  exit /b 1
)

echo.
echo Starting a quick Cloudflare tunnel.
echo Leave THIS window open. Share the https://....trycloudflare.com URL it prints.
echo That URL changes every time you restart this script.
echo.
cloudflared tunnel --url http://127.0.0.1:3000 --no-autoupdate
echo.
pause
