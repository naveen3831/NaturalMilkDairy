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
  updateMyProfile,
} = require('../controllers/deliveryBoyController');
const { verifyToken, requireAdmin, requireDeliveryStaff } = require('../middleware/authMiddleware');

router.put('/me', verifyToken, requireDeliveryStaff, updateMyProfile);
router.put('/profile', verifyToken, requireDeliveryStaff, updateMyProfile);
router.post('/duty-status', verifyToken, requireDeliveryStaff, toggleDutyStatus);
router.post('/:id/duty-status', verifyToken, requireDeliveryStaff, toggleDutyStatus);
router.get('/', verifyToken, requireDeliveryStaff, getDeliveryBoys);
router.post('/', verifyToken, requireAdmin, addDeliveryBoy);
router.put('/:id', verifyToken, requireAdmin, updateDeliveryBoy);
router.delete('/me/account', verifyToken, requireAdmin, deleteDeliveryBoy);
router.delete('/:id', verifyToken, requireAdmin, deleteDeliveryBoy);
router.post('/:id/reconcile', verifyToken, requireAdmin, reconcileCash);
router.post('/:id/send-credentials', verifyToken, requireAdmin, sendDeliveryBoyCredentials);

module.exports = router;
