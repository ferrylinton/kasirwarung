import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './i18n';
import App from './App.tsx';
import './index.css';

// Suppress benign third-party resize diagnostic warning and Vite HMR WebSocket disconnects
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes("<Fit />'s child needed to have its") ||
       args[0].includes("<Fit />'s child will not fit anywhere") ||
       args[0].includes("createWebSocketModuleRunnerTransport") ||
       args[0].includes("@vite/client"))
    ) {
      return;
    }
    originalError.apply(console, args);
  };

  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    const fn = event?.filename || '';
    if (
      msg.includes('createWebSocketModuleRunnerTransport') ||
      msg.includes('WebSocket') ||
      fn.includes('@vite/client')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event?.reason?.message || event?.reason || '');
    if (
      reason.includes('createWebSocketModuleRunnerTransport') ||
      reason.includes('WebSocket') ||
      reason.includes('@vite/client')
    ) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
