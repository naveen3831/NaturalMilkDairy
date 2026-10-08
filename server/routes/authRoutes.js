const express = require('express');
const router = express.Router();
const { login, register, getMe, getAllUsers } = require('../controllers/authController');
const { verifyToken, optionalToken, requireAdmin } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/register', register);
router.get('/me', optionalToken, getMe);
router.get('/users', verifyToken, requireAdmin, getAllUsers);

module.exports = router;
