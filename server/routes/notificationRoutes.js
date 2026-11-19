const express = require('express');
const router = express.Router();
const {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  clearAll,
  deleteNotification,
  registerFcmToken,
  unregisterFcmToken,
} = require('../controllers/notificationController');

const { verifyToken, optionalToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', optionalToken, getNotifications);
router.post('/', verifyToken, requireAdmin, createNotification);
router.post('/fcm-token', verifyToken, registerFcmToken);
router.delete('/fcm-token', verifyToken, unregisterFcmToken);
router.put('/:id/read', verifyToken, markAsRead);
router.put('/read-all', verifyToken, markAllAsRead);
router.delete('/clear-all', verifyToken, clearAll);
router.delete('/:id', verifyToken, deleteNotification);

module.exports = router;
