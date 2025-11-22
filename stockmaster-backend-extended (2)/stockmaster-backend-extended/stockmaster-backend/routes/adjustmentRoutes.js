const express = require('express');
const {
  createAdjustment,
  getAdjustments,
  validateAdjustment
} = require('../controllers/adjustmentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router
  .route('/')
  .post(protect, createAdjustment)
  .get(protect, getAdjustments);

router.post('/:id/validate', protect, validateAdjustment);

module.exports = router;
