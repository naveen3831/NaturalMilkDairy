const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  pauseDelivery,
  resumeDelivery,
  setTemporaryQty,
  getCustomerLedger,
  sendCustomerCredentials,
} = require('../controllers/customerController');

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.post('/:id/pause', pauseDelivery);
router.post('/:id/resume', resumeDelivery);
router.post('/:id/temp-qty', setTemporaryQty);
router.get('/:id/ledger', getCustomerLedger);
router.post('/:id/send-credentials', sendCustomerCredentials);

module.exports = router;
