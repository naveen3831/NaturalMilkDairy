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
  getCustomerAddresses,
  addCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
} = require('../controllers/customerController');
const { verifyToken, requireCustomer, requireAdmin, requireDeliveryStaff, authorizeCustomerAccess } = require('../middleware/authMiddleware');
const { createOrder, verifyPayment } = require('../controllers/subscriptionController');

router.post('/me/subscription/order', verifyToken, requireCustomer, createOrder);
router.post('/me/subscription/verify', verifyToken, requireCustomer, verifyPayment);
router.put('/me/profile', verifyToken, requireCustomer, updateOwnCustomerProfile);
router.delete('/me/account', verifyToken, requireCustomer, deleteOwnCustomerAccount);

// Customer Delivery Addresses CRUD
router.get('/me/addresses', verifyToken, requireCustomer, getCustomerAddresses);
router.post('/me/addresses', verifyToken, requireCustomer, addCustomerAddress);
router.put('/me/addresses/:addressId', verifyToken, requireCustomer, updateCustomerAddress);
router.delete('/me/addresses/:addressId', verifyToken, requireCustomer, deleteCustomerAddress);
router.put('/me/addresses/:addressId/default', verifyToken, requireCustomer, setDefaultCustomerAddress);
router.get('/', verifyToken, requireAdmin, getCustomers);
router.get('/:id', verifyToken, authorizeCustomerAccess, getCustomerById);
router.post('/', verifyToken, requireDeliveryStaff, createCustomer);
router.put('/:id', verifyToken, requireDeliveryStaff, authorizeCustomerAccess, updateCustomer);
router.delete('/:id', verifyToken, requireAdmin, deleteCustomer);
router.put('/:id/assign-partner', verifyToken, requireAdmin, assignPartner);
router.post('/:id/pause', verifyToken, authorizeCustomerAccess, pauseDelivery);
router.post('/:id/resume', verifyToken, authorizeCustomerAccess, resumeDelivery);
router.post('/:id/temp-qty', verifyToken, authorizeCustomerAccess, setTemporaryQty);
router.get('/:id/ledger', verifyToken, authorizeCustomerAccess, getCustomerLedger);
router.delete('/:id/history/:entryId', verifyToken, authorizeCustomerAccess, deleteCustomerHistoryEntry);
router.delete('/:id/history', verifyToken, authorizeCustomerAccess, clearCustomerHistory);
router.post('/:id/send-credentials', verifyToken, requireAdmin, sendCustomerCredentials);

module.exports = router;
