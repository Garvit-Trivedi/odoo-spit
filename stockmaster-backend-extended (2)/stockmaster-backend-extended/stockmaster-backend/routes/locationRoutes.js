const express = require('express');
const {
  createLocation,
  getLocations,
  updateLocation
} = require('../controllers/locationController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router
  .route('/')
  .post(protect, authorize('admin', 'inventory_manager'), createLocation)
  .get(protect, getLocations);

router
  .route('/:id')
  .put(protect, authorize('admin', 'inventory_manager'), updateLocation);

module.exports = router;
