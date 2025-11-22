const StockAdjustment = require('../models/StockAdjustment');
const StockLedgerEntry = require('../models/StockLedgerEntry');

// @desc    Create stock adjustment
// @route   POST /api/adjustments
// @access  Private
const createAdjustment = async (req, res) => {
  try {
    const { product, location, systemQuantity, countedQuantity, reason } =
      req.body;

    const difference = countedQuantity - systemQuantity;

    const adjustment = await StockAdjustment.create({
      product,
      location,
      systemQuantity,
      countedQuantity,
      difference,
      reason,
      status: 'Draft',
      createdBy: req.user._id
    });

    res.status(201).json(adjustment);
  } catch (error) {
    console.error('Create adjustment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get adjustments with filters (status, warehouse, location, product)
// @route   GET /api/adjustments
// @access  Private
const getAdjustments = async (req, res) => {
  try {
    const { status, warehouseId, locationId, productId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (productId) query.product = productId;
    if (locationId) query.location = locationId;

    let adjustments = await StockAdjustment.find(query)
      .populate('product')
      .populate({
        path: 'location',
        populate: { path: 'warehouse' }
      })
      .sort({ createdAt: -1 });

    if (warehouseId) {
      adjustments = adjustments.filter(
        (a) =>
          a.location &&
          a.location.warehouse &&
          a.location.warehouse._id.toString() === warehouseId
      );
    }

    res.json(adjustments);
  } catch (error) {
    console.error('Get adjustments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Validate adjustment -> apply difference to ledger
// @route   POST /api/adjustments/:id/validate
// @access  Private
const validateAdjustment = async (req, res) => {
  try {
    const adjustment = await StockAdjustment.findById(req.params.id);
    if (!adjustment) {
      return res.status(404).json({ message: 'Adjustment not found' });
    }
    if (adjustment.status === 'Done') {
      return res.status(400).json({ message: 'Adjustment already validated' });
    }

    if (adjustment.difference !== 0) {
      await StockLedgerEntry.create({
        product: adjustment.product,
        quantityChange: adjustment.difference,
        fromLocation: adjustment.difference < 0 ? adjustment.location : null,
        toLocation: adjustment.difference > 0 ? adjustment.location : null,
        type: 'ADJUSTMENT',
        referenceDocType: 'StockAdjustment',
        referenceDocId: adjustment._id,
        note: adjustment.reason || 'Stock adjustment'
      });
    }

    adjustment.status = 'Done';
    await adjustment.save();

    res.json({ message: 'Adjustment validated', adjustment });
  } catch (error) {
    console.error('Validate adjustment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createAdjustment, getAdjustments, validateAdjustment };
