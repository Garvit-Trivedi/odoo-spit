const express = require('express');
const {
  getStockValuation,
  getFastMovingItems,
  getOutOfStockHistory
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/valuation', protect, getStockValuation);
router.get('/fast-moving', protect, getFastMovingItems);
router.get('/out-of-stock-history/:productId', protect, getOutOfStockHistory);

module.exports = router;
