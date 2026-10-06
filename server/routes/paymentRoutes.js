const express = require('express');
const router = express.Router();
const { recordPayment, getAllPayments } = require('../controllers/paymentController');

router.get('/', getAllPayments);
router.post('/', recordPayment);

module.exports = router;
