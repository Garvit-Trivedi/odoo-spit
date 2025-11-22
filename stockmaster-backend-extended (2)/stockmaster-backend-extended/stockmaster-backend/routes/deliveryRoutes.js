const express = require('express');
const {
  createDeliveryOrder,
  getDeliveryOrders,
  validateDeliveryOrder
} = require('../controllers/deliveryController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router
  .route('/')
  .post(protect, createDeliveryOrder)
  .get(protect, getDeliveryOrders);

router.post('/:id/validate', protect, validateDeliveryOrder);

module.exports = router;
