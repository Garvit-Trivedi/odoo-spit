const Product = require('../models/Product');
const { getStockByLocation, getStock } = require('../utils/stockHelpers');

// @desc    Stock summary per product & location
// @route   GET /api/stock/summary
// @access  Private
const getStockSummary = async (req, res) => {
  try {
    const { productId, warehouseId, locationId } = req.query;

    const rows = await getStockByLocation({
      productId,
      warehouseId,
      locationId
    });

    res.json(rows);
  } catch (error) {
    console.error('Get stock summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Low stock / out-of-stock alerts
// @route   GET /api/alerts/low-stock
// @access  Private
const getLowStockAlerts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });
    const stockMap = await getStock({});

    const alerts = products.map((p) => {
      const qty = stockMap[p._id.toString()] || 0;
      const isOutOfStock = qty === 0;
      const isLowStock =
        !isOutOfStock && p.reorderLevel && qty <= p.reorderLevel;

      return {
        product: p,
        currentStock: qty,
        isOutOfStock,
        isLowStock
      };
    });

    const lowStock = alerts.filter((a) => a.isLowStock);
    const outOfStock = alerts.filter((a) => a.isOutOfStock);

    res.json({
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      lowStock,
      outOfStock
    });
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getStockSummary, getLowStockAlerts };
