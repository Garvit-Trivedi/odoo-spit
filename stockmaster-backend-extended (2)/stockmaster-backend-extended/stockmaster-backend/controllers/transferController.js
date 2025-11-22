const InternalTransfer = require('../models/InternalTransfer');
const StockLedgerEntry = require('../models/StockLedgerEntry');

// @desc    Create internal transfer
// @route   POST /api/transfers
// @access  Private
const createTransfer = async (req, res) => {
  try {
    const { fromLocation, toLocation, lines, status } = req.body;

    const transfer = await InternalTransfer.create({
      fromLocation,
      toLocation,
      lines,
      status: status || 'Draft',
      createdBy: req.user._id
    });

    res.status(201).json(transfer);
  } catch (error) {
    console.error('Create transfer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get internal transfers with filters (status, warehouse, location, product)
// @route   GET /api/transfers
// @access  Private
const getTransfers = async (req, res) => {
  try {
    const { status, warehouseId, locationId, productId } = req.query;
    const query = {};
    if (status) query.status = status;

    let transfers = await InternalTransfer.find(query)
      .populate({
        path: 'fromLocation',
        populate: { path: 'warehouse' }
      })
      .populate({
        path: 'toLocation',
        populate: { path: 'warehouse' }
      })
      .populate({
        path: 'lines.product',
        select: 'name sku category'
      })
      .sort({ createdAt: -1 });

    if (warehouseId) {
      transfers = transfers.filter((t) => {
        const fromMatch =
          t.fromLocation &&
          t.fromLocation.warehouse &&
          t.fromLocation.warehouse._id.toString() === warehouseId;
        const toMatch =
          t.toLocation &&
          t.toLocation.warehouse &&
          t.toLocation.warehouse._id.toString() === warehouseId;
        return fromMatch || toMatch;
      });
    }

    if (locationId) {
      transfers = transfers.filter(
        (t) =>
          (t.fromLocation &&
            t.fromLocation._id.toString() === locationId) ||
          (t.toLocation && t.toLocation._id.toString() === locationId)
      );
    }

    if (productId) {
      transfers = transfers.filter((t) =>
        t.lines.some(
          (line) =>
            line.product && line.product._id.toString() === productId
        )
      );
    }

    res.json(transfers);
  } catch (error) {
    console.error('Get transfers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Validate transfer -> move stock but keep total same
// @route   POST /api/transfers/:id/validate
// @access  Private
const validateTransfer = async (req, res) => {
  try {
    const transfer = await InternalTransfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }
    if (transfer.status === 'Done') {
      return res.status(400).json({ message: 'Transfer already validated' });
    }

    const ledgerEntries = transfer.lines.flatMap((line) => [
      {
        product: line.product,
        quantityChange: -Math.abs(line.quantity),
        fromLocation: transfer.fromLocation,
        toLocation: null,
        type: 'TRANSFER',
        referenceDocType: 'InternalTransfer',
        referenceDocId: transfer._id,
        note: 'Internal transfer out'
      },
      {
        product: line.product,
        quantityChange: Math.abs(line.quantity),
        fromLocation: null,
        toLocation: transfer.toLocation,
        type: 'TRANSFER',
        referenceDocType: 'InternalTransfer',
        referenceDocId: transfer._id,
        note: 'Internal transfer in'
      }
    ]);

    await StockLedgerEntry.insertMany(ledgerEntries);
    transfer.status = 'Done';
    await transfer.save();

    res.json({ message: 'Transfer validated', transfer });
  } catch (error) {
    console.error('Validate transfer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createTransfer, getTransfers, validateTransfer };
