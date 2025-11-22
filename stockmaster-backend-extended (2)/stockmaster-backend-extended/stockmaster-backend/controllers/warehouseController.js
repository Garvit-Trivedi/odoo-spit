const Warehouse = require('../models/Warehouse');

// @desc    Create warehouse
// @route   POST /api/warehouses
// @access  Private (admin)
const createWarehouse = async (req, res) => {
  try {
    const { name, code, address } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: 'Name and code are required' });
    }

    const exists = await Warehouse.findOne({ code });
    if (exists) {
      return res.status(400).json({ message: 'Warehouse code already exists' });
    }

    const warehouse = await Warehouse.create({ name, code, address });
    res.status(201).json(warehouse);
  } catch (error) {
    console.error('Create warehouse error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all warehouses
// @route   GET /api/warehouses
// @access  Private
const getWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });
    res.json(warehouses);
  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update warehouse
// @route   PUT /api/warehouses/:id
// @access  Private (admin)
const updateWarehouse = async (req, res) => {
  try {
    const updates = req.body;
    const warehouse = await Warehouse.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    res.json(warehouse);
  } catch (error) {
    console.error('Update warehouse error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createWarehouse, getWarehouses, updateWarehouse };
