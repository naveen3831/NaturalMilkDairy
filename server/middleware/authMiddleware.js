const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'natural_milk_dairy_super_secret_jwt_key_2026';
if (!process.env.JWT_SECRET) {
  console.warn('NOTICE: JWT_SECRET not found in environment, using default key.');
}

/**
 * Generate signed JWT token
 * @param {object} user - User payload
 * @param {string} expiresIn - Expiration duration (default 7 days)
 * @returns {string} - Signed JWT token
 */
const generateToken = (user, expiresIn = '7d') => {
  const userId = (user.id || user._id || '').toString();
  return jwt.sign(
    {
      id: userId,
      name: user.name || '',
      mobile: user.mobile || '',
      email: user.email || '',
      role: user.role || 'customer',
      assignedArea: user.assignedArea || user.area || '',
      customerId: user.customerId || '',
      boyId: user.boyId || (user.role === 'delivery_boy' ? userId : ''),
    },
    JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Middleware to verify JWT authentication token
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;

    if (authHeader && typeof authHeader === 'string') {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else {
        token = authHeader.trim();
      }
    } else if (req.headers['x-access-token']) {
      token = String(req.headers['x-access-token']).trim();
    }

    if (token && token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1).trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.',
        code: 'NO_TOKEN',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      message: isExpired
        ? 'Session expired. Please sign in again.'
        : 'Invalid or expired JWT token. Please sign in again.',
      code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      error: err.message,
    });
  }
};

/**
 * Optional token verification: populates req.user if token present, but doesn't block if missing
 */
const optionalToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;

    if (authHeader && typeof authHeader === 'string') {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else {
        token = authHeader.trim();
      }
    } else if (req.headers['x-access-token']) {
      token = String(req.headers['x-access-token']).trim();
    }

    if (token && token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1).trim();
    }

    if (token) {
      req.user = jwt.verify(token, JWT_SECRET);
    }
  } catch (err) {
    // Ignore invalid token in optional mode
  }
  next();
};

/**
 * Middleware to require Admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Administrator privileges required.',
    });
  }
  next();
};

const requireCustomer = (req, res, next) => {
  if (!req.user || (req.user.role !== 'customer' && req.user.role !== 'user')) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Customer account access is required.',
    });
  }
  next();
};

const requireDeliveryStaff = (req, res, next) => {
  if (!req.user || !['admin', 'delivery_boy'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Administrator or delivery partner access is required.',
    });
  }
  next();
};

const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in.',
    });
  }
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  optionalToken,
  requireAdmin,
  requireCustomer,
  requireDeliveryStaff,
  requireAuth,
  JWT_SECRET,
};
