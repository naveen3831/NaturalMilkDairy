const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, 'utf8') < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters.');
}
const VALID_ROLES = new Set(['admin', 'delivery_boy', 'customer', 'user']);

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
    { expiresIn, algorithm: 'HS256' }
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

    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (!decoded.id || !VALID_ROLES.has(decoded.role)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired JWT token. Please sign in again.',
        code: 'INVALID_TOKEN',
      });
    }
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
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      if (decoded.id && VALID_ROLES.has(decoded.role)) req.user = decoded;
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

const authorizeCustomerAccess = async (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  const requestedId = req.params.id || req.query.customerId;
  if (req.user?.role === 'delivery_boy') {
    try {
      const query = /^[a-f\d]{24}$/i.test(requestedId)
        ? { _id: requestedId }
        : { customerId: requestedId };
      const customer = await Customer.findOne(query).lean();
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
      const identity = [req.user.id, req.user.boyId, req.user.mobile].filter(Boolean);
      const assignedIds = [
        customer.deliveryPlan?.deliveryBoyId,
      ].filter(Boolean);
      const assignedById = assignedIds.some((id) => identity.includes(id));
      const assignedByName = req.user.name && customer.deliveryPlan?.deliveryBoyName &&
        req.user.name.trim().toLowerCase() === customer.deliveryPlan.deliveryBoyName.trim().toLowerCase();
      if (assignedById || assignedByName) return next();
      return res.status(403).json({ success: false, message: 'You can only access customers assigned to your route.' });
    } catch (error) {
      return next(error);
    }
  }
  const isOwner = ['customer', 'user'].includes(req.user?.role) &&
    (requestedId === 'me' || requestedId === req.user.id || requestedId === req.user.customerId);
  if (!isOwner) {
    return res.status(403).json({
      success: false,
      message: 'You can only access your own customer account.',
    });
  }
  return next();
};

module.exports = {
  generateToken,
  verifyToken,
  optionalToken,
  requireAdmin,
  requireCustomer,
  requireDeliveryStaff,
  requireAuth,
  authorizeCustomerAccess,
  JWT_SECRET,
};
