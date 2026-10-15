const express = require('express');
const router = express.Router();
const { login, register, getDeliveryAreas, getMe, verifyTokenStatus, getAllUsers } = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/register', register);
router.get('/delivery-areas', getDeliveryAreas);
router.get('/me', verifyToken, getMe);
router.get('/verify', verifyToken, verifyTokenStatus);
router.get('/users', verifyToken, requireAdmin, getAllUsers);

module.exports = router;
