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
  upgradePlan,
  extendSubscription,
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
const { verifyToken, optionalToken, requireCustomer, requireAdmin, requireDeliveryStaff, authorizeCustomerAccess } = require('../middleware/authMiddleware');
const { createOrder, verifyPayment, failSubscription, getMySubscriptions } = require('../controllers/subscriptionController');

router.post('/me/subscription/order', optionalToken, createOrder);
router.post('/me/subscription/verify', optionalToken, verifyPayment);
router.post('/me/subscription/fail', optionalToken, failSubscription);
router.get('/me/subscriptions', optionalToken, getMySubscriptions);
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
const allowCustomerOrGuest = (req, res, next) => {
  if (req.user) {
    return authorizeCustomerAccess(req, res, next);
  }
  if (req.params.id === 'me' || req.body?.mobile) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Login or mobile number required.' });
};

router.post('/:id/upgrade-plan', optionalToken, allowCustomerOrGuest, upgradePlan);
router.post('/:id/extend-subscription', verifyToken, authorizeCustomerAccess, extendSubscription);
router.post('/me/subscription/upgrade', verifyToken, requireCustomer, (req, res, next) => { req.params.id = 'me'; return upgradePlan(req, res, next); });
router.post('/me/subscription/extend', verifyToken, requireCustomer, (req, res, next) => { req.params.id = 'me'; return extendSubscription(req, res, next); });
router.get('/:id/ledger', verifyToken, authorizeCustomerAccess, getCustomerLedger);
router.delete('/:id/history/:entryId', verifyToken, authorizeCustomerAccess, deleteCustomerHistoryEntry);
router.delete('/:id/history', verifyToken, authorizeCustomerAccess, clearCustomerHistory);
router.post('/:id/send-credentials', verifyToken, requireAdmin, sendCustomerCredentials);

module.exports = router;
