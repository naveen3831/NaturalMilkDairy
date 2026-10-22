import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { WebSocketProvider } from './context/WebSocketContext.jsx';
import { DairyProvider } from './context/DairyContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { getApiUrl, safeResponseJson } from './services/api';
import './index.css';

// Automatically route any relative /api or /uploads request to the active backend URL
// and safely intercept responses to prevent "Unexpected end of JSON input" errors.
if (typeof window !== 'undefined' && window.fetch) {
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    let target = input;
    if (typeof input === 'string') {
      if (input.startsWith('/api') || input.startsWith('/uploads')) {
        target = getApiUrl(input);
      }
    } else if (input instanceof Request) {
      const url = new URL(input.url, window.location.origin);
      if (
        url.origin === window.location.origin &&
        (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads'))
      ) {
        const fullTarget = getApiUrl(`${url.pathname}${url.search}`);
        target = new Request(fullTarget, input);
      }
    }

    try {
      const res = await nativeFetch(target, init);
      // Attach safe JSON parser to response
      res.json = () => safeResponseJson(res);
      return res;
    } catch (netErr) {
      // Return a clean synthesized response instead of an uncaught exception
      const fallback = new Response(
        JSON.stringify({
          success: false,
          message: 'Unable to connect to the backend server. Please verify your connection or server status.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
      fallback.json = () => safeResponseJson(fallback);
      return fallback;
    }
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <WebSocketProvider>
        <DairyProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </DairyProvider>
      </WebSocketProvider>
    </AuthProvider>
  </React.StrictMode>
);
