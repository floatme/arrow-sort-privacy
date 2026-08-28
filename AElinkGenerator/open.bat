@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
echo Starting the website at http://localhost:3000
echo Keep this window open. The first run opens Chrome so you can sign in to Portals.
echo That session is refreshed every 25 minutes.
start "" http://localhost:3000
node server.js
pause
