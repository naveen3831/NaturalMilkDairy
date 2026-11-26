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

router.post('/me/subscription/order', verifyToken, createOrder);
router.post('/me/subscription/verify', verifyToken, verifyPayment);
router.post('/me/subscription/fail', verifyToken, failSubscription);
router.get('/me/subscriptions', verifyToken, getMySubscriptions);
router.put('/me/profile', verifyToken, requireCustomer, updateOwnCustomerProfile);
const allowAuthenticatedSelf = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in.',
    });
  }
  next();
};

router.delete('/me/account', verifyToken, allowAuthenticatedSelf, deleteOwnCustomerAccount);
router.delete('/me', verifyToken, allowAuthenticatedSelf, deleteOwnCustomerAccount);

// Customer Delivery Addresses CRUD
router.get('/me/addresses', verifyToken, requireCustomer, getCustomerAddresses);
router.post('/me/addresses', verifyToken, requireCustomer, addCustomerAddress);
router.put('/me/addresses/:addressId', verifyToken, requireCustomer, updateCustomerAddress);
router.delete('/me/addresses/:addressId', verifyToken, requireCustomer, deleteCustomerAddress);
router.put('/me/addresses/:addressId/default', verifyToken, requireCustomer, setDefaultCustomerAddress);
router.get('/', verifyToken, requireDeliveryStaff, getCustomers);
router.get('/:id', verifyToken, authorizeCustomerAccess, getCustomerById);
router.post('/', verifyToken, requireDeliveryStaff, createCustomer);
router.put('/:id', verifyToken, requireDeliveryStaff, authorizeCustomerAccess, updateCustomer);
router.delete('/:id', verifyToken, (req, res, next) => {
  if (req.params.id === 'me' || req.params.id === 'account') {
    return deleteOwnCustomerAccount(req, res, next);
  }
  if (req.user?.role === 'admin') {
    return deleteCustomer(req, res, next);
  }
  return authorizeCustomerAccess(req, res, (err) => {
    if (err) return next(err);
    return deleteCustomer(req, res, next);
  });
});
router.put('/:id/assign-partner', verifyToken, requireAdmin, assignPartner);
router.post('/:id/pause', verifyToken, authorizeCustomerAccess, pauseDelivery);
router.post('/:id/resume', verifyToken, authorizeCustomerAccess, resumeDelivery);
router.post('/:id/temp-qty', verifyToken, authorizeCustomerAccess, setTemporaryQty);
router.post('/:id/upgrade-plan', verifyToken, authorizeCustomerAccess, upgradePlan);
router.post('/:id/extend-subscription', verifyToken, authorizeCustomerAccess, extendSubscription);
router.post('/me/subscription/upgrade', verifyToken, requireCustomer, (req, res, next) => { req.params.id = 'me'; return upgradePlan(req, res, next); });
router.post('/me/subscription/extend', verifyToken, requireCustomer, (req, res, next) => { req.params.id = 'me'; return extendSubscription(req, res, next); });
router.get('/:id/ledger', verifyToken, authorizeCustomerAccess, getCustomerLedger);
router.delete('/:id/history/:entryId', verifyToken, authorizeCustomerAccess, deleteCustomerHistoryEntry);
router.delete('/:id/history', verifyToken, authorizeCustomerAccess, clearCustomerHistory);
router.post('/:id/send-credentials', verifyToken, requireAdmin, sendCustomerCredentials);

module.exports = router;
