/**
 * Automated Defensive Security Verification Suite
 * Tests security controls in isolation without modifying database data or credentials.
 */
const assert = require('assert');
const path = require('path');
const jwt = require('jsonwebtoken');

// Load server .env without printing any values
require('dotenv').config({ path: path.join(__dirname, '../.env') });
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_only_ephemeral_jwt_secret_for_unit_tests';
}

const {
  sanitizeNoSqlMiddleware,
  securityHeadersMiddleware,
  escapeRegex,
  sha256,
  CSP_HEADER_VALUE,
} = require('../middleware/securityMiddleware');
const {
  verifyToken,
  requireAdmin,
  requireCustomer,
  requireDeliveryStaff,
  JWT_SECRET,
} = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');
const { verifyFirebaseIdToken } = require('../security/firebaseVerifier');
const { ensureCloudinaryUrl } = require('../config/cloudinary');

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

async function runTests() {
  let passed = 0;
  const test = async (name, fn) => {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  };

  console.log('\nRunning Natural Milk Dairy Security Test Suite...\n');

  await test('Security headers middleware sets CSP, nosniff, X-Frame-Options, Referrer-Policy, COOP/CORP', () => {
    const req = { secure: true, headers: {} };
    const res = createMockRes();
    let called = false;
    securityHeadersMiddleware(req, res, () => {
      called = true;
    });
    assert.strictEqual(called, true);
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(res.headers['x-frame-options'], 'DENY');
    assert.strictEqual(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert.strictEqual(res.headers['cross-origin-opener-policy'], 'same-origin-allow-popups');
    assert.strictEqual(res.headers['cross-origin-resource-policy'], 'cross-origin');
    assert.ok(res.headers['content-security-policy'].includes("object-src 'none'"));
    assert.ok(res.headers['content-security-policy'].includes("frame-ancestors 'none'"));
    assert.ok(!CSP_HEADER_VALUE.includes('unsafe-eval'));
  });

  await test('NoSQL sanitization strips $ne, $where, $gt and __proto__/constructor keys', () => {
    const protoPayload = JSON.parse('{"email":{"$ne":""},"__proto__":{"isAdmin":true},"nested":{"$gt":0,"ok":"yes"}}');
    const req = {
      body: protoPayload,
      query: { search: { $regex: '.*' }, page: '1' },
      params: { id: '123' },
    };
    const res = createMockRes();
    sanitizeNoSqlMiddleware(req, res, () => {});
    assert.strictEqual(req.body.email.$ne, undefined);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(req.body, '__proto__'), false);
    assert.strictEqual(req.body.nested.$gt, undefined);
    assert.strictEqual(req.body.nested.ok, 'yes');
    assert.strictEqual(req.query.search.$regex, undefined);
    assert.strictEqual(req.query.page, '1');
  });

  await test('escapeRegex escapes regex metacharacters to prevent ReDoS', () => {
    const escaped = escapeRegex('admin.*+(a+)+$');
    assert.strictEqual(escaped.includes('.*'), false);
    assert.doesNotThrow(() => new RegExp(escaped));
  });

  await test('verifyToken rejects missing, malformed, alg:none, and expired JWTs', () => {
    const nextFail = () => { throw new Error('Should not call next'); };

    // Missing token
    const resMissing = createMockRes();
    verifyToken({ headers: {} }, resMissing, nextFail);
    assert.strictEqual(resMissing.statusCode, 401);

    // Malformed token
    const resBad = createMockRes();
    verifyToken({ headers: { authorization: 'Bearer not.a.jwt' } }, resBad, nextFail);
    assert.strictEqual(resBad.statusCode, 401);

    // Unsigned alg:none token
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: '1', role: 'admin' })).toString('base64url');
    const resNone = createMockRes();
    verifyToken({ headers: { authorization: `Bearer ${header}.${payload}.` } }, resNone, nextFail);
    assert.strictEqual(resNone.statusCode, 401);

    // Expired token
    const expired = jwt.sign({ id: '1', role: 'customer' }, JWT_SECRET, { expiresIn: -10, algorithm: 'HS256' });
    const resExp = createMockRes();
    verifyToken({ headers: { authorization: `Bearer ${expired}` } }, resExp, nextFail);
    assert.strictEqual(resExp.statusCode, 401);
    assert.strictEqual(resExp.body.code, 'TOKEN_EXPIRED');
  });

  await test('RBAC middlewares reject unauthorized roles with 403', () => {
    const nextFail = () => { throw new Error('Should not call next'); };

    const resAdmin = createMockRes();
    requireAdmin({ user: { id: '1', role: 'customer' } }, resAdmin, nextFail);
    assert.strictEqual(resAdmin.statusCode, 403);

    const resStaff = createMockRes();
    requireDeliveryStaff({ user: { id: '1', role: 'customer' } }, resStaff, nextFail);
    assert.strictEqual(resStaff.statusCode, 403);

    const resCust = createMockRes();
    requireCustomer({ user: { id: '1', role: 'delivery_boy' } }, resCust, nextFail);
    assert.strictEqual(resCust.statusCode, 403);
  });

  await test('verifyFirebaseIdToken rejects in-page bypass strings and unverified tokens', async () => {
    await assert.rejects(() => verifyFirebaseIdToken('google_in_page_verified'));
    await assert.rejects(() => verifyFirebaseIdToken('in_page_google_12345'));
    const fakeJwt = jwt.sign({ email: 'victim@example.com', iss: 'https://accounts.google.com' }, 'wrong_secret');
    await assert.rejects(() => verifyFirebaseIdToken(fakeJwt));
  });

  await test('ensureCloudinaryUrl blocks SSRF URLs, SVG data URIs, and path traversal', async () => {
    await assert.rejects(() => ensureCloudinaryUrl('http://169.254.169.254/latest/meta-data/'));
    await assert.rejects(() => ensureCloudinaryUrl('http://127.0.0.1:5000/api/health'));
    await assert.rejects(() => ensureCloudinaryUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='));
    await assert.rejects(() => ensureCloudinaryUrl('/../../server/.env'));
    await assert.rejects(() => ensureCloudinaryUrl('/images/../../server/.env'));
  });

  await test('Rate limiter enforces maxRequests and returns HTTP 429', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2, message: 'Too many' });
    const req = { ip: '10.0.0.1', socket: {} };
    let nextCalls = 0;
    limiter(req, createMockRes(), () => { nextCalls += 1; });
    limiter(req, createMockRes(), () => { nextCalls += 1; });
    const resBlocked = createMockRes();
    limiter(req, resBlocked, () => { nextCalls += 1; });
    assert.strictEqual(nextCalls, 2);
    assert.strictEqual(resBlocked.statusCode, 429);
  });

  await test('sha256 produces deterministic hex digest for OTP/token hashing', () => {
    const h1 = sha256('123456');
    const h2 = sha256('123456');
    assert.strictEqual(h1, h2);
    assert.strictEqual(h1.length, 64);
    assert.notStrictEqual(h1, '123456');
  });

  console.log(`\nAll ${passed} security tests passed.\n`);
}

runTests().catch((err) => {
  console.error('Security test failed:', err);
  process.exit(1);
});
