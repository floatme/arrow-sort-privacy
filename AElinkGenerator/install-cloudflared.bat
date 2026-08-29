@echo off
setlocal
echo Installing Cloudflare Tunnel (cloudflared)...
where winget >nul 2>&1
if errorlevel 1 (
  echo winget is not available.
  echo Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
  pause
  exit /b 1
)
winget install --id Cloudflare.cloudflared -e --accept-package-agreements --accept-source-agreements
echo.
echo Close this window, open a NEW Command Prompt, then run: cloudflared --version
pause
