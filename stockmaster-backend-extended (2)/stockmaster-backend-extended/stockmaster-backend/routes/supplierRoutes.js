const express = require('express');
const {
  createSupplier,
  getSuppliers,
  updateSupplier,
  getSupplierPerformance
} = require('../controllers/supplierController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, createSupplier).get(protect, getSuppliers);
router.put('/:id', protect, updateSupplier);
router.get('/:id/performance', protect, getSupplierPerformance);

module.exports = router;
