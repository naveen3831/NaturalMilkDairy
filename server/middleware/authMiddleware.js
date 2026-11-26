const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const { findCustomerForRequest } = require('../services/customerLookupService');
const { logSecurityEvent } = require('../security/securityLogger');

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.error('[SECURITY WARNING] JWT_SECRET environment variable is not set! Using ephemeral runtime key — set JWT_SECRET in .env.');
  return crypto.randomBytes(32).toString('hex');
})();
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
    } else if (req.query && req.query.token) {
      token = String(req.query.token).trim();
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
      logSecurityEvent('AUTH_INVALID_TOKEN_CLAIMS', { ip: req.ip, method: req.method, path: req.originalUrl });
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
    logSecurityEvent(isExpired ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_REJECTED', {
      ip: req.ip,
      method: req.method,
      path: req.originalUrl,
      reason: err.name,
    });
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
    } else if (req.query && req.query.token) {
      token = String(req.query.token).trim();
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
    logSecurityEvent('RBAC_ADMIN_DENIED', req);
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Administrator privileges required.',
    });
  }
  next();
};

const requireCustomer = (req, res, next) => {
  if (!req.user || (req.user.role !== 'customer' && req.user.role !== 'user')) {
    logSecurityEvent('RBAC_CUSTOMER_DENIED', req);
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Customer account access is required.',
    });
  }
  next();
};

const requireDeliveryStaff = (req, res, next) => {
  if (!req.user || !['admin', 'delivery_boy'].includes(req.user.role)) {
    logSecurityEvent('RBAC_DELIVERY_DENIED', req);
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
  if (!requestedId || requestedId === 'me') return next();

  if (req.user?.role === 'delivery_boy') {
    try {
      const customer = await findCustomerForRequest(req);
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
      const identity = [req.user.id, req.user.boyId, req.user.mobile].filter(Boolean);
      const assignedIds = [
        customer.deliveryPlan?.deliveryBoyId,
        customer.deliveryBoyId,
      ].filter(Boolean);
      const assignedById = identity.some((id) => assignedIds.includes(id));
      const assignedByName = req.user.name && customer.deliveryPlan?.deliveryBoyName &&
        req.user.name.trim().toLowerCase() === customer.deliveryPlan.deliveryBoyName.trim().toLowerCase();
      const boyArea = (req.user.assignedArea || req.user.area || '').trim().toLowerCase();
      const custArea = (customer.area || customer.deliveryPlan?.route || '').trim().toLowerCase();
      const assignedByArea = Boolean(boyArea && custArea && (boyArea === custArea || custArea.includes(boyArea) || boyArea.includes(custArea)));

      if (assignedById || assignedByName || assignedByArea) return next();
      return res.status(403).json({ success: false, message: 'You can only access customers assigned to your route.' });
    } catch (error) {
      return next(error);
    }
  }

  if (['customer', 'user'].includes(req.user?.role)) {
    const cleanReq = String(requestedId).trim().toLowerCase();
    const uid = String(req.user.id || '').toLowerCase();
    const ucid = String(req.user.customerId || '').toLowerCase();
    const umob = String(req.user.mobile || '').replace(/\D/g, '').slice(-10);

    if (
      cleanReq === 'me' ||
      cleanReq === uid ||
      (ucid && cleanReq === ucid) ||
      (umob && cleanReq === umob)
    ) {
      return next();
    }

    try {
      const authedCust = await findCustomerForRequest({ user: req.user });
      if (authedCust) {
        const allowedKeys = [
          authedCust._id?.toString().toLowerCase(),
          (authedCust.customerId || '').toLowerCase(),
          (authedCust.mobile || '').replace(/\D/g, '').slice(-10),
        ].filter(Boolean);

        const targetDigits = cleanReq.replace(/\D/g, '').slice(-10);
        if (allowedKeys.includes(cleanReq) || (targetDigits.length === 10 && allowedKeys.includes(targetDigits))) {
          return next();
        }
      }
    } catch (_) {}
  }

  return res.status(403).json({
    success: false,
    message: 'You can only access your own customer account.',
  });
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
