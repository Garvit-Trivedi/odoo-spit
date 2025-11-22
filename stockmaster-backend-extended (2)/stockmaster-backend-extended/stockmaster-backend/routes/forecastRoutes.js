const express = require('express');
const {
  getConsumptionHistory,
  getBasicForecast,
  getSlowDeadStock,
  getStockTurnover
} = require('../controllers/forecastController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/consumption/:productId', protect, getConsumptionHistory);
router.get('/basic/:productId', protect, getBasicForecast);
router.get('/slow-dead', protect, getSlowDeadStock);
router.get('/turnover/:productId', protect, getStockTurnover);

module.exports = router;
