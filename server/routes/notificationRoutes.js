const express = require('express');
const router = express.Router();
const {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  clearAll,
  deleteNotification,
} = require('../controllers/notificationController');

const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getNotifications);
router.post('/', verifyToken, requireAdmin, createNotification);
router.put('/:id/read', verifyToken, markAsRead);
router.put('/read-all', verifyToken, markAllAsRead);
router.delete('/clear-all', verifyToken, clearAll);
router.delete('/:id', verifyToken, deleteNotification);

module.exports = router;
