const express = require('express');
const router = express.Router();
const {
  getAdminSubscriptions,
  getMySubscriptions,
  toggleSubscriptionStatus,
  failSubscription,
} = require('../controllers/subscriptionController');
const { verifyToken, optionalToken, requireAdmin, requireCustomer, requireDeliveryStaff } = require('../middleware/authMiddleware');

router.get('/my', optionalToken, getMySubscriptions);
router.post('/fail', optionalToken, failSubscription);
router.get('/', verifyToken, requireDeliveryStaff, getAdminSubscriptions);
router.post('/:id/toggle-status', verifyToken, requireAdmin, toggleSubscriptionStatus);
router.post('/:id/stop', verifyToken, requireCustomer, (req, res) => {
  req.body = req.body || {};
  req.body.action = 'stop';
  return toggleSubscriptionStatus(req, res);
});
router.post('/:id/start', verifyToken, requireCustomer, (req, res) => {
  req.body = req.body || {};
  req.body.action = 'start';
  return toggleSubscriptionStatus(req, res);
});

module.exports = router;
