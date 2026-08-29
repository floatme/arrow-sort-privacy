@echo off
setlocal
cd /d "%~dp0"

echo.
echo Restart converter with latest files
echo ==================================
echo 1. Close the old AElinkGenerator / Cloudflare Tunnel windows if open.
echo 2. This will start start-all.bat again.
echo.
pause

REM Best-effort: stop previous node server on port 3000
for /f "tokens=5" %%P in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
  echo Stopping PID %%P on port 3000...
  taskkill /PID %%P /F >nul 2>&1
)

call "%~dp0start-all.bat"
