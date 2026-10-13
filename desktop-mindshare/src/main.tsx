import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.tsx'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Ensure 'root' exists before rendering
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Root element 'root' not found in index.html");
}

const root = ReactDOM.createRoot(rootElement)

if (!PUBLISHABLE_KEY) {
  // Show a visible message instead of a blank window.
  console.error('Missing VITE_CLERK_PUBLISHABLE_KEY. Copy desktop-mindshare/.env.example to desktop-mindshare/.env (or run setup.bat) and restart.')
  root.render(
    <div className="bg-[#171717] border-2 border-neutral-700 rounded-3xl h-screen w-full flex flex-col items-center justify-center gap-y-2 p-6 text-center text-white select-none">
      <p className="font-bold">ClipSphere is not configured</p>
      <p className="text-sm text-neutral-400">
        Missing <code>VITE_CLERK_PUBLISHABLE_KEY</code>. Copy <code>.env.example</code> to <code>.env</code> in
        <code> desktop-mindshare</code> and restart.
      </p>
    </div>
  )
} else {
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    </React.StrictMode>
  )
}

// Ensure ipcRenderer exists before using it
if (window.ipcRenderer) {
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
} else {
  console.warn("ipcRenderer is not available. Make sure preload.js is set up correctly.")
}
