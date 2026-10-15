const express = require('express');
const router = express.Router();
const {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} = require('../controllers/locationController');
const { verifyToken, requireAdmin, optionalToken } = require('../middleware/authMiddleware');

// Get serviceable locations (public/customer/partner gets active; admin gets all)
router.get('/', optionalToken, getLocations);

// Admin-only CRUD
router.post('/', verifyToken, requireAdmin, createLocation);
router.put('/:id', verifyToken, requireAdmin, updateLocation);
router.delete('/:id', verifyToken, requireAdmin, deleteLocation);

module.exports = router;
