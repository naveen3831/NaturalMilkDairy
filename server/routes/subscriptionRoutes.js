const express = require('express');
const router = express.Router();
const {
  getAdminSubscriptions,
  getMySubscriptions,
  toggleSubscriptionStatus,
} = require('../controllers/subscriptionController');
const { verifyToken, requireAdmin, requireCustomer } = require('../middleware/authMiddleware');

router.get('/my', verifyToken, requireCustomer, getMySubscriptions);
router.get('/', verifyToken, requireAdmin, getAdminSubscriptions);
router.post('/:id/toggle-status', verifyToken, toggleSubscriptionStatus);
router.post('/:id/stop', verifyToken, (req, res) => {
  req.body = req.body || {};
  req.body.action = 'stop';
  return toggleSubscriptionStatus(req, res);
});
router.post('/:id/start', verifyToken, (req, res) => {
  req.body = req.body || {};
  req.body.action = 'start';
  return toggleSubscriptionStatus(req, res);
});

module.exports = router;

