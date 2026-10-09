const express = require('express');
const router = express.Router();
const {
  getDeliveries,
  markDelivered,
  markNotDelivered,
  batchSyncOfflineDeliveries,
  assignDelivery,
} = require('../controllers/deliveryController');

router.get('/', getDeliveries);
router.post('/:id/delivered', markDelivered);
router.post('/:id/not-delivered', markNotDelivered);
router.post('/offline-sync', batchSyncOfflineDeliveries);
router.put('/:id/assign', assignDelivery);

module.exports = router;
