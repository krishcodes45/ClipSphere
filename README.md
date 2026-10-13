# ClipSphere - AI-Powered Screen Recording and Video Processing Platform

ClipSphere is an AI-powered desktop screen recording and video processing application built with **Electron + React + Vite**, **Express.js + Socket.IO**, **FFmpeg**, and **Google Gemini AI**.

---

## Architecture Overview

1. **Desktop Recorder (`/desktop-mindshare`)**:
   - Built with Electron, React, and Vite.
   - Provides screen/display selection, audio routing, floating circular webcam feed, and a floating pill recording tray.
   - Streams live WebM chunks in real time over Socket.IO to the backend processing server.

2. **Backend Processing Server (`/express-server`)**:
   - Built with Express.js and Socket.IO.
   - Runs on `http://localhost:5000`.
   - Receives video chunks from the desktop recorder, stitches and validates the WebM file, extracts 16kHz audio using FFmpeg, and invokes Google Gemini AI for speech analysis, dynamic title generation, and executive summaries.

---

## Prerequisites

- **Node.js** v18+ or v20+ (Node v22 is supported)
- **FFmpeg & FFprobe** (bundled via `@ffmpeg-installer/ffmpeg` and `@ffprobe-installer/ffprobe`)

---

## Configuration (.env)

Both apps read their settings from `.env` files that are **not** committed. `setup.bat` and the `run-*.bat`
launchers create them automatically from the `.env.example` files. If you start things manually, run:

```bash
cp express-server/.env.example express-server/.env
cp desktop-mindshare/.env.example desktop-mindshare/.env
```

Then add your own `GEMINI_API_KEY` (and AWS keys if you want S3 upload) to `express-server/.env`. Without
`desktop-mindshare/.env` the desktop widget cannot start (it needs `VITE_CLERK_PUBLISHABLE_KEY`).

---

## How to Run the Project

### Method 1: One-Click Launcher (Recommended)
Double-click `run-all.bat` in the root folder. It starts both:
1. ClipSphere Express Backend Server (Port 5000)
2. ClipSphere Electron Desktop Recorder

---

### Method 2: Manual Terminal Commands

#### Step 1: Start the Backend Server
Open a terminal in the project directory:
```bash
cd express-server
node server.js
```
You should see:
```text
🟢 FFmpeg & FFprobe initialized from installers
🟢 Gemini AI initialized successfully using model: gemini-3.8-flash
🟢 ClipSphere Express Server listening on port 5000
```

#### Step 2: Start the Desktop App
Open a second terminal in the project directory:
```bash
cd desktop-mindshare
npm run dev
```
The Electron desktop recording widgets (control panel, floating webcam, and recording tray) will launch immediately on your screen.
