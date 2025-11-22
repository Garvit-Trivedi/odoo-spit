const express = require('express');
const {
  createWarehouse,
  getWarehouses,
  updateWarehouse
} = require('../controllers/warehouseController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router
  .route('/')
  .post(protect, authorize('admin'), createWarehouse)
  .get(protect, getWarehouses);

router
  .route('/:id')
  .put(protect, authorize('admin'), updateWarehouse);

module.exports = router;
