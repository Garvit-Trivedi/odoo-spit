const ReturnRMA = require('../models/ReturnRMA');
const StockLedgerEntry = require('../models/StockLedgerEntry');

// @desc    Create RMA
// @route   POST /api/returns
// @access  Private
const createRMA = async (req, res) => {
  try {
    const rma = await ReturnRMA.create(req.body);
    res.status(201).json(rma);
  } catch (error) {
    console.error('Create RMA error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    List RMAs
// @route   GET /api/returns
// @access  Private
const getRMAs = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    const list = await ReturnRMA.find(query)
      .populate('lines.product')
      .populate('restockLocation')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    console.error('Get RMA error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update RMA (QC / disposition)
// @route   PUT /api/returns/:id
// @access  Private
const updateRMA = async (req, res) => {
  try {
    const rma = await ReturnRMA.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    if (!rma) return res.status(404).json({ message: 'RMA not found' });
    res.json(rma);
  } catch (error) {
    console.error('Update RMA error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Complete RMA and optionally restock
// @route   POST /api/returns/:id/complete
// @access  Private
const completeRMA = async (req, res) => {
  try {
    const rma = await ReturnRMA.findById(req.params.id);
    if (!rma) return res.status(404).json({ message: 'RMA not found' });

    if (rma.disposition === 'RESTOCK' && rma.restockLocation) {
      const entries = rma.lines.map((line) => ({
        product: line.product,
        quantityChange: Math.abs(line.quantity),
        fromLocation: null,
        toLocation: rma.restockLocation,
        type: 'RECEIPT',
        referenceDocType: 'ReturnRMA',
        referenceDocId: rma._id,
        note: 'Restock from RMA'
      }));
      await StockLedgerEntry.insertMany(entries);
    }

    rma.status = 'Completed';
    await rma.save();
    res.json(rma);
  } catch (error) {
    console.error('Complete RMA error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createRMA, getRMAs, updateRMA, completeRMA };
