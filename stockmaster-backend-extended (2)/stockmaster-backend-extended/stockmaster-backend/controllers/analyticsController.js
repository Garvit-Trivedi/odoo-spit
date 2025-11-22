const StockLedgerEntry = require('../models/StockLedgerEntry');
const Product = require('../models/Product');

// @desc    Stock valuation report (currentStock * costPrice)
// @route   GET /api/reports/valuation
// @access  Private
const getStockValuation = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });
    const ledger = await StockLedgerEntry.aggregate([
      {
        $group: {
          _id: '$product',
          quantity: { $sum: '$quantityChange' }
        }
      }
    ]);

    const qtyMap = {};
    ledger.forEach((l) => {
      qtyMap[l._id.toString()] = l.quantity;
    });

    const rows = products.map((p) => {
      const qty = qtyMap[p._id.toString()] || 0;
      const value = qty * (p.costPrice || 0);
      return { product: p, quantity: qty, value };
    });

    const totalValue = rows.reduce((sum, r) => sum + r.value, 0);

    res.json({ totalValue, rows });
  } catch (error) {
    console.error('Stock valuation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Fast moving items (top N by outflow)
// @route   GET /api/reports/fast-moving?n=10
// @access  Private
const getFastMovingItems = async (req, res) => {
  try {
    const n = parseInt(req.query.n || '10', 10);

    const agg = await StockLedgerEntry.aggregate([
      {
        $group: {
          _id: '$product',
          totalOut: {
            $sum: {
              $cond: [
                { $lt: ['$quantityChange', 0] },
                { $abs: '$quantityChange' },
                0
              ]
            }
          }
        }
      },
      { $sort: { totalOut: -1 } },
      { $limit: n }
    ]);

    const ids = agg.map((a) => a._id);
    const products = await Product.find({ _id: { $in: ids } });

    const result = agg.map((a) => ({
      product: products.find((p) => p._id.toString() === a._id.toString()),
      totalOut: a.totalOut
    }));

    res.json(result);
  } catch (error) {
    console.error('Fast moving items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Out-of-stock history (dates when product reached zero)
// @route   GET /api/reports/out-of-stock-history/:productId
// @access  Private
const getOutOfStockHistory = async (req, res) => {
  try {
    const productId = req.params.productId;
    const entries = await StockLedgerEntry.find({ product: productId }).sort({
      createdAt: 1
    });

    let running = 0;
    const events = [];

    entries.forEach((e) => {
      running += e.quantityChange;
      if (running === 0) {
        events.push({ at: e.createdAt, reason: e.type });
      }
    });

    res.json(events);
  } catch (error) {
    console.error('Out-of-stock history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getStockValuation,
  getFastMovingItems,
  getOutOfStockHistory
};
