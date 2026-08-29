@echo off
setlocal
cd /d "%~dp0"

echo.
echo Open AliExpress Affiliate API signup pages
echo ==========================================
echo Sign in if asked, then apply for API / create an app.
echo When you have App Key, App Secret, and Tracking ID,
echo put them in .env  (see .env.example) and restart the converter.
echo.

start "" "https://portals.aliexpress.com/affiportals/web/api.htm"
timeout /t 2 /nobreak >nul
start "" "https://portals.aliexpress.com/"
timeout /t 1 /nobreak >nul
start "" "https://open.aliexpress.com/"

echo.
echo Pages opened in your browser.
echo Typical path inside Portals: Tools / API → apply → create app
echo Tracking ID is under Account / Settings → Tracking ID
echo.
pause
