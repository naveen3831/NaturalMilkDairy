const express = require('express');
const router = express.Router();
const {
  recordPayment,
  getAllPayments,
  submitCashHandover,
  getCashHandovers,
  updateHandoverStatus,
  deleteCashHandover,
} = require('../controllers/paymentController');

const { verifyToken, requireAdmin, requireDeliveryStaff } = require('../middleware/authMiddleware');

router.get('/', verifyToken, requireAdmin, getAllPayments);
router.post('/', verifyToken, requireDeliveryStaff, recordPayment);

// Driver Cash Handover to Admin
router.post('/handover', verifyToken, requireDeliveryStaff, submitCashHandover);
router.get('/handovers', verifyToken, requireDeliveryStaff, getCashHandovers);
router.put('/handovers/:id/status', verifyToken, requireAdmin, updateHandoverStatus);
router.delete('/handovers/:id', verifyToken, requireAdmin, deleteCashHandover);

module.exports = router;
