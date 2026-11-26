const crypto = require('crypto');

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively sanitize objects in place to block NoSQL operator injection ($ne, $gt, $where, etc.)
 * and prototype pollution (__proto__, constructor, prototype).
 */
function sanitizeValue(value, depth = 0) {
  if (depth > 15 || value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      value[i] = sanitizeValue(value[i], depth + 1);
    }
    return value;
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (DANGEROUS_KEYS.has(key) || key.startsWith('$') || key.includes('\0')) {
        delete value[key];
        continue;
      }
      value[key] = sanitizeValue(value[key], depth + 1);
    }
  }
  return value;
}

/**
 * Express middleware to sanitize req.body, req.query, and req.params against NoSQL injection & prototype pollution.
 */
function sanitizeNoSqlMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') sanitizeValue(req.body);
  if (req.query && typeof req.query === 'object') sanitizeValue(req.query);
  if (req.params && typeof req.params === 'object') sanitizeValue(req.params);
  next();
}

/**
 * Escape special regex characters in user-supplied search strings to prevent ReDoS & regex injection.
 */
function escapeRegex(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate MongoDB ObjectId format cleanly.
 */
function isValidObjectId(id) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id.trim());
}

/**
 * Build strict Content-Security-Policy compatible with React, Leaflet, Google GSI, Razorpay, and Firebase Messaging.
 */
function buildCspHeader() {
  const directives = [
    "default-src 'self'",
    "script-src 'self' https://unpkg.com https://accounts.google.com https://checkout.razorpay.com https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://accounts.google.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://res.cloudinary.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://naturalmilkdairy.speshway.site https://naturalmilkdiary.onrender.com https://lh3.googleusercontent.com",
    "connect-src 'self' https://naturalmilkdairy.speshway.site wss://naturalmilkdairy.speshway.site https://naturalmilkdiary.onrender.com wss://naturalmilkdiary.onrender.com https://accounts.google.com https://www.googleapis.com https://nominatim.openstreetmap.org https://api.razorpay.com https://lumberjack.razorpay.com https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com",
    "frame-src 'self' https://accounts.google.com https://api.razorpay.com https://checkout.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
  ];
  return directives.join('; ');
}

const CSP_HEADER_VALUE = buildCspHeader();

/**
 * Helmet-equivalent HTTP security headers middleware.
 */
function securityHeadersMiddleware(req, res, next) {
  res.setHeader('Content-Security-Policy', CSP_HEADER_VALUE);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)');
  // Allow Google Sign-In / Razorpay popups while isolating cross-origin openers
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  // Allow cross-origin frontend (Vercel / custom domain) to load API responses & static assets
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  if (process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

const REDACTED_FIELDS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'token',
  'idtoken',
  'refreshtoken',
  'resettoken',
  'completiontoken',
  'otp',
  'authorization',
  'cookie',
  'secret',
  'key_secret',
  'razorpay_signature',
]);

function redactObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACTED_FIELDS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = redactObject(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Structured security event logger (never logs secrets, passwords, tokens, or Authorization headers).
 */
function logSecurityEvent(eventType, req, details = {}) {
  const safeDetails = redactObject(details);
  const entry = {
    ts: new Date().toISOString(),
    event: eventType,
    ip: req?.ip || req?.socket?.remoteAddress || 'unknown',
    method: req?.method || '',
    path: req?.originalUrl?.split('?')[0] || '',
    userId: req?.user?.id || null,
    role: req?.user?.role || null,
    ...safeDetails,
  };
  console.warn(`[SECURITY] ${JSON.stringify(entry)}`);
}

/**
 * Constant-time SHA-256 hash helper (for OTPs/tokens at rest).
 */
function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

module.exports = {
  sanitizeNoSqlMiddleware,
  securityHeadersMiddleware,
  escapeRegex,
  isValidObjectId,
  logSecurityEvent,
  sha256,
  CSP_HEADER_VALUE,
};
