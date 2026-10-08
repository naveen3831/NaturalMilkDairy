const express = require('express');
const router = express.Router();
const {
  getProducts,
  updateProductPrice,
  addProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

router.get('/', getProducts);
router.post('/', addProduct);
router.put('/:id', updateProduct);
router.put('/:id/price', updateProductPrice);
router.delete('/:id', deleteProduct);

module.exports = router;
