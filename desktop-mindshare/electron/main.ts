import { app, BrowserWindow, desktopCapturer, ipcMain, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null
let studio: BrowserWindow | null = null
let floatingWebCam: BrowserWindow | null = null

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  win = new BrowserWindow({
    width: 380,
    height: 330,
    minHeight: 280,
    maxHeight: 400,
    minWidth: 320,
    maxWidth: 400,
    x: Math.round(screenWidth / 2 - 40),
    y: Math.round(screenHeight / 2 - 165),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    focusable: true,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  studio = new BrowserWindow({
    width: 320,
    height: 110,
    minHeight: 80,
    maxHeight: 250,
    minWidth: 260,
    maxWidth: 400,
    x: Math.round(screenWidth / 2 - 420),
    y: Math.round(screenHeight / 2 - 55),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    focusable: true,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  floatingWebCam = new BrowserWindow({
    width: 260,
    height: 260,
    minHeight: 200,
    minWidth: 200,
    x: screenWidth - 290,
    y: screenHeight - 290,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    focusable: true,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, 'screen-saver', 1);
  studio.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  studio.setAlwaysOnTop(true, 'screen-saver', 1);
  floatingWebCam.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  floatingWebCam.setAlwaysOnTop(true, 'screen-saver', 1);

  win.webContents.on('did-finish-load', () => {
    console.log("✅ Main window loaded");
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  studio.webContents.on("did-finish-load", () => {
    console.log("✅ studio.html loaded successfully!");
    studio?.webContents.send("main-process-message", new Date().toLocaleString());
    studio?.webContents.send("profile-recieved", {
      screen: 'screen:0:0',
      id: 'default',
      audio: 'default',
      preset: 'HD',
      plan: 'PRO',
    });
  });

  // Add error event listeners for debugging
  studio.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error("❌ Studio window failed to load:", errorCode, errorDescription, validatedURL);
  });

  if (VITE_DEV_SERVER_URL) {
    console.log("✅ VITE_DEV_SERVER_URL detected:", VITE_DEV_SERVER_URL);
  
    win.loadURL(VITE_DEV_SERVER_URL);
    
    // Use full URL with protocol
    const studioUrl = new URL('studio.html', VITE_DEV_SERVER_URL).toString();
    console.log("🔍 Attempting to load studio URL:", studioUrl);
    studio.loadURL(studioUrl);
  
    const webcamUrl = new URL('webcam.html', VITE_DEV_SERVER_URL).toString();
    console.log("🔍 Attempting to load webcam URL:", webcamUrl);
    floatingWebCam.loadURL(webcamUrl);
  } else {
    console.log("⚠️ VITE_DEV_SERVER_URL NOT detected, loading from dist.");
  
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
    studio.loadFile(path.join(RENDERER_DIST, 'studio.html'));
    floatingWebCam.loadFile(path.join(RENDERER_DIST, 'webcam.html'));
  }
}

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
    studio = null;
    floatingWebCam = null;
  }
});

ipcMain.on('closeApp', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
    studio = null;
    floatingWebCam = null;
  }
});

// Handle media sources
ipcMain.handle('getSources', async () => {
  const data = await desktopCapturer.getSources({
    thumbnailSize: { height: 100, width: 150 },
    fetchWindowIcons: true,
    types: ['window', 'screen'],
  });
  console.log("Available sources:", data);
  return data;
});

// Fix: Ensure studio receives selected media sources
ipcMain.on('media-sources', (event, payload) => {
  if (studio) {
    studio.webContents.send('profile-recieved', payload);
  }
});

// Resize Studio Window
ipcMain.on('resize-studio', (event, payload) => {
  console.log("Resize event received:", payload);
  if (studio) {
    studio.setSize(320, payload.shrink ? 80 : 180);
  }
});

// Hide Plugin
ipcMain.on('hide-plugin', (event, payload) => {
  console.log("Hide plugin event received", payload);
  win?.webContents.send('hide-plugin', payload);
});

// Re-create window when the app is activated (for macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
