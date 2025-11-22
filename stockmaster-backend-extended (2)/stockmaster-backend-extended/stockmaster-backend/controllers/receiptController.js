const Receipt = require('../models/Receipt');

// @desc    Create a new receipt
// @route   POST /api/receipts
// @access  Private
const createReceipt = async (req, res) => {
  try {
    const { supplierName, referenceNumber, lines, status } = req.body;

    const receipt = await Receipt.create({
      supplierName,
      referenceNumber,
      lines,
      status: status || 'Draft',
      createdBy: req.user._id
    });

    res.status(201).json(receipt);
  } catch (error) {
    console.error('Create receipt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all receipts with filters (status, warehouse, location, product, category)
// @route   GET /api/receipts
// @access  Private
const getReceipts = async (req, res) => {
  try {
    const { status, warehouseId, locationId, productId, category } = req.query;
    const query = {};
    if (status) query.status = status;

    let receipts = await Receipt.find(query)
      .populate({
        path: 'lines.product',
        select: 'name sku category'
      })
      .populate({
        path: 'lines.location',
        populate: { path: 'warehouse' }
      })
      .sort({ createdAt: -1 });

    // In-memory filters for nested refs
    if (warehouseId) {
      receipts = receipts.filter((r) =>
        r.lines.some(
          (line) =>
            line.location &&
            line.location.warehouse &&
            line.location.warehouse._id.toString() === warehouseId
        )
      );
    }

    if (locationId) {
      receipts = receipts.filter((r) =>
        r.lines.some(
          (line) =>
            line.location && line.location._id.toString() === locationId
        )
      );
    }

    if (productId) {
      receipts = receipts.filter((r) =>
        r.lines.some(
          (line) =>
            line.product && line.product._id.toString() === productId
        )
      );
    }

    if (category) {
      receipts = receipts.filter((r) =>
        r.lines.some(
          (line) =>
            line.product &&
            line.product.category &&
            line.product.category.toLowerCase() === category.toLowerCase()
        )
      );
    }

    res.json(receipts);
  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Validate a receipt
// @route   POST /api/receipts/:id/validate
// @access  Private
const validateReceipt = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    // Check if receipt is already validated
    if (receipt.status === 'Validated') {
      return res.status(400).json({ message: 'Receipt is already validated' });
    }

    // Update receipt status to Validated
    receipt.status = 'Validated';
    receipt.validatedAt = Date.now();
    receipt.validatedBy = req.user._id;
    
    await receipt.save();

    res.json({ 
      message: 'Receipt validated successfully',
      receipt 
    });
  } catch (error) {
    console.error('Validate receipt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createReceipt, getReceipts, validateReceipt };
