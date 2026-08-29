@echo off
setlocal
cd /d "%~dp0"

set "TASK_NAME=AElinkGenerator Autostart"

echo Removing scheduled task "%TASK_NAME%" ...
schtasks /Delete /TN "%TASK_NAME%" /F
if errorlevel 1 (
  echo Task was not found or could not be removed.
) else (
  echo Task removed.
)

echo.
echo Optional: remove cloudflared Windows service (needs Admin).
choice /C YN /M "Uninstall cloudflared service"
if errorlevel 2 goto :end
if errorlevel 1 (
  cloudflared service uninstall
)

:end
echo.
echo Auto-start disabled. You can still run start-all.bat manually.
pause
