import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './web_cam_app.tsx'
import './index.css'

// The floating webcam only shows the camera feed, so it needs no Clerk
// authentication (and must not crash if the Clerk key is missing).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

window.ipcRenderer?.on('main-process-message', (_event, message) => {
  console.log(message)
})
