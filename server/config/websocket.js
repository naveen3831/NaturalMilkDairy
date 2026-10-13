const { WebSocketServer } = require('ws');

let wss = null;

function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Send welcome / handshake
    ws.send(JSON.stringify({
      type: 'CONNECTED',
      message: 'WebSocket connected to Natural Milk Dairy real-time service',
      timestamp: Date.now(),
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch (e) {
        // ignore non-json
      }
    });

    ws.on('close', () => {
      // client disconnected
    });

    ws.on('error', (err) => {
      console.warn('WebSocket client error:', err.message);
    });
  });

  // Keep alive heartbeat ping every 30 seconds
  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  console.log('⚡ WebSocket Server initialized on path /ws');
  return wss;
}

/**
 * Broadcast an event to all connected clients
 * @param {string} event - Event type (e.g. 'DELIVERY_UPDATED', 'CUSTOMER_UPDATED', 'PAYMENT_RECORDED', 'NOTIFICATION_NEW')
 * @param {object} payload - Optional data payload
 */
function broadcast(event, payload = {}) {
  if (!wss) return;
  const message = JSON.stringify({
    type: event,
    payload,
    timestamp: Date.now(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(message);
      } catch (err) {
        console.warn('WebSocket broadcast error:', err.message);
      }
    }
  });
}

module.exports = {
  initWebSocket,
  broadcast,
};
