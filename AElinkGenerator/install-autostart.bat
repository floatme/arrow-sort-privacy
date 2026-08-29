@echo off
setlocal
cd /d "%~dp0"

set "TASK_NAME=AElinkGenerator Autostart"
set "START_BAT=%~dp0start-all.bat"

echo.
echo Install auto-start for helpmegetaround.com
echo ==========================================
echo This registers a Windows Task Scheduler job that runs
echo start-all.bat when you sign in to Windows (30 second delay).
echo.

if not exist "%START_BAT%" (
  echo Missing start-all.bat
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js LTS first: https://nodejs.org
  pause
  exit /b 1
)

where cloudflared >nul 2>&1
if errorlevel 1 (
  echo cloudflared not found. Running install-cloudflared.bat ...
  call "%~dp0install-cloudflared.bat"
)

REM Remove any previous task with the same name
schtasks /Delete /TN "%TASK_NAME%" /F >nul 2>&1

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-autostart.ps1" -TaskName "%TASK_NAME%" -StartBat "%START_BAT%"
if errorlevel 1 (
  echo.
  echo PowerShell install failed. Falling back to schtasks...
  schtasks /Create /TN "%TASK_NAME%" /TR "\"%START_BAT%\"" /SC ONLOGON /RL LIMITED /F
  if errorlevel 1 (
    echo Could not create scheduled task.
    pause
    exit /b 1
  )
)

echo.
echo Optional: install cloudflared as a Windows service (more reliable tunnel).
echo Requires Admin and an existing %%USERPROFILE%%\.cloudflared\config.yml
choice /C YN /M "Install cloudflared Windows service now"
if errorlevel 2 goto :done
if errorlevel 1 (
  if not exist "%USERPROFILE%\.cloudflared\config.yml" (
    echo No config.yml yet. Run connect-helpmegetaround.bat once first.
  ) else (
    cloudflared service install
    if errorlevel 1 (
      echo Service install failed — right-click this file and Run as administrator,
      echo or skip; start-all.bat will still start the tunnel at logon.
    ) else (
      echo cloudflared service installed.
    )
  )
)

:done
echo.
echo Auto-start installed: "%TASK_NAME%"
echo After reboot / sign-in, the converter and tunnel start automatically.
echo To remove: uninstall-autostart.bat
echo.
echo Starting once now...
call "%START_BAT%"
echo.
pause
