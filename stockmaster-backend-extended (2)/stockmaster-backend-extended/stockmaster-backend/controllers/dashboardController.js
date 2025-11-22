const Product = require('../models/Product');
const Receipt = require('../models/Receipt');
const DeliveryOrder = require('../models/DeliveryOrder');
const InternalTransfer = require('../models/InternalTransfer');
const { getStock } = require('../utils/stockHelpers');

// @desc    Dashboard summary KPIs
// @route   GET /api/dashboard/summary
// @access  Private
const getSummary = async (req, res) => {
  try {
    const [products, stockMap, pendingReceipts, pendingDeliveries, pendingTransfers] =
      await Promise.all([
        Product.find(),
        getStock({}),
        Receipt.countDocuments({ status: { $in: ['Draft', 'Waiting', 'Ready'] } }),
        DeliveryOrder.countDocuments({
          status: { $in: ['Draft', 'Waiting', 'Ready'] }
        }),
        InternalTransfer.countDocuments({
          status: { $in: ['Draft', 'Waiting', 'Ready'] }
        })
      ]);

    let totalProductsInStock = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;

    products.forEach((p) => {
      const qty = stockMap[p._id.toString()] || 0;
      if (qty > 0) totalProductsInStock += qty;
      if (qty === 0) outOfStockItems += 1;
      if (p.reorderLevel && qty > 0 && qty <= p.reorderLevel) {
        lowStockItems += 1;
      }
    });

    res.json({
      totalProductsInStock,
      lowStockItems,
      outOfStockItems,
      pendingReceipts,
      pendingDeliveries,
      pendingInternalTransfers: pendingTransfers
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getSummary };
