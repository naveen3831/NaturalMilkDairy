const express = require('express');
const router = express.Router();
const {
  getBanners,
  getAllBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner,
} = require('../controllers/bannerController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', getBanners);
router.get('/admin', verifyToken, requireAdmin, getAllBannersAdmin);
router.post('/', verifyToken, requireAdmin, createBanner);
router.put('/:id', verifyToken, requireAdmin, updateBanner);
router.delete('/:id', verifyToken, requireAdmin, deleteBanner);

module.exports = router;
