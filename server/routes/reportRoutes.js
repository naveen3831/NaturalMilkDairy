const express = require('express');
const router = express.Router();
const {
  getDashboardSummary,
  getPendingCreditReport,
  getCustomerStatement,
  getAuditLogs,
  downloadCustomerPdf,
  downloadPartnerPdf,
  downloadAdminPdf,
  downloadAllCustomersPdf,
} = require('../controllers/reportController');

const {
  verifyToken,
  requireAdmin,
  requireDeliveryStaff,
  authorizeCustomerAccess,
} = require('../middleware/authMiddleware');

router.get('/dashboard', verifyToken, requireAdmin, getDashboardSummary);
router.get('/pending-credit', verifyToken, requireAdmin, getPendingCreditReport);
router.get('/statement', verifyToken, authorizeCustomerAccess, getCustomerStatement);
router.get('/audit-logs', verifyToken, requireAdmin, getAuditLogs);

// PDF Report Downloads (Weekly / Monthly / Entire History)
router.get('/customer/pdf', verifyToken, downloadCustomerPdf);
router.get('/partner/pdf', verifyToken, requireDeliveryStaff, downloadPartnerPdf);
router.get('/admin/pdf', verifyToken, requireAdmin, downloadAdminPdf);
router.get('/all-customers/pdf', verifyToken, requireAdmin, downloadAllCustomersPdf);

module.exports = router;
