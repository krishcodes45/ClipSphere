@echo off
title ClipSphere Launcher
echo =========================================================
echo   Starting ClipSphere (Backend AI Server + Desktop App)
echo =========================================================
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
