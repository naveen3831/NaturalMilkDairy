const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET is not configured in .env');
}

/**
 * Generate signed JWT token
 * @param {object} user - User payload
 * @param {string} expiresIn - Expiration duration (default 7 days)
 * @returns {string} - Signed JWT token
 */
const generateToken = (user, expiresIn = '7d') => {
  return jwt.sign(
    {
      id: user.id || user._id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      assignedArea: user.assignedArea || user.area,
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

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired JWT token. Please sign in again.',
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

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
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

module.exports = {
  generateToken,
  verifyToken,
  optionalToken,
  requireAdmin,
  JWT_SECRET,
};
