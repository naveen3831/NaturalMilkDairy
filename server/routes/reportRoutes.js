const express = require('express');
const router = express.Router();
const {
  getDashboardSummary,
  getPendingCreditReport,
  getCustomerStatement,
  getAuditLogs,
  getReportAnalytics,
  downloadCustomerPdf,
  downloadPartnerPdf,
  downloadAdminPdf,
  downloadAllCustomersPdf,
} = require('../controllers/reportController');

const {
  verifyToken,
  optionalToken,
  requireAdmin,
  requireDeliveryStaff,
  authorizeCustomerAccess,
} = require('../middleware/authMiddleware');

router.get('/dashboard', verifyToken, requireAdmin, getDashboardSummary);
router.get('/analytics', verifyToken, getReportAnalytics);
router.get('/pending-credit', verifyToken, requireAdmin, getPendingCreditReport);
router.get('/statement', verifyToken, authorizeCustomerAccess, getCustomerStatement);
router.get('/audit-logs', verifyToken, requireAdmin, getAuditLogs);

// PDF Report Downloads (Weekly / Monthly / Entire History / Custom Range)
// Uses optionalToken so direct browser download / links work with query parameters or session auth
router.get('/customer/pdf', optionalToken, downloadCustomerPdf);
router.get('/partner/pdf', optionalToken, downloadPartnerPdf);
router.get('/admin/pdf', optionalToken, downloadAdminPdf);
router.get('/all-customers/pdf', optionalToken, downloadAllCustomersPdf);
router.get('/all/pdf', optionalToken, downloadAllCustomersPdf);
router.get('/pdf', optionalToken, downloadAllCustomersPdf);

module.exports = router;
