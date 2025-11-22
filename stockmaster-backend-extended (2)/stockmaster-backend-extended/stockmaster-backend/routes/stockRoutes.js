const express = require('express');
const {
  getStockSummary,
  getLowStockAlerts
} = require('../controllers/stockController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', protect, getStockSummary);
router.get('/alerts/low-stock', protect, getLowStockAlerts);

module.exports = router;
