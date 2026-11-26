const express = require('express');
const router = express.Router();
const {
  login,
  register,
  googleLogin,
  checkEmail,
  getDeliveryAreas,
  getMe,
  verifyTokenStatus,
  getAllUsers,
  forgotPasswordSendOtp,
  forgotPasswordVerifyOtp,
  forgotPasswordResetPassword,
  forgotPasswordResendOtp,
} = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many sign-in attempts. Please wait and try again.',
});
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many registration attempts. Please wait and try again.',
});
const otpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many OTP requests. Please wait a few minutes before trying again.',
});

router.post('/login', loginLimiter, login);
router.post('/register', registerLimiter, register);
router.post('/google', loginLimiter, googleLogin);
router.post('/check-email', otpLimiter, checkEmail);
router.get('/check-email', otpLimiter, checkEmail);
router.get('/delivery-areas', getDeliveryAreas);
router.get('/me', verifyToken, getMe);
router.get('/verify', verifyToken, verifyTokenStatus);
router.get('/users', verifyToken, requireAdmin, getAllUsers);

// Forgot Password with Email OTP Verification flow
router.post('/forgot-password/send-otp', otpLimiter, forgotPasswordSendOtp);
router.post('/forgot-password/verify-otp', otpLimiter, forgotPasswordVerifyOtp);
router.post('/forgot-password/reset-password', otpLimiter, forgotPasswordResetPassword);
router.post('/forgot-password/resend-otp', otpLimiter, forgotPasswordResendOtp);

// Friendly aliases for all server environments
router.post('/forgot-password', otpLimiter, forgotPasswordSendOtp);
router.post('/send-otp', otpLimiter, forgotPasswordSendOtp);
router.post('/resend-otp', otpLimiter, forgotPasswordResendOtp);
router.post('/verify-otp', otpLimiter, forgotPasswordVerifyOtp);
router.post('/reset-password', otpLimiter, forgotPasswordResetPassword);
router.post('/forgot-password/verify', otpLimiter, forgotPasswordVerifyOtp);
router.post('/forgot-password/reset', otpLimiter, forgotPasswordResetPassword);

module.exports = router;
