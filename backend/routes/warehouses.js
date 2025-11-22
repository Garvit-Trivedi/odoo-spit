const express = require('express');
const { body, validationResult } = require('express-validator');
const Warehouse = require('../models/Warehouse');
const Stock = require('../models/Stock');
const Receipt = require('../models/Receipt');
const Delivery = require('../models/Delivery');
const Transfer = require('../models/Transfer');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   GET /api/warehouses
// @desc    Get all warehouses
// @access  Private
router.get('/', async (req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });
    res.json({ success: true, warehouses });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/warehouses/:id
// @desc    Get single warehouse with detailed KPIs (manager only for full details)
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    const isManager = req.user.role === 'inventory_manager';

    // Basic warehouse info
    const warehouseData = {
      warehouseId: warehouse._id,
      name: warehouse.name,
      location: warehouse.location,
      formattedAddress: warehouse.formattedAddress,
      coordinates: warehouse.coordinates,
      description: warehouse.description,
      isActive: warehouse.isActive,
      createdAt: warehouse.createdAt
    };

    // If manager, include detailed KPIs
    if (isManager) {
      // Get stock statistics
      const stocks = await Stock.find({ warehouse: warehouse._id }).populate('product');
      
      let totalSKUs = 0;
      let totalUnits = 0;
      let stockValue = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;

      stocks.forEach(stock => {
        if (stock.product) {
          totalSKUs++;
          totalUnits += stock.quantity || 0;
          const unitPrice = stock.product.costPrice || 0;
          stockValue += (stock.quantity || 0) * unitPrice;

          if (stock.quantity <= 0) {
            outOfStockCount++;
          } else if (stock.product.reorderLevel && stock.quantity <= stock.product.reorderLevel) {
            lowStockCount++;
          }
        }
      });

      // Get pending counts
      const pendingReceiptsCount = await Receipt.countDocuments({ 
        warehouse: warehouse._id, 
        status: { $in: ['draft', 'waiting', 'ready'] } 
      });
      
      const pendingDeliveriesCount = await Delivery.countDocuments({ 
        warehouse: warehouse._id, 
        status: { $in: ['draft', 'waiting', 'ready'] } 
      });
      
      const pendingTransfersCount = await Transfer.countDocuments({ 
        $or: [
          { fromWarehouse: warehouse._id },
          { toWarehouse: warehouse._id }
        ],
        status: { $in: ['draft', 'waiting', 'ready'] } 
      });

      // Calculate utilization (if capacity is set)
      const capacity = warehouse.capacity || null;
      const utilizationPercent = capacity ? (totalUnits / capacity * 100) : null;

      warehouseData.kpis = {
        capacity,
        utilizationPercent: utilizationPercent ? parseFloat(utilizationPercent.toFixed(2)) : null,
        totalSKUs,
        totalUnits,
        stockValue: parseFloat(stockValue.toFixed(2)),
        lowStockCount,
        outOfStockCount,
        pendingReceiptsCount,
        pendingDeliveriesCount,
        pendingTransfersCount,
        lastCycleCountDate: null, // TODO: Implement cycle count tracking
        lastCycleCountAccuracyPercent: null, // TODO: Implement cycle count tracking
        activeStaffCount: 0, // TODO: Implement staff tracking
        openExceptionsCount: 0 // TODO: Implement exception tracking
      };
    }

    res.json({ success: true, warehouse: warehouseData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/warehouses
// @desc    Create a new warehouse
// @access  Private (Manager only)
router.post('/',
  authorize('inventory_manager'),
  [
  body('name').trim().notEmpty().withMessage('Warehouse name is required'),
  body('location').trim().notEmpty().withMessage('Location is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, location, description, coordinates, formattedAddress } = req.body;

    // Check if warehouse name already exists
    const warehouseExists = await Warehouse.findOne({ name });
    if (warehouseExists) {
      return res.status(400).json({ message: 'Warehouse name already exists' });
    }

    const warehouse = await Warehouse.create({
      name,
      location: formattedAddress || location,
      formattedAddress: formattedAddress || location,
      coordinates,
      description
    });

    res.status(201).json({ success: true, warehouse });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/warehouses/:id
// @desc    Update a warehouse
// @access  Private (Manager only)
router.put('/:id',
  authorize('inventory_manager'),
  [
  body('name').optional().trim().notEmpty().withMessage('Warehouse name cannot be empty'),
  body('location').optional().trim().notEmpty().withMessage('Location cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Check name uniqueness if being updated
    if (req.body.name && req.body.name !== warehouse.name) {
      const nameExists = await Warehouse.findOne({ name: req.body.name });
      if (nameExists) {
        return res.status(400).json({ message: 'Warehouse name already exists' });
      }
    }

    // Update fields
    if (req.body.name) warehouse.name = req.body.name;
    if (req.body.description !== undefined) warehouse.description = req.body.description;
    if (req.body.isActive !== undefined) warehouse.isActive = req.body.isActive;
    if (req.body.location || req.body.formattedAddress) {
      warehouse.location = req.body.formattedAddress || req.body.location;
      warehouse.formattedAddress = req.body.formattedAddress || req.body.location;
    }
    if (req.body.coordinates) warehouse.coordinates = req.body.coordinates;
    
    await warehouse.save();

    res.json({ success: true, warehouse });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/warehouses/:id
// @desc    Delete a warehouse
// @access  Private (Manager only)
router.delete('/:id',
  authorize('inventory_manager'),
  async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    await warehouse.deleteOne();
    res.json({ success: true, message: 'Warehouse deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/warehouses/:id/stock
// @desc    Get all stock for a warehouse
// @access  Private (Manager only)
router.get('/:id/stock',
  authorize('inventory_manager'),
  async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    const stocks = await Stock.find({ warehouse: req.params.id })
      .populate('product', 'name sku costPrice unitOfMeasure')
      .sort({ 'product.name': 1 });

    res.json({ success: true, stocks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

