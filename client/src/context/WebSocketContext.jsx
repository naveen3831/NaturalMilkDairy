import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { token, logout } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const listenersRef = useRef(new Map());
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const generationRef = useRef(0);
  const authenticatedRef = useRef(false);

  const getWsUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Connect through the same host and port so both localhost and network IP addresses work seamlessly
    return `${protocol}//${window.location.host}/ws`;
  };

  const connect = useCallback(() => {
    if (!token) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const generation = generationRef.current;
    try {
      const url = getWsUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (generationRef.current !== generation || !token) {
          ws.close();
          return;
        }
        ws.send(JSON.stringify({ type: 'AUTH', token }));
      };

      ws.onmessage = (event) => {
        if (generationRef.current !== generation) return;
        try {
          const data = JSON.parse(event.data);
          if (!data || !data.type) return;

          if (data.type === 'AUTHENTICATED') {
            authenticatedRef.current = true;
            setIsConnected(true);
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'PING' }));
            }, 25000);
            return;
          }

          if (data.type === 'AUTH_REQUIRED') return;
          if (data.type === 'PONG') return;
          if (data.type === 'AUTH_EXPIRED') {
            logout();
            return;
          }

          // Dispatch to registered listeners
          const eventListeners = listenersRef.current.get(data.type);
          if (eventListeners) {
            eventListeners.forEach((callback) => {
              try {
                callback(data.payload, data);
              } catch (err) {
                console.warn(`WebSocket listener error for ${data.type}:`, err);
              }
            });
          }

          // Wildcard '*' listeners
          const allListeners = listenersRef.current.get('*');
          if (allListeners) {
            allListeners.forEach((callback) => {
              try {
                callback(data.type, data.payload, data);
              } catch (err) {
                console.warn('WebSocket wildcard listener error:', err);
              }
            });
          }
        } catch (e) {
          // ignore non-json messages
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          authenticatedRef.current = false;
          setIsConnected(false);
          wsRef.current = null;
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        }
        if (generationRef.current === generation && token) {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
      console.warn('WebSocket connection init failed:', err);
      if (generationRef.current === generation && token) {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(connect, 4000);
      }
    }
  }, [token, logout]);

  useEffect(() => {
    generationRef.current += 1;
    authenticatedRef.current = false;
    setIsConnected(false);
    connect();

    return () => {
      generationRef.current += 1;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      authenticatedRef.current = false;
    };
  }, [connect]);

  // Subscribe to an event
  const subscribe = useCallback((eventType, callback) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      const set = listenersRef.current.get(eventType);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          listenersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  // Send message
  const sendMessage = useCallback((type, payload = {}) => {
    if (type === 'PING' && authenticatedRef.current &&
      wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        subscribe,
        sendMessage,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  return context || {
    isConnected: false,
    subscribe: () => () => {},
    sendMessage: () => {},
  };
};
