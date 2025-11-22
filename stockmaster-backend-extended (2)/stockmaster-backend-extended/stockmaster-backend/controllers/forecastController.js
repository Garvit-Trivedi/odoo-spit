const StockLedgerEntry = require('../models/StockLedgerEntry');
const Product = require('../models/Product');

// @desc    Consumption history for a product
// @route   GET /api/forecast/consumption/:productId
// @access  Private
const getConsumptionHistory = async (req, res) => {
  try {
    const productId = req.params.productId;

    const pipeline = [
      { $match: { product: productId, quantityChange: { $lt: 0 } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalConsumed: { $sum: { $abs: '$quantityChange' } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ];

    const history = await StockLedgerEntry.aggregate(pipeline);
    res.json(history);
  } catch (error) {
    console.error('Consumption history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Basic forecast = average daily consumption * next 30 days
// @route   GET /api/forecast/basic/:productId
// @access  Private
const getBasicForecast = async (req, res) => {
  try {
    const productId = req.params.productId;

    const pipeline = [
      { $match: { product: productId, quantityChange: { $lt: 0 } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalConsumed: { $sum: { $abs: '$quantityChange' } }
        }
      }
    ];

    const history = await StockLedgerEntry.aggregate(pipeline);
    if (!history.length) {
      return res.json({ averageDaily: 0, forecastNext30Days: 0 });
    }

    const totalConsumed = history.reduce(
      (sum, h) => sum + h.totalConsumed,
      0
    );
    const days = history.length;
    const averageDaily = totalConsumed / days;
    const forecastNext30Days = Math.round(averageDaily * 30);

    res.json({ averageDaily, forecastNext30Days });
  } catch (error) {
    console.error('Basic forecast error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Slow / dead stock report (no movements in last N days)
// @route   GET /api/forecast/slow-dead?days=90
// @access  Private
const getSlowDeadStock = async (req, res) => {
  try {
    const days = parseInt(req.query.days || '90', 10);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const latestMoves = await StockLedgerEntry.aggregate([
      {
        $group: {
          _id: '$product',
          lastMoveAt: { $max: '$createdAt' }
        }
      }
    ]);

    const latestMap = {};
    latestMoves.forEach((m) => {
      latestMap[m._id.toString()] = m.lastMoveAt;
    });

    const products = await Product.find({ isActive: true });

    const slow = [];
    const dead = [];

    products.forEach((p) => {
      const last = latestMap[p._id.toString()];
      if (!last) {
        dead.push({ product: p, lastMoveAt: null });
      } else if (last < cutoff) {
        slow.push({ product: p, lastMoveAt: last });
      }
    });

    res.json({ slow, dead });
  } catch (error) {
    console.error('Slow/dead stock error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Stock turnover (very rough): total outflow / current stock
// @route   GET /api/forecast/turnover/:productId
// @access  Private
const getStockTurnover = async (req, res) => {
  try {
    const productId = req.params.productId;

    const movements = await StockLedgerEntry.aggregate([
      { $match: { product: productId } },
      {
        $group: {
          _id: null,
          totalOut: {
            $sum: {
              $cond: [
                { $lt: ['$quantityChange', 0] },
                { $abs: '$quantityChange' },
                0
              ]
            }
          },
          net: { $sum: '$quantityChange' }
        }
      }
    ]);

    if (!movements.length) {
      return res.json({ totalOut: 0, currentStock: 0, turnover: 0 });
    }

    const { totalOut, net } = movements[0];
    const currentStock = net;
    const turnover = currentStock > 0 ? totalOut / currentStock : null;

    res.json({ totalOut, currentStock, turnover });
  } catch (error) {
    console.error('Stock turnover error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getConsumptionHistory,
  getBasicForecast,
  getSlowDeadStock,
  getStockTurnover
};
