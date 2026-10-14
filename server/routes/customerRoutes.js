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
const { verifyToken, optionalToken, requireCustomer } = require('../middleware/authMiddleware');
const { createOrder, verifyPayment } = require('../controllers/subscriptionController');

router.post('/me/subscription/order', verifyToken, requireCustomer, createOrder);
router.post('/me/subscription/verify', verifyToken, requireCustomer, verifyPayment);
router.put('/me/profile', verifyToken, requireCustomer, updateOwnCustomerProfile);
router.delete('/me/account', optionalToken, deleteOwnCustomerAccount);
router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', optionalToken, deleteCustomer);
router.put('/:id/assign-partner', assignPartner);
router.post('/:id/pause', pauseDelivery);
router.post('/:id/resume', resumeDelivery);
router.post('/:id/temp-qty', setTemporaryQty);
router.get('/:id/ledger', getCustomerLedger);
router.delete('/:id/history/:entryId', deleteCustomerHistoryEntry);
router.delete('/:id/history', clearCustomerHistory);
router.post('/:id/send-credentials', sendCustomerCredentials);

module.exports = router;
