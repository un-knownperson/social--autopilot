try {
  let _fetch = window.fetch;
  const descriptor =
    Object.getOwnPropertyDescriptor(window, 'fetch') ||
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'fetch');
  if (descriptor && (!descriptor.writable || !descriptor.set)) {
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get: () => _fetch,
      set: (val) => {
        _fetch = val;
      },
    });
  }
} catch (e) {
  // Ignored
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register Service Worker for PWA & Web Share Target
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((err) => {
        console.warn('[PWA] ServiceWorker registration failed: ', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
