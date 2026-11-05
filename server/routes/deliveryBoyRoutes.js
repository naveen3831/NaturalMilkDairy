const express = require('express');
const router = express.Router();
const {
  getDeliveryBoys,
  addDeliveryBoy,
  updateDeliveryBoy,
  deleteDeliveryBoy,
  reconcileCash,
  sendDeliveryBoyCredentials,
  toggleDutyStatus,
} = require('../controllers/deliveryBoyController');
const { verifyToken, optionalToken, requireAdmin, requireDeliveryStaff } = require('../middleware/authMiddleware');

router.post('/duty-status', optionalToken, toggleDutyStatus);
router.post('/:id/duty-status', optionalToken, toggleDutyStatus);
router.get('/', verifyToken, requireDeliveryStaff, getDeliveryBoys);
router.post('/', verifyToken, requireAdmin, addDeliveryBoy);
router.put('/:id', verifyToken, requireAdmin, updateDeliveryBoy);
router.delete('/me/account', verifyToken, requireAdmin, deleteDeliveryBoy);
router.delete('/:id', verifyToken, requireAdmin, deleteDeliveryBoy);
router.post('/:id/reconcile', verifyToken, requireAdmin, reconcileCash);
router.post('/:id/send-credentials', verifyToken, requireAdmin, sendDeliveryBoyCredentials);

module.exports = router;
