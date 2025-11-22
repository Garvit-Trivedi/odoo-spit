const Location = require('../models/Location');

// @desc    Create location
// @route   POST /api/locations
// @access  Private (admin / inventory_manager)
const createLocation = async (req, res) => {
  try {
    const { name, code, warehouse, isDefault } = req.body;
    if (!name || !code || !warehouse) {
      return res.status(400).json({ message: 'Name, code, warehouse required' });
    }

    const location = await Location.create({
      name,
      code,
      warehouse,
      isDefault: !!isDefault
    });

    res.status(201).json(location);
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get locations (optionally by warehouse)
// @route   GET /api/locations
// @access  Private
const getLocations = async (req, res) => {
  try {
    const { warehouseId } = req.query;
    const query = {};
    if (warehouseId) query.warehouse = warehouseId;

    const locations = await Location.find(query)
      .populate('warehouse')
      .sort({ createdAt: -1 });

    res.json(locations);
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update location
// @route   PUT /api/locations/:id
// @access  Private (admin / inventory_manager)
const updateLocation = async (req, res) => {
  try {
    const updates = req.body;
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }
    res.json(location);
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createLocation, getLocations, updateLocation };
