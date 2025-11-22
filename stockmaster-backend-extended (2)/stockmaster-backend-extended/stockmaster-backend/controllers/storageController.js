const StorageZone = require('../models/StorageZone');
const Rack = require('../models/Rack');
const Bin = require('../models/Bin');
const Product = require('../models/Product');

// Zones
const createZone = async (req, res) => {
  try {
    const zone = await StorageZone.create(req.body);
    res.status(201).json(zone);
  } catch (error) {
    console.error('Create zone error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getZones = async (req, res) => {
  try {
    const { warehouseId } = req.query;
    const query = {};
    if (warehouseId) query.warehouse = warehouseId;
    const zones = await StorageZone.find(query)
      .populate('warehouse')
      .sort({ createdAt: -1 });
    res.json(zones);
  } catch (error) {
    console.error('Get zones error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Racks
const createRack = async (req, res) => {
  try {
    const rack = await Rack.create(req.body);
    res.status(201).json(rack);
  } catch (error) {
    console.error('Create rack error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRacks = async (req, res) => {
  try {
    const { zoneId } = req.query;
    const query = {};
    if (zoneId) query.zone = zoneId;
    const racks = await Rack.find(query)
      .populate('zone')
      .sort({ createdAt: -1 });
    res.json(racks);
  } catch (error) {
    console.error('Get racks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Bins
const createBin = async (req, res) => {
  try {
    const bin = await Bin.create(req.body);
    res.status(201).json(bin);
  } catch (error) {
    console.error('Create bin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBins = async (req, res) => {
  try {
    const { rackId } = req.query;
    const query = {};
    if (rackId) query.rack = rackId;
    const bins = await Bin.find(query)
      .populate('rack')
      .sort({ createdAt: -1 });
    res.json(bins);
  } catch (error) {
    console.error('Get bins error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Warehouse map (tree)
const getWarehouseMap = async (req, res) => {
  try {
    const { warehouseId } = req.query;
    const zones = await StorageZone.find(
      warehouseId ? { warehouse: warehouseId } : {}
    );
    const zoneIds = zones.map((z) => z._id);
    const racks = await Rack.find({ zone: { $in: zoneIds } });
    const rackIds = racks.map((r) => r._id);
    const bins = await Bin.find({ rack: { $in: rackIds } });

    res.json({ zones, racks, bins });
  } catch (error) {
    console.error('Get warehouse map error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Assign product to bin
const assignProductToBin = async (req, res) => {
  try {
    const { productId, binId } = req.body;
    const product = await Product.findByIdAndUpdate(
      productId,
      { defaultBin: binId },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    console.error('Assign product to bin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createZone,
  getZones,
  createRack,
  getRacks,
  createBin,
  getBins,
  getWarehouseMap,
  assignProductToBin
};
