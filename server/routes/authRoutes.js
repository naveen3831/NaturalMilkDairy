const express = require('express');
const router = express.Router();
const { login, register, getDeliveryAreas, getMe, verifyTokenStatus, getAllUsers } = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many sign-in attempts. Please wait and try again.',
});
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many registration attempts. Please wait and try again.',
});

router.post('/login', loginLimiter, login);
router.post('/register', registerLimiter, register);
router.get('/delivery-areas', getDeliveryAreas);
router.get('/me', verifyToken, getMe);
router.get('/verify', verifyToken, verifyTokenStatus);
router.get('/users', verifyToken, requireAdmin, getAllUsers);

module.exports = router;
