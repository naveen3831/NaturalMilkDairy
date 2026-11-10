const express = require('express');
const router = express.Router();
const {
  getPrimaryContactInfo,
  getAllContactInfos,
  getContactInfoById,
  createContactInfo,
  updatePrimaryContactInfo,
  updateContactInfoById,
  deleteContactInfo,
  resetContactInfo,
} = require('../controllers/contactInfoController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Public route to fetch current active contact details & social links
router.get('/', getPrimaryContactInfo);

// Admin-only management endpoints
router.get('/admin/all', verifyToken, requireAdmin, getAllContactInfos);
router.post('/', verifyToken, requireAdmin, createContactInfo);
router.put('/', verifyToken, requireAdmin, updatePrimaryContactInfo);
router.post('/reset', verifyToken, requireAdmin, resetContactInfo);

router.get('/:id', getContactInfoById);
router.put('/:id', verifyToken, requireAdmin, updateContactInfoById);
router.delete('/:id', verifyToken, requireAdmin, deleteContactInfo);

module.exports = router;
