@echo off
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 set "PATH=%LOCALAPPDATA%\node-v24.22.0-win-x64;%PATH%"
start "" http://127.0.0.1:5173/
npm run dev
