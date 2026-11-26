const jwt = require('jsonwebtoken');
const { WebSocketServer, WebSocket } = require('ws');
const { JWT_SECRET } = require('../middleware/authMiddleware');

let wss = null;

const WS_ALLOWED_ORIGINS = new Set([
  'https://natural-milk-dairy-naveen3831s-projects.vercel.app',
  'https://natural-milk-dairy.vercel.app',
  'https://naturalmilkdairy.speshway.site',
  'https://naturalmilkdiary.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL.trim()] : []),
  ...(process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean),
]);

function initWebSocket(server) {
  const connectionCounts = new Map();

  const isOriginAllowed = (origin) => {
    if (!origin) return true; // Mobile apps and native clients have no Origin header
    return WS_ALLOWED_ORIGINS.has(origin.trim());
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
        // Guest connections only receive public catalog/location updates, never private user/payment data
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
          const verified = jwt.verify(data.token, JWT_SECRET, { algorithms: ['HS256'] });
          if (
            !verified.id ||
            !['admin', 'delivery_boy', 'customer', 'user'].includes(verified.role)
          ) {
            ws.user = { id: 'guest', role: 'guest' };
          } else {
            ws.user = verified;
          }
          clearTimeout(authTimeout);
          ws.send(JSON.stringify({ type: 'AUTHENTICATED', role: ws.user.role, timestamp: Date.now() }));
        } catch {
          ws.user = { id: 'guest', role: 'guest' };
          clearTimeout(authTimeout);
          ws.send(JSON.stringify({ type: 'AUTHENTICATED', role: 'guest', fallback: true, timestamp: Date.now() }));
        }
        return;
      }

      if (data?.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      } else if (data?.type === 'AUTH' || data?.type === 'GUEST') {
        if (data?.token && data.token !== 'guest' && typeof data.token === 'string') {
          try {
            const verified = jwt.verify(data.token, JWT_SECRET, { algorithms: ['HS256'] });
            if (verified.id && ['admin', 'delivery_boy', 'customer', 'user'].includes(verified.role)) {
              ws.user = verified;
            }
          } catch (_) {
            ws.user = { id: 'guest', role: 'guest' };
          }
        } else if (data?.type === 'GUEST') {
          ws.user = { id: 'guest', role: 'guest' };
        }
        ws.send(JSON.stringify({ type: 'AUTHENTICATED', role: ws.user?.role || 'guest', timestamp: Date.now() }));
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

    const role = client.user.role;
    const isAdmin = role === 'admin';

    // Guest connections ONLY receive public non-PII catalog/area updates
    if (role === 'guest') {
      if (['PRODUCT_UPDATED', 'LOCATION_UPDATED', 'BANNER_UPDATED'].includes(event)) {
        client.send(message);
      }
      return;
    }

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
      'CUSTOMER_UPDATED',
      'SUBSCRIPTION_UPDATED',
      'PAYMENT_RECORDED',
      'PAYMENT_UPDATED',
      'REPORT_UPDATED',
      'ORDER_UPDATED',
      'ORDER_CREATED',
      'SUPPORT_CHAT_MESSAGE',
      'SUPPORT_TICKET_UPDATED',
    ].includes(event);

    if (!isAdmin) {
      if (['customer', 'user'].includes(role)) {
        if (!isSafeForCustomer) return;

        // Scope customer-specific events strictly to the owning customer
        const customerScopedEvents = new Set([
          'DELIVERY_COMPLETED',
          'DELIVERY_UPDATED',
          'CUSTOMER_UPDATED',
          'SUBSCRIPTION_UPDATED',
          'PAYMENT_RECORDED',
          'PAYMENT_UPDATED',
          'ORDER_UPDATED',
          'ORDER_CREATED',
        ]);
        if (customerScopedEvents.has(event)) {
          const clientCustId = (client.user.customerId || client.user.id || '').toString().toLowerCase().trim();
          const clientMobile = (client.user.mobile || '').toString().replace(/\D/g, '').slice(-10);
          const payloadCustId = (payload.customerId || payload.id || '').toString().toLowerCase().trim();
          const payloadMobile = (payload.customerPhone || payload.customerMobile || payload.mobile || '').toString().replace(/\D/g, '').slice(-10);

          if (payloadCustId && clientCustId && payloadCustId !== clientCustId && (!clientMobile || !payloadMobile || clientMobile !== payloadMobile)) {
            return;
          }
        }

        if (event === 'SUPPORT_CHAT_MESSAGE' || event === 'SUPPORT_TICKET_UPDATED') {
          const clientMobile = (client.user.mobile || '').toString().replace(/\D/g, '').slice(-10);
          const payloadMobile = (payload.phone || payload.mobile || payload.customerPhone || '').toString().replace(/\D/g, '').slice(-10);
          const payloadUserId = (payload.userId || '').toString();
          if ((payloadUserId && payloadUserId !== String(client.user.id)) && (!clientMobile || !payloadMobile || clientMobile !== payloadMobile)) {
            return;
          }
        }

        if (event === 'NOTIFICATION_CREATED') {
          const recipRole = (payload.recipientRole || '').toLowerCase().trim();
          if (recipRole && recipRole !== 'all' && recipRole !== 'customer') return;
          const recipId = (payload.recipientId || '').toString().toLowerCase().trim();
          if (recipId) {
            const clientIds = [
              client.user.id,
              client.user.customerId,
              client.user.mobile,
              client.user.email,
            ].filter(Boolean).map((s) => s.toString().toLowerCase().trim());
            if (!clientIds.includes(recipId)) return;
          }
        }
      } else if (role === 'delivery_boy') {
        if (!isSafeForDelivery) return;

        if (event === 'NOTIFICATION_CREATED') {
          const recipRole = (payload.recipientRole || '').toLowerCase().trim();
          if (recipRole && recipRole !== 'all' && recipRole !== 'delivery_boy') return;
          const recipId = (payload.recipientId || '').toString().toLowerCase().trim();
          if (recipId) {
            const boyIds = [
              client.user.id,
              client.user.boyId,
              client.user.mobile,
              client.user.email,
            ].filter(Boolean).map((s) => s.toString().toLowerCase().trim());
            if (!boyIds.includes(recipId)) return;
          }
        }
      } else {
        return;
      }
    }

    client.send(message);
  });
}

module.exports = { initWebSocket, broadcast };
