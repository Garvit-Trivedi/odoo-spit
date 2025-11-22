const express = require('express');
const { body, validationResult } = require('express-validator');
const Delivery = require('../models/Delivery');
const Product = require('../models/Product');
const Stock = require('../models/Stock');
const updateStock = require('../utils/updateStock');
const generateDocumentNumber = require('../utils/generateDocumentNumber');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   GET /api/deliveries
// @desc    Get all deliveries with filters
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

    const deliveries = await Delivery.find(query)
      .populate('warehouse', 'name location')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('items.product', 'name sku unitOfMeasure')
      .sort({ createdAt: -1 });

    res.json({ success: true, deliveries });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/deliveries/:id
// @desc    Get single delivery
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('warehouse', 'name location')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('items.product', 'name sku category unitOfMeasure');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    res.json({ success: true, delivery });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/deliveries
// @desc    Create a new delivery
// @access  Private (Manager only)
router.post('/',
  authorize('inventory_manager'), [
  body('customer').trim().notEmpty().withMessage('Customer name is required'),
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

    const { customer, warehouse, items, notes, status } = req.body;

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

    // Check stock availability
    for (const item of itemsWithPrice) {
      const stock = await Stock.findOne({ product: item.product, warehouse });
      const availableStock = stock ? stock.quantity - stock.reservedQuantity : 0;
      if (availableStock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for product ${item.product}. Available: ${availableStock}`
        });
      }
    }

    // Generate delivery number
    const count = await Delivery.countDocuments();
    const deliveryNumber = generateDocumentNumber('DEL', count + 1);

    const delivery = await Delivery.create({
      deliveryNumber,
      customer,
      warehouse,
      items: itemsWithPrice.map(item => ({
        product: item.product,
        quantity: item.quantity,
        pickedQuantity: 0,
        packedQuantity: 0
      })),
      notes,
      status: status || 'draft',
      createdBy: req.user._id
    });

    const populatedDelivery = await Delivery.findById(delivery._id)
      .populate('warehouse', 'name location')
      .populate('items.product', 'name sku');

    res.status(201).json({ success: true, delivery: populatedDelivery });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/deliveries/:id
// @desc    Update a delivery
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.status === 'done') {
      return res.status(400).json({ message: 'Cannot update a validated delivery' });
    }

    Object.assign(delivery, req.body);
    delivery.updatedAt = new Date();
    await delivery.save();

    const populatedDelivery = await Delivery.findById(delivery._id)
      .populate('warehouse', 'name location')
      .populate('items.product', 'name sku');

    res.json({ success: true, delivery: populatedDelivery });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/deliveries/:id/pick
// @desc    Update picked quantities
// @access  Private
router.post('/:id/pick', [
  body('items').isArray().withMessage('Items array is required'),
  body('items.*.product').notEmpty().withMessage('Product is required'),
  body('items.*.pickedQuantity').isFloat({ min: 0 }).withMessage('Valid picked quantity is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.status === 'done') {
      return res.status(400).json({ message: 'Delivery already validated' });
    }

    // Update picked quantities
    for (const updateItem of req.body.items) {
      const item = delivery.items.id(updateItem.product);
      if (item) {
        if (updateItem.pickedQuantity > item.quantity) {
          return res.status(400).json({
            message: `Picked quantity cannot exceed ordered quantity for product ${updateItem.product}`
          });
        }
        item.pickedQuantity = updateItem.pickedQuantity;
      }
    }

    delivery.status = 'ready';
    delivery.updatedAt = new Date();
    await delivery.save();

    const populatedDelivery = await Delivery.findById(delivery._id)
      .populate('warehouse', 'name location')
      .populate('items.product', 'name sku');

    res.json({ success: true, delivery: populatedDelivery });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/deliveries/:id/validate
// @desc    Validate delivery and decrease stock
// @access  Private (Staff only)
router.post('/:id/validate',
  authorize('warehouse_staff'), async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.status === 'done') {
      return res.status(400).json({ message: 'Delivery already validated' });
    }

    // Validate delivery has items
    if (!delivery.items || delivery.items.length === 0) {
      return res.status(400).json({ message: 'Delivery has no items' });
    }

    // Ensure warehouse is valid
    if (!delivery.warehouse) {
      return res.status(400).json({ message: 'Delivery has no warehouse assigned' });
    }

    // Debug logging
    console.log('Validating delivery:', delivery.deliveryNumber);
    console.log('Warehouse:', delivery.warehouse);
    console.log('Items count:', delivery.items?.length);

    // Convert warehouse to string (handle both ObjectId and populated objects)
    let warehouseId;
    try {
      if (delivery.warehouse && delivery.warehouse._id) {
        warehouseId = delivery.warehouse._id.toString();
      } else if (delivery.warehouse && typeof delivery.warehouse.toString === 'function') {
        warehouseId = delivery.warehouse.toString();
      } else if (delivery.warehouse) {
        warehouseId = String(delivery.warehouse);
      } else {
        return res.status(400).json({ message: 'Delivery warehouse is invalid or missing' });
      }
    } catch (err) {
      return res.status(400).json({ message: 'Error processing warehouse: ' + err.message });
    }

    // Update stock for each item (decrease)
    for (let i = 0; i < delivery.items.length; i++) {
      const item = delivery.items[i];
      
      if (!item || !item.product) {
        return res.status(400).json({ message: `Delivery item ${i + 1} is missing product` });
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
          return res.status(400).json({ message: `Invalid product ID in delivery item ${i + 1}: ${productId}` });
        }
      } catch (err) {
        return res.status(400).json({ message: `Error processing product in item ${i + 1}: ${err.message}` });
      }

      // Determine quantity to deduct (use packedQuantity if available, otherwise use quantity)
      const quantityToDeduct = item.packedQuantity > 0 ? item.packedQuantity : item.quantity;
      const quantity = Number(quantityToDeduct);
      
      if (!quantity || quantity <= 0 || isNaN(quantity)) {
        return res.status(400).json({ message: `Invalid quantity (${quantityToDeduct}) for product ${productId} in item ${i + 1}` });
      }

      await updateStock(
        productId,
        warehouseId,
        -quantity,
        'delivery',
        delivery.deliveryNumber,
        delivery._id.toString(),
        req.user._id.toString(),
        `Delivery to ${delivery.customer}`
      );
    }

    // Update delivery status
    delivery.status = 'done';
    delivery.validatedBy = req.user._id;
    delivery.validatedAt = new Date();
    await delivery.save();

    const populatedDelivery = await Delivery.findById(delivery._id)
      .populate('warehouse', 'name location')
      .populate('items.product', 'name sku')
      .populate('validatedBy', 'name email');

    res.json({ success: true, delivery: populatedDelivery });
  } catch (error) {
    console.error('Error validating delivery:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error while validating delivery', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   DELETE /api/deliveries/:id
// @desc    Delete a delivery
// @access  Private (Manager only)
router.delete('/:id',
  authorize('inventory_manager'),
  async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.status === 'done') {
      return res.status(400).json({ message: 'Cannot delete a validated delivery' });
    }

    await delivery.deleteOne();
    res.json({ success: true, message: 'Delivery deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

