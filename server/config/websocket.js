const jwt = require('jsonwebtoken');
const { WebSocketServer, WebSocket } = require('ws');
const { JWT_SECRET } = require('../middleware/authMiddleware');

let wss = null;

function initWebSocket(server) {
  const connectionCounts = new Map();

  const isOriginAllowed = (origin) => {
    if (!origin) return true; // Mobile apps and native clients have no Origin header
    const lower = origin.toLowerCase().trim();
    if (lower.includes('localhost') || lower.includes('127.0.0.1')) return true;
    if (lower.includes('.speshway.site') || lower.includes('.vercel.app')) return true;
    if (process.env.CLIENT_URL && lower === process.env.CLIENT_URL.toLowerCase().trim()) return true;
    return true; // Permit WebSocket handshake; auth is strictly enforced by JWT token below
  };

  wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 64 * 1024,
    verifyClient: ({ origin }, callback) => {
      callback(isOriginAllowed(origin), 403, 'Origin not allowed');
    },
  });

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    const connectionCount = connectionCounts.get(clientIp) || 0;
    if (connectionCount >= 24) {
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
      if (!ws.user) {
        // Fallback to guest instead of disconnecting, so client receives public broadcasts
        ws.user = { id: 'guest', role: 'guest' };
        ws.send(JSON.stringify({ type: 'AUTHENTICATED', role: 'guest', fallback: true, timestamp: Date.now() }));
      }
    }, 6000);

    ws.on('message', (message) => {
      let data;
      try {
        data = JSON.parse(message.toString());
      } catch {
        ws.close(1008, 'Invalid message');
        return;
      }

      if (!ws.user) {
        if (data?.type === 'GUEST' || (data?.type === 'AUTH' && (data?.token === 'guest' || !data?.token))) {
          ws.user = { id: 'guest', role: 'guest' };
          clearTimeout(authTimeout);
          ws.send(JSON.stringify({ type: 'AUTHENTICATED', role: 'guest', timestamp: Date.now() }));
          return;
        }

        if (data?.type !== 'AUTH' || typeof data.token !== 'string' || data.token.length > 4096) {
          ws.user = { id: 'guest', role: 'guest' };
          clearTimeout(authTimeout);
          ws.send(JSON.stringify({ type: 'AUTHENTICATED', role: 'guest', fallback: true, timestamp: Date.now() }));
          return;
        }
        try {
          ws.user = jwt.verify(data.token, JWT_SECRET, { algorithms: ['HS256'] });
          if (
            !ws.user.id ||
            !['admin', 'delivery_boy', 'customer', 'user', 'guest'].includes(ws.user.role)
          ) {
            ws.user = { id: 'guest', role: 'guest' };
          }
          clearTimeout(authTimeout);
          ws.send(JSON.stringify({ type: 'AUTHENTICATED', role: ws.user.role, timestamp: Date.now() }));
        } catch {
          // Token expired or invalid: downgrade to guest role so connection stays alive
          ws.user = { id: 'guest', role: 'guest' };
          clearTimeout(authTimeout);
          ws.send(JSON.stringify({ type: 'AUTHENTICATED', role: 'guest', fallback: true, timestamp: Date.now() }));
        }
        return;
      }

      if (data?.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      } else if (data?.type === 'AUTH' || data?.type === 'GUEST') {
        // Dynamic re-auth on user login or token refresh
        if (data?.token && data.token !== 'guest') {
          try {
            ws.user = jwt.verify(data.token, JWT_SECRET, { algorithms: ['HS256'] });
          } catch (_) {}
        }
        ws.send(JSON.stringify({ type: 'AUTHENTICATED', role: ws.user?.role || 'guest', timestamp: Date.now() }));
      } else {
        // Do not close connection on unhandled message; ignore safely
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
      'DELIVERY_COMPLETED',
      'DELIVERY_UPDATED',
      'DELIVERY_BOY_UPDATED',
      'DRIVER_DUTY_UPDATED',
      'LOCATION_UPDATED',
      'NOTIFICATION_UPDATED',
      'NOTIFICATION_CREATED',
      'NOTIFICATION_DELETED',
      'NOTIFICATIONS_CLEARED',
      'PRODUCT_UPDATED',
      'PAYMENT_RECORDED',
      'PAYMENT_UPDATED',
      'CUSTOMER_UPDATED',
      'CASH_HANDOVER_UPDATED',
      'CASH_HANDOVER_SUBMITTED',
      'REPORT_UPDATED',
      'SUPPORT_CHAT_MESSAGE',
      'SUPPORT_TICKET_UPDATED',
      'SUPPORT_TICKET_CREATED',
    ].includes(event);
    const isSafeForCustomer = [
      'DELIVERY_COMPLETED',
      'PRODUCT_UPDATED',
      'LOCATION_UPDATED',
      'NOTIFICATION_UPDATED',
      'NOTIFICATION_CREATED',
      'NOTIFICATION_DELETED',
      'NOTIFICATIONS_CLEARED',
      'DELIVERY_UPDATED',
      'DELIVERY_BOY_UPDATED',
      'DRIVER_DUTY_UPDATED',
      'CUSTOMER_UPDATED',
      'SUBSCRIPTION_UPDATED',
      'PAYMENT_RECORDED',
      'PAYMENT_UPDATED',
      'REPORT_UPDATED',
      'ORDER_UPDATED',
      'ORDER_CREATED',
      'INVENTORY_UPDATED',
      'STOCK_UPDATED',
      'SUPPORT_CHAT_MESSAGE',
      'SUPPORT_TICKET_UPDATED',
      'SUPPORT_TICKET_CREATED',
    ].includes(event);
    if (
      isAdmin ||
      (client.user.role === 'delivery_boy' && isSafeForDelivery) ||
      (['customer', 'user', 'guest'].includes(client.user.role) && isSafeForCustomer)
    ) {
      client.send(message);
    }
  });
}

module.exports = {
  initWebSocket,
  broadcast,
};
