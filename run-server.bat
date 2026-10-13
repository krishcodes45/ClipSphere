@echo off
title ClipSphere Backend Server
cd /d %~dp0express-server
echo Starting ClipSphere Backend Server on Port 5000...
node server.js
pause
