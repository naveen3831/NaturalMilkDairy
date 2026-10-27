const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB, getMongoStatus } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const productRoutes = require('./routes/productRoutes');
const deliveryBoyRoutes = require('./routes/deliveryBoyRoutes');
const reportRoutes = require('./routes/reportRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const locationRoutes = require('./routes/locationRoutes');
const supportRoutes = require('./routes/supportRoutes');
const bannerRoutes = require('./routes/bannerRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1);

// Connect to Database
connectDB();

// Allowed Origins for CORS
const staticAllowedOrigins = [
  'https://natural-milk-dairy-naveen3831s-projects.vercel.app',
  'https://natural-milk-dairy.vercel.app',
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
  // Allow all Vercel deployment URLs for this project
  if (/^https:\/\/natural-milk-dairy.*\.vercel\.app$/i.test(origin)) return true;
  return false;
};

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
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
app.use(express.json({ limit: '1mb', strict: true }));
app.use(morgan('dev'));

// Static files (for logo and assets)
app.use('/public', express.static(path.join(__dirname, '../client/public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/delivery-boys', deliveryBoyRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/supports', supportRoutes);
app.use('/api/banners', bannerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const mongoStatus = getMongoStatus();
  res.json({
    status: 'healthy',
    app: 'Natural Milk Dairy API',
    tagline: 'Natural • Pure • Healthy',
    mongodb: mongoStatus.connected ? 'connected' : 'fallback-json',
    database: mongoStatus.info?.name || 'natural_milk_dairy',
    cluster: mongoStatus.info?.host || 'MongoDB Atlas',
    timestamp: new Date().toISOString(),
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
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('Natural Milk Dairy API is active. Please start client or build dist.');
  }
});

const http = require('http');
const { initWebSocket } = require('./config/websocket');

const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🥛 NATURAL MILK DAIRY — Server Running on Port ${PORT}`);
  console.log(`🌿 Natural • Pure • Healthy`);
  console.log(`📡 Local API:   http://localhost:${PORT}/api/health`);
  console.log(`🌐 Network API: http://0.0.0.0:${PORT}/api/health`);
  console.log(`⚡ WebSocket:   ws://0.0.0.0:${PORT}/ws`);
  console.log(`======================================================\n`);
});
