const express = require('express');
const router = express.Router();
const {
  getDashboardSummary,
  getPendingCreditReport,
  getCustomerStatement,
  getAuditLogs,
} = require('../controllers/reportController');

router.get('/dashboard', getDashboardSummary);
router.get('/pending-credit', getPendingCreditReport);
router.get('/statement', getCustomerStatement);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
