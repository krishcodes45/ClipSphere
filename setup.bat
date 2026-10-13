@echo off
title ClipSphere - Automated Setup
echo ==========================================================
echo        ClipSphere: Initial Dependency Setup
echo ==========================================================
echo.
echo [1/2] Installing Express Server dependencies (with FFmpeg)...
cd /d %~dp0express-server
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install express-server dependencies.
    pause
    exit /b %errorlevel%
)
cd /d %~dp0

echo.
echo [2/2] Installing Electron Desktop App dependencies...
cd /d %~dp0desktop-mindshare
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install desktop-mindshare dependencies.
    pause
    exit /b %errorlevel%
)
cd /d %~dp0

echo.
echo ==========================================================
echo   Setup Completed Successfully!
echo   To launch the project, simply run: run-all.bat
echo   Or run:
echo     1. run-server.bat   (Express Backend on port 5000)
echo     2. run-desktop.bat  (Electron Desktop App)
echo ==========================================================
echo.
pause
