const express = require('express');
const { body, validationResult } = require('express-validator');
const Stock = require('../models/Stock');
const StockLedger = require('../models/StockLedger');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   PUT /api/stock/:id
// @desc    Update stock quantity
// @access  Private (Manager only)
router.put('/:id',
  authorize('inventory_manager'),
  [
    body('quantity').isFloat({ min: 0 }).withMessage('Valid quantity is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const stock = await Stock.findById(req.params.id).populate('product warehouse');
      if (!stock) {
        return res.status(404).json({ message: 'Stock not found' });
      }

      const oldQuantity = stock.quantity;
      const newQuantity = parseFloat(req.body.quantity);
      const difference = newQuantity - oldQuantity;

      // Update stock
      stock.quantity = newQuantity;
      stock.lastUpdated = new Date();
      await stock.save();

      // Create ledger entry
      await StockLedger.create({
        product: stock.product._id,
        warehouse: stock.warehouse._id,
        documentType: 'adjustment',
        documentNumber: `MANUAL-${Date.now()}`,
        quantity: difference,
        balance: newQuantity,
        reference: `Manual stock update by ${req.user.name}`,
        createdBy: req.user._id
      });

      res.json({ success: true, stock });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

module.exports = router;

