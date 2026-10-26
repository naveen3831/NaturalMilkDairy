const express = require('express');
const router = express.Router();
const {
  getSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  sendChatMessage,
  getMyChats,
  deleteSupportTicket,
} = require('../controllers/supportController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');

const supportCreateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
  message: 'Too many support requests. Please wait before sending another.',
});

router.get('/', verifyToken, requireAdmin, getSupportTickets);
router.get('/my-chats', getMyChats);
router.post('/chat', sendChatMessage);
router.post('/', supportCreateLimiter, createSupportTicket);
router.put('/:id', verifyToken, requireAdmin, updateSupportTicket);
router.delete('/:id', verifyToken, requireAdmin, deleteSupportTicket);

module.exports = router;
