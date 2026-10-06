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
} = require('../controllers/customerController');

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.post('/:id/pause', pauseDelivery);
router.post('/:id/resume', resumeDelivery);
router.post('/:id/temp-qty', setTemporaryQty);
router.get('/:id/ledger', getCustomerLedger);

module.exports = router;
