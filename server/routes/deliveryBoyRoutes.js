const express = require('express');
const router = express.Router();
const {
  getDeliveryBoys,
  addDeliveryBoy,
  updateDeliveryBoy,
  deleteDeliveryBoy,
  reconcileCash,
  sendDeliveryBoyCredentials,
} = require('../controllers/deliveryBoyController');
const { verifyToken, optionalToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', optionalToken, getDeliveryBoys);
router.post('/', verifyToken, requireAdmin, addDeliveryBoy);
router.put('/:id', verifyToken, requireAdmin, updateDeliveryBoy);
router.delete('/me/account', verifyToken, deleteDeliveryBoy);
router.delete('/:id', verifyToken, requireAdmin, deleteDeliveryBoy);
router.post('/:id/reconcile', verifyToken, requireAdmin, reconcileCash);
router.post('/:id/send-credentials', verifyToken, requireAdmin, sendDeliveryBoyCredentials);

module.exports = router;
