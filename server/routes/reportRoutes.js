const express = require('express');
const router = express.Router();
const {
  getDashboardSummary,
  getPendingCreditReport,
  getCustomerStatement,
  getAuditLogs,
} = require('../controllers/reportController');

const { verifyToken, requireAdmin, authorizeCustomerAccess } = require('../middleware/authMiddleware');

router.get('/dashboard', verifyToken, requireAdmin, getDashboardSummary);
router.get('/pending-credit', verifyToken, requireAdmin, getPendingCreditReport);
router.get('/statement', verifyToken, authorizeCustomerAccess, getCustomerStatement);
router.get('/audit-logs', verifyToken, requireAdmin, getAuditLogs);

module.exports = router;
