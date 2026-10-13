@echo off
title ClipSphere Launcher
echo =========================================================
echo   Starting ClipSphere (Backend AI Server + Desktop App)
echo =========================================================
REM Create .env files from the examples on first run (the app shows a blank
REM window without VITE_CLERK_PUBLISHABLE_KEY, which lives in desktop-mindshare\.env)
if not exist "%~dp0desktop-mindshare\.env" copy "%~dp0desktop-mindshare\.env.example" "%~dp0desktop-mindshare\.env" >nul
if not exist "%~dp0express-server\.env" copy "%~dp0express-server\.env.example" "%~dp0express-server\.env" >nul
if not exist "%~dp0desktop-mindshare\node_modules" echo [WARN] Dependencies missing - run setup.bat first.
if not exist "%~dp0express-server\node_modules" echo [WARN] Dependencies missing - run setup.bat first.
echo [1/2] Starting Backend Server (port 5000)...
start "ClipSphere Backend Server" cmd /k "cd /d %~dp0express-server && node server.js"
timeout /t 3 >nul

echo [2/2] Starting Desktop Recorder App...
start "ClipSphere Desktop App" cmd /k "cd /d %~dp0desktop-mindshare && npm run dev"

echo =========================================================
echo ClipSphere services launched!
echo - AI Server:      http://localhost:5000
echo - Desktop App:    Floating Screen Recorder Widget
echo =========================================================
