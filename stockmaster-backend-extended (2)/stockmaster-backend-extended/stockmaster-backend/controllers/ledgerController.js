const StockLedgerEntry = require('../models/StockLedgerEntry');

// @desc    Move history / stock ledger with filters
// @route   GET /api/ledger
// @access  Private
const getLedgerEntries = async (req, res) => {
  try {
    const {
      productId,
      locationId,
      type,
      referenceDocType,
      fromDate,
      toDate
    } = req.query;

    const query = {};
    if (productId) query.product = productId;
    if (type) query.type = type;
    if (referenceDocType) query.referenceDocType = referenceDocType;

    if (locationId) {
      query.$or = [{ fromLocation: locationId }, { toLocation: locationId }];
    }

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const entries = await StockLedgerEntry.find(query)
      .populate('product')
      .populate('fromLocation')
      .populate('toLocation')
      .sort({ createdAt: -1 });

    res.json(entries);
  } catch (error) {
    console.error('Get ledger entries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getLedgerEntries };
