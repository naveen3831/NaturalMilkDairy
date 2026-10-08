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

router.get('/', getDeliveryBoys);
router.post('/', addDeliveryBoy);
router.put('/:id', updateDeliveryBoy);
router.delete('/:id', deleteDeliveryBoy);
router.post('/:id/reconcile', reconcileCash);
router.post('/:id/send-credentials', sendDeliveryBoyCredentials);

module.exports = router;
