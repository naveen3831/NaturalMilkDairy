const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  updateOwnCustomerProfile,
  deleteOwnCustomerAccount,
  deleteCustomer,
  createCustomer,
  updateCustomer,
  assignPartner,
  pauseDelivery,
  resumeDelivery,
  setTemporaryQty,
  getCustomerLedger,
  sendCustomerCredentials,
  deleteCustomerHistoryEntry,
  clearCustomerHistory,
} = require('../controllers/customerController');
const { verifyToken, optionalToken, requireCustomer, requireAdmin, requireDeliveryStaff } = require('../middleware/authMiddleware');
const { createOrder, verifyPayment } = require('../controllers/subscriptionController');

router.post('/me/subscription/order', verifyToken, requireCustomer, createOrder);
router.post('/me/subscription/verify', verifyToken, requireCustomer, verifyPayment);
router.put('/me/profile', verifyToken, requireCustomer, updateOwnCustomerProfile);
router.delete('/me/account', verifyToken, deleteOwnCustomerAccount);
router.get('/', optionalToken, getCustomers);
router.get('/:id', optionalToken, getCustomerById);
router.post('/', verifyToken, requireDeliveryStaff, createCustomer);
router.put('/:id', verifyToken, requireDeliveryStaff, updateCustomer);
router.delete('/:id', verifyToken, requireDeliveryStaff, deleteCustomer);
router.put('/:id/assign-partner', verifyToken, requireAdmin, assignPartner);
router.post('/:id/pause', verifyToken, pauseDelivery);
router.post('/:id/resume', verifyToken, resumeDelivery);
router.post('/:id/temp-qty', verifyToken, setTemporaryQty);
router.get('/:id/ledger', optionalToken, getCustomerLedger);
router.delete('/:id/history/:entryId', verifyToken, requireAdmin, deleteCustomerHistoryEntry);
router.delete('/:id/history', verifyToken, requireAdmin, clearCustomerHistory);
router.post('/:id/send-credentials', verifyToken, requireAdmin, sendCustomerCredentials);

module.exports = router;
