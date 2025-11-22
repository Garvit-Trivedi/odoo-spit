const express = require('express');
const Product = require('../models/Product');
const Stock = require('../models/Stock');
const Receipt = require('../models/Receipt');
const Delivery = require('../models/Delivery');
const Transfer = require('../models/Transfer');
const Adjustment = require('../models/Adjustment');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   GET /api/dashboard/kpis
// @desc    Get dashboard KPIs
// @access  Private
router.get('/kpis', async (req, res) => {
  try {
    const { warehouse, category } = req.query;

    // Build query for warehouse filter
    const warehouseQuery = warehouse ? { warehouse } : {};

    // Build product query for category filter
    let productQuery = {};
    if (category) {
      productQuery.category = category;
    }

    // Total Products in Stock (products that have stock > 0)
    let stocksQuery = { quantity: { $gt: 0 } };
    if (warehouse) {
      stocksQuery.warehouse = warehouse;
    }

    // Get products with stock
    const stocksWithProducts = await Stock.find(stocksQuery)
      .populate({
        path: 'product',
        match: productQuery
      });

    // Filter out null products and apply category filter
    const validStocks = stocksWithProducts.filter(stock => 
      stock.product && stock.product._id && (!category || stock.product.category === category)
    );

    // Get unique product IDs that have stock
    const productIdsWithStock = [...new Set(validStocks.map(s => s.product._id.toString()))];
    const totalProducts = productIdsWithStock.length;

    // Low Stock / Out of Stock Items
    const lowStockItems = validStocks.filter(stock => {
      const reorderLevel = stock.product?.reorderLevel || 0;
      return stock.quantity <= reorderLevel && stock.quantity > 0;
    });
    
    const outOfStockItems = validStocks.filter(stock => stock.quantity === 0);

    // Pending Receipts
    const pendingReceipts = await Receipt.countDocuments({
      ...warehouseQuery,
      status: { $in: ['draft', 'waiting', 'ready'] }
    });

    // Pending Deliveries
    const pendingDeliveries = await Delivery.countDocuments({
      ...warehouseQuery,
      status: { $in: ['draft', 'waiting', 'ready'] }
    });

    // Internal Transfers Scheduled
    // For transfers, check if warehouse filter applies to from or to warehouse
    let transferQuery = { status: { $in: ['draft', 'waiting', 'ready'] } };
    if (warehouse) {
      transferQuery.$or = [
        { fromWarehouse: warehouse },
        { toWarehouse: warehouse }
      ];
    }
    const scheduledTransfers = await Transfer.countDocuments(transferQuery);

    res.json({
      success: true,
      kpis: {
        totalProducts,
        lowStockItems: lowStockItems.length,
        outOfStockItems: outOfStockItems.length,
        pendingReceipts,
        pendingDeliveries,
        scheduledTransfers
      },
      lowStockDetails: lowStockItems.map(stock => ({
        product: stock.product?.name || 'Unknown',
        sku: stock.product?.sku || 'N/A',
        currentStock: stock.quantity,
        reorderLevel: stock.product?.reorderLevel || 0
      })),
      outOfStockDetails: outOfStockItems.map(stock => ({
        product: stock.product?.name || 'Unknown',
        sku: stock.product?.sku || 'N/A'
      }))
    });
  } catch (error) {
    console.error('Error fetching dashboard KPIs:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error while fetching dashboard KPIs', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/dashboard/recent-activities
// @desc    Get recent activities
// @access  Private
router.get('/recent-activities', async (req, res) => {
  try {
    const { documentType, status, warehouse, category, limit = 10 } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (warehouse) {
      query.warehouse = warehouse;
    }

    const activities = [];

    if (!documentType || documentType === 'receipt') {
      let receiptsQuery = { ...query };
      const receipts = await Receipt.find(receiptsQuery)
        .populate('warehouse', 'name')
        .populate('createdBy', 'name')
        .populate('items.product', 'category')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) * 2);
      
      // Filter by category if specified
      let filteredReceipts = receipts;
      if (category) {
        filteredReceipts = receipts.filter(r => 
          r.items.some(item => item.product?.category === category)
        );
      }
      
      activities.push(...filteredReceipts.slice(0, parseInt(limit)).map(r => ({
        type: 'receipt',
        number: r.receiptNumber,
        warehouse: r.warehouse?.name || 'N/A',
        status: r.status,
        createdAt: r.createdAt,
        createdBy: r.createdBy?.name || 'N/A'
      })));
    }

    if (!documentType || documentType === 'delivery') {
      let deliveriesQuery = { ...query };
      const deliveries = await Delivery.find(deliveriesQuery)
        .populate('warehouse', 'name')
        .populate('createdBy', 'name')
        .populate('items.product', 'category')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) * 2);
      
      // Filter by category if specified
      let filteredDeliveries = deliveries;
      if (category) {
        filteredDeliveries = deliveries.filter(d => 
          d.items.some(item => item.product?.category === category)
        );
      }
      
      activities.push(...filteredDeliveries.slice(0, parseInt(limit)).map(d => ({
        type: 'delivery',
        number: d.deliveryNumber,
        warehouse: d.warehouse?.name || 'N/A',
        status: d.status,
        createdAt: d.createdAt,
        createdBy: d.createdBy?.name || 'N/A'
      })));
    }

    if (!documentType || documentType === 'transfer') {
      let transferQuery = {};
      if (status) {
        transferQuery.status = status;
      }
      // For transfers, warehouse can be from or to
      if (warehouse) {
        transferQuery.$or = [
          { fromWarehouse: warehouse },
          { toWarehouse: warehouse }
        ];
      }
      
      const transfers = await Transfer.find(transferQuery)
        .populate('fromWarehouse', 'name')
        .populate('toWarehouse', 'name')
        .populate('createdBy', 'name')
        .populate('items.product', 'category')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) * 2);
      
      // Filter by category if specified
      let filteredTransfers = transfers;
      if (category) {
        filteredTransfers = transfers.filter(t => 
          t.items.some(item => item.product?.category === category)
        );
      }
      
      activities.push(...filteredTransfers.slice(0, parseInt(limit)).map(t => ({
        type: 'transfer',
        number: t.transferNumber,
        fromWarehouse: t.fromWarehouse?.name || 'N/A',
        toWarehouse: t.toWarehouse?.name || 'N/A',
        status: t.status,
        createdAt: t.createdAt,
        createdBy: t.createdBy?.name || 'N/A'
      })));
    }

    if (!documentType || documentType === 'adjustment') {
      let adjustmentQuery = { ...query };
      const adjustments = await Adjustment.find(adjustmentQuery)
        .populate('warehouse', 'name')
        .populate('createdBy', 'name')
        .populate('items.product', 'category')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) * 2);
      
      // Filter by category if specified
      let filteredAdjustments = adjustments;
      if (category) {
        filteredAdjustments = adjustments.filter(a => 
          a.items.some(item => item.product?.category === category)
        );
      }
      
      activities.push(...filteredAdjustments.slice(0, parseInt(limit)).map(a => ({
        type: 'adjustment',
        number: a.adjustmentNumber,
        warehouse: a.warehouse?.name || 'N/A',
        status: a.status,
        createdAt: a.createdAt,
        createdBy: a.createdBy?.name || 'N/A'
      })));
    }

    // Sort all activities by date and limit
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.json({ success: true, activities: limitedActivities });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

