const express = require('express');
const router = express.Router();
const { getProducts, updateProductPrice, addProduct } = require('../controllers/productController');

router.get('/', getProducts);
router.post('/', addProduct);
router.put('/:id/price', updateProductPrice);

module.exports = router;
