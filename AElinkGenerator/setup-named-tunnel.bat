@echo off
setlocal
cd /d "%~dp0"

where cloudflared >nul 2>&1
if errorlevel 1 (
  echo cloudflared is not installed. Run install-cloudflared.bat first.
  pause
  exit /b 1
)

curl -s -o nul http://127.0.0.1:3000/
if errorlevel 1 (
  echo Start open.bat first so http://localhost:3000 is up.
  pause
  exit /b 1
)

echo.
echo This will open a browser to authorize Cloudflare, then create a tunnel
echo for helpmegetaround.com. The domain's nameservers must already be at Cloudflare.
echo.
pause

cloudflared tunnel login
if errorlevel 1 goto :fail

cloudflared tunnel create aelinkgenerator
if errorlevel 1 (
  echo If the tunnel already exists, continuing to DNS route...
)

echo.
echo Pointing helpmegetaround.com and www at the tunnel...
cloudflared tunnel route dns aelinkgenerator helpmegetaround.com
cloudflared tunnel route dns aelinkgenerator www.helpmegetaround.com

echo.
echo Next: copy cloudflare-config.example.yml to:
echo   %%USERPROFILE%%\.cloudflared\config.yml
echo Put your tunnel id and Windows username in that file.
echo Then run:
echo   cloudflared tunnel run aelinkgenerator
echo.
pause
goto :end

:fail
echo Cloudflare login failed.
pause
exit /b 1

:end
pause
