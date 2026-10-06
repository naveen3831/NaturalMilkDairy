const express = require('express');
const router = express.Router();
const { getDeliveryBoys, addDeliveryBoy, reconcileCash } = require('../controllers/deliveryBoyController');

router.get('/', getDeliveryBoys);
router.post('/', addDeliveryBoy);
router.post('/:id/reconcile', reconcileCash);

module.exports = router;
