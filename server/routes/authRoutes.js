const express = require('express');
const router = express.Router();
const { login, register, getMe, getAllUsers } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', register);
router.get('/me', getMe);
router.get('/users', getAllUsers);

module.exports = router;
