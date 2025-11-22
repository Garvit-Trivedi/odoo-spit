const express = require('express');
const { body, validationResult } = require('express-validator');
const Receipt = require('../models/Receipt');
const Product = require('../models/Product');
const Stock = require('../models/Stock');
const updateStock = require('../utils/updateStock');
const generateDocumentNumber = require('../utils/generateDocumentNumber');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   GET /api/receipts
// @desc    Get all receipts with filters
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

    const receipts = await Receipt.find(query)
      .populate('warehouse', 'name location')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure')
      .sort({ createdAt: -1 });

    res.json({ success: true, receipts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/receipts/:id
// @desc    Get single receipt
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id)
      .populate('warehouse', 'name location')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('items.product', 'name sku category unitOfMeasure');

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    res.json({ success: true, receipt });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/receipts
// @desc    Create a new receipt
// @access  Private (Manager only)
router.post('/',
  authorize('inventory_manager'), [
  body('supplier').trim().notEmpty().withMessage('Supplier name is required'),
  body('warehouse').notEmpty().withMessage('Warehouse is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').notEmpty().withMessage('Product is required for each item'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Valid quantity is required for each item')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { supplier, warehouse, items, notes, status } = req.body;

    // Populate unitPrice from product costPrice if not provided
    const itemsWithPrice = await Promise.all(
      items.map(async (item) => {
        if (!item.unitPrice) {
          const product = await Product.findById(item.product);
          if (product) {
            item.unitPrice = product.costPrice || 0;
          }
        }
        return item;
      })
    );

    // Generate receipt number
    const count = await Receipt.countDocuments();
    const receiptNumber = generateDocumentNumber('REC', count + 1);

    const receipt = await Receipt.create({
      receiptNumber,
      supplier,
      warehouse,
      items: itemsWithPrice,
      notes,
      status: status || 'draft',
      createdBy: req.user._id
    });

    const populatedReceipt = await Receipt.findById(receipt._id)
      .populate('warehouse', 'name location')
      .populate('items.product', 'name sku');

    res.status(201).json({ success: true, receipt: populatedReceipt });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/receipts/:id
// @desc    Update a receipt
// @access  Private (Manager only)
router.put('/:id',
  authorize('inventory_manager'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    // Cannot update if already validated
    if (receipt.status === 'done') {
      return res.status(400).json({ message: 'Cannot update a validated receipt' });
    }

    Object.assign(receipt, req.body);
    receipt.updatedAt = new Date();
    await receipt.save();

    const populatedReceipt = await Receipt.findById(receipt._id)
      .populate('warehouse', 'name location')
      .populate('items.product', 'name sku');

    res.json({ success: true, receipt: populatedReceipt });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/receipts/:id/validate
// @desc    Validate receipt and update stock
// @access  Private (Staff only)
router.post('/:id/validate',
  authorize('warehouse_staff'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    if (receipt.status === 'done') {
      return res.status(400).json({ message: 'Receipt already validated' });
    }

    // Validate receipt has items
    if (!receipt.items || receipt.items.length === 0) {
      return res.status(400).json({ message: 'Receipt has no items' });
    }

    // Ensure warehouse is valid
    if (!receipt.warehouse) {
      return res.status(400).json({ message: 'Receipt has no warehouse assigned' });
    }

    // Convert warehouse to string (handle both ObjectId and populated objects)
    let warehouseId;
    try {
      if (receipt.warehouse && receipt.warehouse._id) {
        warehouseId = receipt.warehouse._id.toString();
      } else if (receipt.warehouse && typeof receipt.warehouse.toString === 'function') {
        warehouseId = receipt.warehouse.toString();
      } else if (receipt.warehouse) {
        warehouseId = String(receipt.warehouse);
      } else {
        return res.status(400).json({ message: 'Receipt warehouse is invalid or missing' });
      }
    } catch (err) {
      return res.status(400).json({ message: 'Error processing warehouse: ' + err.message });
    }

    // Update stock for each item
    for (let i = 0; i < receipt.items.length; i++) {
      const item = receipt.items[i];
      
      if (!item || !item.product) {
        return res.status(400).json({ message: `Receipt item ${i + 1} is missing product` });
      }

      // Convert product to string (handle both ObjectId and populated objects)
      let productId;
      try {
        if (item.product._id) {
          productId = item.product._id.toString();
        } else if (typeof item.product.toString === 'function') {
          productId = item.product.toString();
        } else {
          productId = String(item.product);
        }
        
        // Validate productId
        if (!productId || productId === 'undefined' || productId === 'null' || productId === '') {
          return res.status(400).json({ message: `Invalid product ID in receipt item ${i + 1}: ${productId}` });
        }
      } catch (err) {
        return res.status(400).json({ message: `Error processing product in item ${i + 1}: ${err.message}` });
      }

      // Validate quantity
      const quantity = Number(item.quantity);
      if (!quantity || quantity <= 0 || isNaN(quantity)) {
        return res.status(400).json({ message: `Invalid quantity (${item.quantity}) for product ${productId} in item ${i + 1}` });
      }

      await updateStock(
        productId,
        warehouseId,
        quantity,
        'receipt',
        receipt.receiptNumber,
        receipt._id.toString(),
        req.user._id.toString(),
        `Receipt from ${receipt.supplier}`
      );
    }

    // Update receipt status
    receipt.status = 'done';
    receipt.validatedBy = req.user._id;
    receipt.validatedAt = new Date();
    await receipt.save();

    const populatedReceipt = await Receipt.findById(receipt._id)
      .populate('warehouse', 'name location')
      .populate('items.product', 'name sku')
      .populate('validatedBy', 'name email');

    res.json({ success: true, receipt: populatedReceipt });
  } catch (error) {
    console.error('Error validating receipt:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error while validating receipt', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   DELETE /api/receipts/:id
// @desc    Delete a receipt
// @access  Private (Manager only)
router.delete('/:id',
  authorize('inventory_manager'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    if (receipt.status === 'done') {
      return res.status(400).json({ message: 'Cannot delete a validated receipt' });
    }

    await receipt.deleteOne();
    res.json({ success: true, message: 'Receipt deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

