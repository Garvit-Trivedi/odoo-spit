const express = require('express');
const { body, validationResult } = require('express-validator');
const Adjustment = require('../models/Adjustment');
const Product = require('../models/Product');
const Stock = require('../models/Stock');
const updateStock = require('../utils/updateStock');
const generateDocumentNumber = require('../utils/generateDocumentNumber');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   GET /api/adjustments
// @desc    Get all adjustments with filters
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { status, warehouse, startDate, endDate } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (warehouse) {
      query.warehouse = warehouse;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const adjustments = await Adjustment.find(query)
      .populate('warehouse', 'name location')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('items.product', 'name sku category unitOfMeasure')
      .sort({ createdAt: -1 });

    res.json({ success: true, adjustments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/adjustments/:id
// @desc    Get single adjustment
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const adjustment = await Adjustment.findById(req.params.id)
      .populate('warehouse', 'name location')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('items.product', 'name sku category unitOfMeasure');

    if (!adjustment) {
      return res.status(404).json({ message: 'Adjustment not found' });
    }

    res.json({ success: true, adjustment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/adjustments
// @desc    Create a new adjustment
// @access  Private (Staff only)
router.post('/',
  authorize('warehouse_staff'),
  [
  body('warehouse').notEmpty().withMessage('Warehouse is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').notEmpty().withMessage('Product is required for each item'),
  body('items.*.countedQuantity').isFloat({ min: 0 }).withMessage('Valid counted quantity is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { warehouse, items, notes, status } = req.body;

    // Get current stock and calculate differences
    const adjustmentItems = await Promise.all(
      items.map(async (item) => {
        const stock = await Stock.findOne({ product: item.product, warehouse });
        const recordedQuantity = stock ? stock.quantity : 0;
        const difference = item.countedQuantity - recordedQuantity;

        // Get unit price from product
        let unitPrice = 0;
        if (item.unitPrice) {
          unitPrice = item.unitPrice;
        } else {
          const product = await Product.findById(item.product);
          if (product) {
            unitPrice = product.costPrice || 0;
          }
        }

        return {
          product: item.product,
          recordedQuantity,
          countedQuantity: item.countedQuantity,
          difference,
          unitPrice,
          reason: item.reason || ''
        };
      })
    );

    // Generate adjustment number
    const count = await Adjustment.countDocuments();
    const adjustmentNumber = generateDocumentNumber('ADJ', count + 1);

    const adjustment = await Adjustment.create({
      adjustmentNumber,
      warehouse,
      items: adjustmentItems,
      notes,
      status: status || 'draft',
      createdBy: req.user._id
    });

    const populatedAdjustment = await Adjustment.findById(adjustment._id)
      .populate('warehouse', 'name location')
      .populate('items.product', 'name sku');

    res.status(201).json({ success: true, adjustment: populatedAdjustment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/adjustments/:id
// @desc    Update an adjustment
// @access  Private (Staff only)
router.put('/:id',
  authorize('warehouse_staff'),
  async (req, res) => {
  try {
    const adjustment = await Adjustment.findById(req.params.id);
    if (!adjustment) {
      return res.status(404).json({ message: 'Adjustment not found' });
    }

    if (adjustment.status === 'done') {
      return res.status(400).json({ message: 'Cannot update a validated adjustment' });
    }

    // Recalculate differences if items are updated
    if (req.body.items) {
      const adjustmentItems = await Promise.all(
        req.body.items.map(async (item) => {
          const stock = await Stock.findOne({ product: item.product, warehouse: adjustment.warehouse });
          const recordedQuantity = stock ? stock.quantity : 0;
          const difference = item.countedQuantity - recordedQuantity;

          return {
            product: item.product,
            recordedQuantity,
            countedQuantity: item.countedQuantity,
            difference,
            reason: item.reason || ''
          };
        })
      );
      req.body.items = adjustmentItems;
    }

    Object.assign(adjustment, req.body);
    adjustment.updatedAt = new Date();
    await adjustment.save();

    const populatedAdjustment = await Adjustment.findById(adjustment._id)
      .populate('warehouse', 'name location')
      .populate('items.product', 'name sku');

    res.json({ success: true, adjustment: populatedAdjustment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/adjustments/:id/validate
// @desc    Validate adjustment and update stock
// @access  Private (Staff only)
router.post('/:id/validate',
  authorize('warehouse_staff'),
  async (req, res) => {
  try {
    const adjustment = await Adjustment.findById(req.params.id);
    if (!adjustment) {
      return res.status(404).json({ message: 'Adjustment not found' });
    }

    if (adjustment.status === 'done') {
      return res.status(400).json({ message: 'Adjustment already validated' });
    }

    // Validate adjustment has items
    if (!adjustment.items || adjustment.items.length === 0) {
      return res.status(400).json({ message: 'Adjustment has no items' });
    }

    // Convert warehouse to string
    let warehouseId;
    try {
      warehouseId = adjustment.warehouse._id ? adjustment.warehouse._id.toString() : 
                   (adjustment.warehouse.toString ? adjustment.warehouse.toString() : String(adjustment.warehouse));
    } catch (err) {
      return res.status(400).json({ message: 'Error processing warehouse: ' + err.message });
    }

    // Update stock for each item based on difference
    for (let i = 0; i < adjustment.items.length; i++) {
      const item = adjustment.items[i];
      
      if (!item || !item.product) {
        return res.status(400).json({ message: `Adjustment item ${i + 1} is missing product` });
      }

      // Convert product to string
      let productId;
      try {
        productId = item.product._id ? item.product._id.toString() : 
                   (item.product.toString ? item.product.toString() : String(item.product));
        if (!productId || productId === 'undefined' || productId === 'null' || productId === '') {
          return res.status(400).json({ message: `Invalid product ID in adjustment item ${i + 1}` });
        }
      } catch (err) {
        return res.status(400).json({ message: `Error processing product in item ${i + 1}: ${err.message}` });
      }

      const difference = Number(item.difference);
      if (isNaN(difference)) {
        return res.status(400).json({ message: `Invalid difference for product ${productId} in item ${i + 1}` });
      }

      if (difference !== 0) {
        await updateStock(
          productId,
          warehouseId,
          difference,
          'adjustment',
          adjustment.adjustmentNumber,
          adjustment._id.toString(),
          req.user._id.toString(),
          `Adjustment: ${item.reason || 'Stock count correction'}`
        );
      }
    }

    // Update adjustment status
    adjustment.status = 'done';
    adjustment.validatedBy = req.user._id;
    adjustment.validatedAt = new Date();
    await adjustment.save();

    const populatedAdjustment = await Adjustment.findById(adjustment._id)
      .populate('warehouse', 'name location')
      .populate('items.product', 'name sku')
      .populate('validatedBy', 'name email');

    res.json({ success: true, adjustment: populatedAdjustment });
  } catch (error) {
    console.error('Error validating adjustment:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error while validating adjustment', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   DELETE /api/adjustments/:id
// @desc    Delete an adjustment
// @access  Private (Staff only)
router.delete('/:id',
  authorize('warehouse_staff'), async (req, res) => {
  try {
    const adjustment = await Adjustment.findById(req.params.id);
    if (!adjustment) {
      return res.status(404).json({ message: 'Adjustment not found' });
    }

    if (adjustment.status === 'done') {
      return res.status(400).json({ message: 'Cannot delete a validated adjustment' });
    }

    await adjustment.deleteOne();
    res.json({ success: true, message: 'Adjustment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

