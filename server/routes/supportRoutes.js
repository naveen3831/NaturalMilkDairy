const express = require('express');
const router = express.Router();
const {
  getSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
} = require('../controllers/supportController');
const { optionalToken } = require('../middleware/authMiddleware');

router.get('/', optionalToken, getSupportTickets);
router.post('/', optionalToken, createSupportTicket);
router.put('/:id', optionalToken, updateSupportTicket);
router.delete('/:id', optionalToken, deleteSupportTicket);

module.exports = router;
