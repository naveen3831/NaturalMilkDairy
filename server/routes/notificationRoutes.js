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

const { optionalToken } = require('../middleware/authMiddleware');

router.get('/', optionalToken, getNotifications);
router.post('/', optionalToken, createNotification);
router.put('/:id/read', optionalToken, markAsRead);
router.put('/read-all', optionalToken, markAllAsRead);
router.delete('/clear-all', optionalToken, clearAll);
router.delete('/:id', optionalToken, deleteNotification);

module.exports = router;
