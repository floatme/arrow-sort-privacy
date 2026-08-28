@echo off
cd /d "%~dp0"
echo.
echo AElinkGenerator
echo ---------------
echo 1. Chrome is already on the Portals Link Generator? Leave that tab open.
echo 2. Open chrome://extensions
echo 3. Turn on Developer mode
echo 4. Click "Load unpacked" and select this folder:
echo    %cd%
echo 5. Click the AElinkGenerator icon, paste a product URL, Convert.
echo.
echo The extension refreshes the Portals tab every 25 minutes so you stay logged in.
echo.

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if defined CHROME (
  start "" "%CHROME%" "chrome://extensions"
) else (
  echo Open chrome://extensions yourself if Chrome did not launch.
)

echo.
pause
