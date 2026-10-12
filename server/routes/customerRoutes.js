const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  updateOwnCustomerProfile,
  deleteOwnCustomerAccount,
  createCustomer,
  updateCustomer,
  assignPartner,
  pauseDelivery,
  resumeDelivery,
  setTemporaryQty,
  getCustomerLedger,
  sendCustomerCredentials,
} = require('../controllers/customerController');
const { verifyToken, requireCustomer } = require('../middleware/authMiddleware');

router.put('/me/profile', verifyToken, requireCustomer, updateOwnCustomerProfile);
router.delete('/me/account', verifyToken, requireCustomer, deleteOwnCustomerAccount);
router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.put('/:id/assign-partner', assignPartner);
router.post('/:id/pause', pauseDelivery);
router.post('/:id/resume', resumeDelivery);
router.post('/:id/temp-qty', setTemporaryQty);
router.get('/:id/ledger', getCustomerLedger);
router.post('/:id/send-credentials', sendCustomerCredentials);

module.exports = router;
