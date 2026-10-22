const jwt = require('jsonwebtoken');
const { WebSocketServer, WebSocket } = require('ws');
const { JWT_SECRET } = require('../middleware/authMiddleware');

let wss = null;

function initWebSocket(server) {
  const allowedOrigins = new Set([
    process.env.CLIENT_URL,
    ...(process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()),
    ...(process.env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173']),
  ].filter(Boolean));
  const connectionCounts = new Map();

  wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 1024,
    verifyClient: ({ origin }, callback) => {
      callback(!origin || allowedOrigins.has(origin), 403, 'Origin not allowed');
    },
  });

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    const connectionCount = connectionCounts.get(clientIp) || 0;
    if (connectionCount >= 8) {
      ws.close(1013, 'Too many connections');
      return;
    }
    connectionCounts.set(clientIp, connectionCount + 1);

    ws.isAlive = true;
    ws.user = null;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.send(JSON.stringify({ type: 'AUTH_REQUIRED', timestamp: Date.now() }));
    const authTimeout = setTimeout(() => {
      if (!ws.user) ws.close(1008, 'Authentication required');
    }, 5000);

    ws.on('message', (message) => {
      let data;
      try {
        data = JSON.parse(message.toString());
      } catch {
        ws.close(1008, 'Invalid message');
        return;
      }

      if (!ws.user) {
        if (data?.type !== 'AUTH' || typeof data.token !== 'string' || data.token.length > 4096) {
          ws.close(1008, 'Authentication required');
          return;
        }
        try {
          ws.user = jwt.verify(data.token, JWT_SECRET, { algorithms: ['HS256'] });
          if (
            !ws.user.id ||
            !['admin', 'delivery_boy', 'customer', 'user'].includes(ws.user.role)
          ) {
            ws.close(1008, 'Invalid authentication token');
            return;
          }
          clearTimeout(authTimeout);
          ws.send(JSON.stringify({ type: 'AUTHENTICATED', timestamp: Date.now() }));
        } catch {
          ws.close(1008, 'Invalid authentication token');
        }
        return;
      }

      if (data?.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      } else {
        ws.close(1008, 'Unsupported message');
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimeout);
      const remaining = (connectionCounts.get(clientIp) || 1) - 1;
      if (remaining > 0) connectionCounts.set(clientIp, remaining);
      else connectionCounts.delete(clientIp);
    });

    ws.on('error', (err) => {
      console.warn('WebSocket client error:', err.message);
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.user?.exp && ws.user.exp <= Math.floor(Date.now() / 1000)) {
        ws.send(JSON.stringify({ type: 'AUTH_EXPIRED', timestamp: Date.now() }));
        ws.close(1008, 'Authentication expired');
        return;
      }
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
    connectionCounts.clear();
    wss = null;
  });

  console.log('WebSocket server initialized on authenticated path /ws');
  return wss;
}

function broadcast(event, payload = {}) {
  if (!wss) return;
  const message = JSON.stringify({
    type: event,
    payload,
    timestamp: Date.now(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN || !client.user) return;
    if (client.user.exp && client.user.exp <= Math.floor(Date.now() / 1000)) {
      client.close(1008, 'Authentication expired');
      return;
    }
    const isAdmin = client.user.role === 'admin';
    const isSafeForDelivery = [
      'DELIVERY_UPDATED',
      'DELIVERY_BOY_UPDATED',
      'LOCATION_UPDATED',
      'NOTIFICATION_UPDATED',
      'PRODUCT_UPDATED',
    ].includes(event);
    const isSafeForCustomer = ['PRODUCT_UPDATED', 'LOCATION_UPDATED', 'NOTIFICATION_UPDATED'].includes(event);
    if (
      isAdmin ||
      (client.user.role === 'delivery_boy' && isSafeForDelivery) ||
      (['customer', 'user'].includes(client.user.role) && isSafeForCustomer)
    ) {
      client.send(message);
    }
  });
}

module.exports = {
  initWebSocket,
  broadcast,
};
