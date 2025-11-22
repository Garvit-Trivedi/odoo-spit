const express = require('express');
const StockLedger = require('../models/StockLedger');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   GET /api/ledger
// @desc    Get stock ledger with filters
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { product, warehouse, documentType, startDate, endDate, limit = 100 } = req.query;
    const query = {};

    if (product) {
      query.product = product;
    }

    if (warehouse) {
      query.warehouse = warehouse;
    }

    if (documentType) {
      query.documentType = documentType;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const ledger = await StockLedger.find(query)
      .populate('product', 'name sku unitOfMeasure')
      .populate('warehouse', 'name location')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, ledger, count: ledger.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/ledger/product/:productId
// @desc    Get ledger for a specific product
// @access  Private
router.get('/product/:productId', async (req, res) => {
  try {
    const { warehouse, startDate, endDate } = req.query;
    const query = { product: req.params.productId };

    if (warehouse) {
      query.warehouse = warehouse;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const ledger = await StockLedger.find(query)
      .populate('warehouse', 'name location')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, ledger, count: ledger.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

