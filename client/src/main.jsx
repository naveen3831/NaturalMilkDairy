import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { WebSocketProvider } from './context/WebSocketContext.jsx';
import { DairyProvider } from './context/DairyContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import './index.css';

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
