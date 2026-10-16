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

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
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
  console.error('Server Error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
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
