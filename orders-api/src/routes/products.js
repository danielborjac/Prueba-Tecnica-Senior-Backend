const express = require('express');
const router = express.Router();
const {
  createProduct,
  getProduct,
  searchProducts,
  updateProduct
} = require('../controllers/products');
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateSearchQuery,
  validateIdParam
} = require('../validators/products');

// Rutas de productos
router.post('/', validateCreateProduct, createProduct);
router.get('/', validateSearchQuery, searchProducts);
router.get('/:id', validateIdParam, getProduct);
router.patch('/:id', validateIdParam, validateUpdateProduct, updateProduct);

module.exports = router;