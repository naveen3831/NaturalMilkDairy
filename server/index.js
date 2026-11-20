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

const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB, getMongoStatus } = require('./config/db');
const { initWebSocket } = require('./config/websocket');

const app = express();
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1);

const server = http.createServer(app);

// Initialize WebSocket server
initWebSocket(server);

// 1. FAST HEALTH CHECK (Available immediately for CI/CD Docker and Nginx container probes)
app.get('/api/health', (req, res) => {
  const mongoStatus = getMongoStatus();
  res.json({
    status: 'healthy',
    app: 'Natural Milk Dairy API',
    tagline: 'Natural • Pure • Healthy',
    mongodb: mongoStatus.connected ? 'connected' : 'connecting',
    database: mongoStatus.info?.name || 'natural_milk_dairy',
    cluster: mongoStatus.info?.host || 'MongoDB Atlas',
    timestamp: new Date().toISOString(),
  });
});

// 2. Start HTTP listener IMMEDIATELY so container health checks never encounter race-condition 502s
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🥛 NATURAL MILK DAIRY — Server Running on Port ${PORT}`);
  console.log(`🌿 Natural • Pure • Healthy`);
  console.log(`📡 Health API: http://0.0.0.0:${PORT}/api/health`);
  console.log(`⚡ WebSocket:  ws://0.0.0.0:${PORT}/ws`);
  console.log(`======================================================\n`);
});

// 3. Connect to Database asynchronously in background
connectDB();

// 4. Allowed Origins for CORS
const staticAllowedOrigins = [
  'https://natural-milk-dairy-naveen3831s-projects.vercel.app',
  'https://natural-milk-dairy.vercel.app',
  'https://naturalmilkdairy.speshway.site',
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
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  if (/^https:\/\/natural-milk-dairy.*\.vercel\.app$/i.test(origin)) return true;
  if (/^https:\/\/.*\.speshway\.site$/i.test(origin)) return true;
  return false;
};

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  } else {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  }
  next();
});

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

app.use(express.json({ limit: '15mb', strict: true }));
app.use(morgan('dev'));

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

// Error handling middleware
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.message === 'Origin is not allowed by CORS.') {
    return res.status(403).json({ success: false, message: 'Request origin is not allowed.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body is too large.' });
  }
  console.error('Server Error:', err.stack);
  return res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../client/dist/index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  // Attempt dynamic self-healing build if client/dist is missing
  try {
    const cp = require('child_process');
    console.log('⚠️ client/dist/index.html missing! Initiating automatic client build...');
    cp.execSync('npm --prefix client run build', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  } catch (buildErr) {
    console.error('Auto build client dist failed:', buildErr.message);
  }

  res.send('Natural Milk Dairy API is active. Please start client or build dist.');
});
