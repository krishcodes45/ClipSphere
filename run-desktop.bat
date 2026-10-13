@echo off
title ClipSphere Desktop App
cd /d %~dp0desktop-mindshare
if not exist .env copy .env.example .env >nul
echo Starting ClipSphere Electron App...
npm run dev
pause
