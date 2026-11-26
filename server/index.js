const express = require('express');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1);

// 1. INSTANT HEALTH PROBE (Available in <50ms for Docker / Jenkins / Nginx CI probes)
app.get('/api/health', (req, res) => {
  let mongoConnected = false;
  let dbName = 'natural_milk_dairy';
  try {
    const mongoose = require('mongoose');
    mongoConnected = mongoose.connection && mongoose.connection.readyState === 1;
    if (mongoose.connection && mongoose.connection.name) {
      dbName = mongoose.connection.name;
    }
  } catch (_) {}
  res.json({
    status: 'healthy',
    app: 'Natural Milk Dairy API',
    tagline: 'Natural • Pure • Healthy',
    mongodb: mongoConnected ? 'connected' : 'connecting',
    database: dbName,
    timestamp: new Date().toISOString(),
  });
});

const server = http.createServer(app);

// 2. Yield to event loop immediately after listen() so /api/health responds in <50ms without 502 race conditions
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🥛 NATURAL MILK DAIRY — Server Running on Port ${PORT}`);
  console.log(`🌿 Natural • Pure • Healthy`);
  console.log(`📡 Health API: http://0.0.0.0:${PORT}/api/health`);
  console.log(`⚡ WebSocket:  ws://0.0.0.0:${PORT}/ws`);
  console.log(`======================================================\n`);

  setImmediate(bootstrapApplication);
});

function bootstrapApplication() {
  try {
    const path = require('path');
  const fs = require('fs');

  // Resolve .env from multiple candidate paths
  const envPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '../.env'),
    '/app/.env',
    path.join(process.cwd(), '.env'),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      require('dotenv').config({ path: p });
      break;
    }
  }
  require('dotenv').config();

  const cors = require('cors');
  const morgan = require('morgan');
  const { connectDB } = require('./config/db');
  const { initWebSocket } = require('./config/websocket');
  const {
    securityHeadersMiddleware,
    sanitizeNoSqlMiddleware,
    logSecurityEvent,
  } = require('./middleware/securityMiddleware');
  const { createRateLimiter } = require('./middleware/rateLimitMiddleware');

  // Initialize WebSocket server
  initWebSocket(server);

  // 3. Connect to Database asynchronously in background
  connectDB();

  // 4. Allowed Origins for CORS (Strict allowlist — no wildcard subdomain reflection)
  const staticAllowedOrigins = [
    'https://natural-milk-dairy-naveen3831s-projects.vercel.app',
    'https://natural-milk-dairy.vercel.app',
    'https://naturalmilkdairy.speshway.site',
    'https://naturalmilkdiary.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];

  const envOrigins = [
    process.env.CLIENT_URL,
    ...(process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()),
  ].filter(Boolean);

  const allowedOrigins = new Set([...staticAllowedOrigins, ...envOrigins]);

  const isOriginAllowed = (origin) => {
    if (!origin) return true; // Native mobile apps do not send an Origin header
    return allowedOrigins.has(origin.trim());
  };

  app.disable('x-powered-by');
  app.use(securityHeadersMiddleware);

  app.use(cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 600,
  }));

  app.use(express.json({ limit: '5mb', strict: true }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(sanitizeNoSqlMiddleware);
  app.use(morgan('dev'));

  // Global API rate limiter (protects against floods/DoS while permitting normal real-time app usage)
  const globalApiLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 300,
    message: 'Too many requests from this IP. Please slow down and try again shortly.',
  });
  app.use('/api', globalApiLimiter);

  // Static files (for manifest and fallback static web assets)
  app.use('/public', express.static(path.join(__dirname, '../client/public')));

  // 5. Mount API Routes
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/customers', require('./routes/customerRoutes'));
  app.use('/api/deliveries', require('./routes/deliveryRoutes'));
  app.use('/api/payments', require('./routes/paymentRoutes'));
  app.use('/api/products', require('./routes/productRoutes'));
  app.use('/api/delivery-boys', require('./routes/deliveryBoyRoutes'));
  app.use('/api/reports', require('./routes/reportRoutes'));
  app.use('/api/upload', require('./routes/uploadRoutes'));
  app.use('/api/notifications', require('./routes/notificationRoutes'));
  app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
  app.use('/api/locations', require('./routes/locationRoutes'));
  app.use('/api/supports', require('./routes/supportRoutes'));
  app.use('/api/banners', require('./routes/bannerRoutes'));
  app.use('/api/contact-info', require('./routes/contactInfoRoutes'));
  app.use('/api/media', require('./routes/mediaRoutes'));
  app.use('/api/forgot-password', require('./routes/authRoutes'));
  app.use('/api/reset-password', require('./routes/authRoutes'));

  // 5.1 Catch-all for undefined /api/* routes (Always return JSON, never HTML)
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Static files for client build
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // Centralized error handling middleware (never leak stack traces or internal details)
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.message === 'Origin is not allowed by CORS.') {
      logSecurityEvent('CORS_REJECTED', req, { origin: req.headers.origin });
      return res.status(403).json({ success: false, message: 'Request origin is not allowed.' });
    }
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({ success: false, message: 'Invalid JSON payload received.' });
    }
    if (err.type === 'entity.too.large') {
      logSecurityEvent('PAYLOAD_TOO_LARGE', req);
      return res.status(413).json({ success: false, message: 'Request body is too large.' });
    }
    console.error('Server Error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  });

  // SPA fallback (never execute synchronous builds inside request handler)
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../client/dist/index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return res.status(200).send('Natural Milk Dairy API is active.');
  });
  } catch (bootErr) {
    console.error('❌ Server bootstrap error:', bootErr);
  }
}
