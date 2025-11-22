const express = require('express');
const { body, validationResult } = require('express-validator');
const Transfer = require('../models/Transfer');
const Product = require('../models/Product');
const Stock = require('../models/Stock');
const updateStock = require('../utils/updateStock');
const generateDocumentNumber = require('../utils/generateDocumentNumber');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   GET /api/transfers
// @desc    Get all transfers with filters
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { status, fromWarehouse, toWarehouse, startDate, endDate } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (fromWarehouse) {
      query.fromWarehouse = fromWarehouse;
    }

    if (toWarehouse) {
      query.toWarehouse = toWarehouse;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transfers = await Transfer.find(query)
      .populate('fromWarehouse', 'name location')
      .populate('toWarehouse', 'name location')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure')
      .sort({ createdAt: -1 });

    res.json({ success: true, transfers });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/transfers/:id
// @desc    Get single transfer
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id)
      .populate('fromWarehouse', 'name location')
      .populate('toWarehouse', 'name location')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('items.product', 'name sku category unitOfMeasure');

    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }

    res.json({ success: true, transfer });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/transfers
// @desc    Create a new transfer
// @access  Private (Manager only)
router.post('/',
  authorize('inventory_manager'),
  [
  body('fromWarehouse').notEmpty().withMessage('From warehouse is required'),
  body('toWarehouse').notEmpty().withMessage('To warehouse is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').notEmpty().withMessage('Product is required for each item'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Valid quantity is required for each item')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fromWarehouse, toWarehouse, items, notes, status } = req.body;

    if (fromWarehouse === toWarehouse) {
      return res.status(400).json({ message: 'From and to warehouses cannot be the same' });
    }

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

    // Check stock availability in fromWarehouse
    for (const item of items) {
      const stock = await Stock.findOne({ product: item.product, warehouse: fromWarehouse });
      const availableStock = stock ? stock.quantity - stock.reservedQuantity : 0;
      if (availableStock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock in source warehouse for product ${item.product}. Available: ${availableStock}`
        });
      }
    }

    // Generate transfer number
    const count = await Transfer.countDocuments();
    const transferNumber = generateDocumentNumber('TRF', count + 1);

    const transfer = await Transfer.create({
      transferNumber,
      fromWarehouse,
      toWarehouse,
      items: itemsWithPrice,
      notes,
      status: status || 'draft',
      createdBy: req.user._id
    });

    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('fromWarehouse', 'name location')
      .populate('toWarehouse', 'name location')
      .populate('items.product', 'name sku');

    res.status(201).json({ success: true, transfer: populatedTransfer });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/transfers/:id
// @desc    Update a transfer
// @access  Private (Manager only)
router.put('/:id',
  authorize('inventory_manager'),
  async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }

    if (transfer.status === 'done') {
      return res.status(400).json({ message: 'Cannot update a validated transfer' });
    }

    Object.assign(transfer, req.body);
    transfer.updatedAt = new Date();
    await transfer.save();

    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('fromWarehouse', 'name location')
      .populate('toWarehouse', 'name location')
      .populate('items.product', 'name sku');

    res.json({ success: true, transfer: populatedTransfer });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/transfers/:id/validate
// @desc    Validate transfer and update stock
// @access  Private (Manager only)
router.post('/:id/validate',
  authorize('inventory_manager'),
  async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }

    if (transfer.status === 'done') {
      return res.status(400).json({ message: 'Transfer already validated' });
    }

    // Validate transfer has items
    if (!transfer.items || transfer.items.length === 0) {
      return res.status(400).json({ message: 'Transfer has no items' });
    }

    // Convert warehouses to strings
    let fromWarehouseId, toWarehouseId;
    try {
      fromWarehouseId = transfer.fromWarehouse._id ? transfer.fromWarehouse._id.toString() : 
                       (transfer.fromWarehouse.toString ? transfer.fromWarehouse.toString() : String(transfer.fromWarehouse));
      toWarehouseId = transfer.toWarehouse._id ? transfer.toWarehouse._id.toString() : 
                     (transfer.toWarehouse.toString ? transfer.toWarehouse.toString() : String(transfer.toWarehouse));
    } catch (err) {
      return res.status(400).json({ message: 'Error processing warehouses: ' + err.message });
    }

    // Update stock: decrease from source, increase in destination
    for (let i = 0; i < transfer.items.length; i++) {
      const item = transfer.items[i];
      
      if (!item || !item.product) {
        return res.status(400).json({ message: `Transfer item ${i + 1} is missing product` });
      }

      // Convert product to string
      let productId;
      try {
        productId = item.product._id ? item.product._id.toString() : 
                   (item.product.toString ? item.product.toString() : String(item.product));
        if (!productId || productId === 'undefined' || productId === 'null' || productId === '') {
          return res.status(400).json({ message: `Invalid product ID in transfer item ${i + 1}` });
        }
      } catch (err) {
        return res.status(400).json({ message: `Error processing product in item ${i + 1}: ${err.message}` });
      }

      const quantity = Number(item.quantity);
      if (!quantity || quantity <= 0 || isNaN(quantity)) {
        return res.status(400).json({ message: `Invalid quantity for product ${productId} in item ${i + 1}` });
      }

      // Decrease from source warehouse
      await updateStock(
        productId,
        fromWarehouseId,
        -quantity,
        'transfer_out',
        transfer.transferNumber,
        transfer._id.toString(),
        req.user._id.toString(),
        `Transfer to ${toWarehouseId}`
      );

      // Increase in destination warehouse
      await updateStock(
        productId,
        toWarehouseId,
        quantity,
        'transfer_in',
        transfer.transferNumber,
        transfer._id.toString(),
        req.user._id.toString(),
        `Transfer from ${fromWarehouseId}`
      );
    }

    // Update transfer status
    transfer.status = 'done';
    transfer.validatedBy = req.user._id;
    transfer.validatedAt = new Date();
    await transfer.save();

    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('fromWarehouse', 'name location')
      .populate('toWarehouse', 'name location')
      .populate('items.product', 'name sku')
      .populate('validatedBy', 'name email');

    res.json({ success: true, transfer: populatedTransfer });
  } catch (error) {
    console.error('Error validating transfer:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error while validating transfer', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   DELETE /api/transfers/:id
// @desc    Delete a transfer
// @access  Private (Manager only)
router.delete('/:id',
  authorize('inventory_manager'),
  async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }

    if (transfer.status === 'done') {
      return res.status(400).json({ message: 'Cannot delete a validated transfer' });
    }

    await transfer.deleteOne();
    res.json({ success: true, message: 'Transfer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

