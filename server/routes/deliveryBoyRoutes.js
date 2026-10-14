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
const { optionalToken } = require('../middleware/authMiddleware');

router.get('/', getDeliveryBoys);
router.post('/', addDeliveryBoy);
router.put('/:id', updateDeliveryBoy);
router.delete('/me/account', optionalToken, deleteDeliveryBoy);
router.delete('/:id', optionalToken, deleteDeliveryBoy);
router.post('/:id/reconcile', reconcileCash);
router.post('/:id/send-credentials', sendDeliveryBoyCredentials);

module.exports = router;
