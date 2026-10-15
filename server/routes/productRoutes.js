const express = require('express');
const router = express.Router();
const {
  getProducts,
  updateProductPrice,
  addProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', getProducts);
router.post('/', verifyToken, requireAdmin, addProduct);
router.put('/:id', verifyToken, requireAdmin, updateProduct);
router.put('/:id/price', verifyToken, requireAdmin, updateProductPrice);
router.delete('/:id', verifyToken, requireAdmin, deleteProduct);

module.exports = router;
