import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { WebSocketProvider } from './context/WebSocketContext.jsx';
import { DairyProvider } from './context/DairyContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { getApiUrl } from './services/api';
import './index.css';

// Automatically route any relative /api or /uploads request to VITE_API_URL in production
if (typeof window !== 'undefined' && window.fetch) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string') {
      if (input.startsWith('/api') || input.startsWith('/uploads')) {
        return nativeFetch(getApiUrl(input), init);
      }
    } else if (input instanceof Request) {
      const url = new URL(input.url, window.location.origin);
      if (url.origin === window.location.origin && (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads'))) {
        const fullTarget = getApiUrl(`${url.pathname}${url.search}`);
        return nativeFetch(new Request(fullTarget, input), init);
      }
    }
    return nativeFetch(input, init);
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
