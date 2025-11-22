const express = require('express');
const {
  createProduct,
  updateProduct,
  getProducts,
  getProduct,
  searchProducts
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router
  .route('/')
  .post(protect, authorize('inventory_manager', 'admin'), createProduct)
  .get(protect, getProducts);

router.get('/search', protect, searchProducts);

router
  .route('/:id')
  .get(protect, getProduct)
  .put(protect, authorize('inventory_manager', 'admin'), updateProduct);

module.exports = router;
