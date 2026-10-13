@echo off
title ClipSphere Backend Server
cd /d %~dp0express-server
if not exist .env copy .env.example .env >nul
echo Starting ClipSphere Backend Server on Port 5000...
node server.js
pause
