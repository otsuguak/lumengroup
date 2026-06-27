import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // <-- ¡ESTA ES LA LÍNEA MÁGICA QUE ENCIENDE EL DISEÑO!

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Registro de Service Worker para PWA (App Instalable)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Lumen PWA activa:', registration.scope);
      })
      .catch((error) => {
        console.error('Error registrando PWA:', error);
      });
  });
}