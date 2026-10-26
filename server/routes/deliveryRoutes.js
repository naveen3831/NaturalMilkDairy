const express = require('express');
const router = express.Router();
const {
  getDeliveries,
  getAssignedCustomers,
  markDelivered,
  markNotDelivered,
  batchSyncOfflineDeliveries,
  assignDelivery,
  deleteDeliveryForAdminAndDriver,
  getRecentDeliveryProofs,
} = require('../controllers/deliveryController');
const { verifyToken, requireDeliveryStaff, requireAdmin } = require('../middleware/authMiddleware');

router.get('/recent-proofs', getRecentDeliveryProofs);

router.get('/assigned-customers', verifyToken, requireDeliveryStaff, getAssignedCustomers);
router.get('/', verifyToken, requireDeliveryStaff, getDeliveries);
router.post('/:id/delivered', verifyToken, requireDeliveryStaff, markDelivered);
router.post('/:id/not-delivered', verifyToken, requireDeliveryStaff, markNotDelivered);
router.post('/offline-sync', verifyToken, requireDeliveryStaff, batchSyncOfflineDeliveries);
router.put('/:id/assign', verifyToken, requireAdmin, assignDelivery);
router.delete('/:id', verifyToken, requireAdmin, deleteDeliveryForAdminAndDriver);

module.exports = router;
