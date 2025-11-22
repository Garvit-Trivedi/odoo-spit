const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const Stock = require('../models/Stock');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const StockSnapshot = require('../models/StockSnapshot');
const Receipt = require('../models/Receipt');
const Delivery = require('../models/Delivery');
const Transfer = require('../models/Transfer');
const mongoose = require('mongoose');

// Helper to create current snapshot from Stock collection
const getCurrentStockData = async (warehouseId, productId, category) => {
  const stockMatch = {};
  if (warehouseId) {
    stockMatch.warehouse = new mongoose.Types.ObjectId(warehouseId);
  }
  if (productId) {
    stockMatch.product = new mongoose.Types.ObjectId(productId);
  }

  let stocks = await Stock.find(stockMatch)
    .populate('product')
    .populate('warehouse');

  if (category) {
    stocks = stocks.filter(stock => stock.product?.category === category);
  }

  return stocks;
};

const router = express.Router();

// All routes are protected and manager-only
router.use(protect);
router.use(authorize('inventory_manager'));

// @route   GET /api/reports/stock-trend
// @desc    Get stock level over time (line chart data)
// @access  Private (Manager only)
router.get('/stock-trend', async (req, res) => {
  try {
    const { warehouseId, productId, category, from, to, groupBy = 'day', metric = 'units' } = req.query;

    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const toDate = to ? new Date(to) : new Date();

    // Build match criteria
    const matchCriteria = {
      date: { $gte: fromDate, $lte: toDate }
    };

    if (warehouseId) {
      matchCriteria.warehouse = new mongoose.Types.ObjectId(warehouseId);
    }

    if (productId) {
      matchCriteria.product = new mongoose.Types.ObjectId(productId);
    }

    // Group by date
    let dateGroupFormat;
    switch (groupBy) {
      case 'week':
        dateGroupFormat = { $dateToString: { format: '%Y-W%V', date: '$date' } };
        break;
      case 'month':
        dateGroupFormat = { $dateToString: { format: '%Y-%m', date: '$date' } };
        break;
      default: // 'day'
        dateGroupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
    }

    // Aggregate pipeline
    let pipeline = [
      { $match: matchCriteria }
    ];

    // If category filter, join with products
    if (category) {
      pipeline.push({
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productData'
        }
      });
      pipeline.push({
        $match: {
          'productData.category': category
        }
      });
    }

    // Group by date
    const groupStage = {
      $group: {
        _id: dateGroupFormat,
        date: { $first: '$date' },
        units: { $sum: '$quantity' },
        value: { $sum: '$value' }
      }
    };

    if (metric === 'value') {
      groupStage.$group.value = { $sum: '$value' };
    } else {
      groupStage.$group.units = { $sum: '$quantity' };
    }

    pipeline.push(groupStage);

    // Sort by date
    pipeline.push({ $sort: { date: 1 } });

    // Project final format
    pipeline.push({
      $project: {
        _id: 0,
        date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        value: { $round: [metric === 'value' ? '$value' : '$units', 2] }
      }
    });

    let series = await StockSnapshot.aggregate(pipeline);

    // If no snapshot data exists, use current stock data as fallback
    if (series.length === 0) {
      // Create current snapshot data from Stock collection
      const stockMatch = {};
      if (warehouseId) {
        stockMatch.warehouse = new mongoose.Types.ObjectId(warehouseId);
      }
      if (productId) {
        stockMatch.product = new mongoose.Types.ObjectId(productId);
      }

      const currentStocks = await Stock.find(stockMatch)
        .populate('product')
        .populate('warehouse');

      // Filter by category if needed
      let filteredStocks = currentStocks;
      if (category) {
        filteredStocks = currentStocks.filter(stock => stock.product?.category === category);
      }

      // Calculate totals
      const totalUnits = filteredStocks.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
      const totalValue = filteredStocks.reduce((sum, stock) => {
        const unitPrice = stock.product?.costPrice || 0;
        return sum + ((stock.quantity || 0) * unitPrice);
      }, 0);

      // Create a single data point for today
      series = [{
        date: new Date().toISOString().split('T')[0],
        value: metric === 'value' ? parseFloat(totalValue.toFixed(2)) : parseFloat(totalUnits.toFixed(2))
      }];
    }

    res.json({
      success: true,
      series,
      meta: {
        metric,
        warehouseId: warehouseId || 'all',
        productId: productId || null,
        category: category || null,
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
        groupBy
      }
    });
  } catch (error) {
    console.error('Stock trend error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/reports/stock-by-category
// @desc    Get stock composition by category (pie chart data)
// @access  Private (Manager only)
router.get('/stock-by-category', async (req, res) => {
  try {
    const { warehouseId, asOf, metric = 'units', topN = 10 } = req.query;

    const snapshotDate = asOf ? new Date(asOf) : new Date();
    snapshotDate.setHours(23, 59, 59, 999); // End of day

    // Build match criteria
    const matchCriteria = {
      date: { $lte: snapshotDate }
    };

    if (warehouseId) {
      matchCriteria.warehouse = new mongoose.Types.ObjectId(warehouseId);
    }

    // Get latest snapshot for each product-warehouse combination
    const pipeline = [
      { $match: matchCriteria },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productData'
        }
      },
      { $unwind: '$productData' },
      {
        $sort: { date: -1 }
      },
      {
        $group: {
          _id: {
            product: '$product',
            warehouse: '$warehouse'
          },
          latestSnapshot: { $first: '$$ROOT' }
        }
      },
      {
        $group: {
          _id: '$latestSnapshot.productData.category',
          units: { $sum: '$latestSnapshot.quantity' },
          value: { $sum: '$latestSnapshot.value' }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          units: { $round: ['$units', 2] },
          value: { $round: ['$value', 2] }
        }
      },
      { $sort: metric === 'value' ? { value: -1 } : { units: -1 } }
    ];

    let allBuckets = await StockSnapshot.aggregate(pipeline);

    // If no snapshot data exists, use current stock data as fallback
    if (allBuckets.length === 0) {
      const stockMatch = {};
      if (warehouseId) {
        stockMatch.warehouse = new mongoose.Types.ObjectId(warehouseId);
      }

      const currentStocks = await Stock.find(stockMatch)
        .populate('product')
        .populate('warehouse');

      // Group by category
      const categoryMap = {};
      currentStocks.forEach(stock => {
        if (!stock.product) return;
        const category = stock.product.category || 'Uncategorized';
        if (!categoryMap[category]) {
          categoryMap[category] = { units: 0, value: 0 };
        }
        categoryMap[category].units += stock.quantity || 0;
        const unitPrice = stock.product.costPrice || 0;
        categoryMap[category].value += (stock.quantity || 0) * unitPrice;
      });

      allBuckets = Object.entries(categoryMap).map(([category, data]) => ({
        category,
        units: parseFloat(data.units.toFixed(2)),
        value: parseFloat(data.value.toFixed(2))
      })).sort((a, b) => (metric === 'value' ? b.value - a.value : b.units - a.units));
    }

    // Calculate total
    const total = allBuckets.reduce((sum, bucket) => sum + (metric === 'value' ? bucket.value : bucket.units), 0);

    // Get top N and group rest as "Other"
    const topBuckets = allBuckets.slice(0, parseInt(topN));
    const remaining = allBuckets.slice(parseInt(topN));

    if (remaining.length > 0) {
      const otherValue = remaining.reduce((sum, bucket) => sum + (metric === 'value' ? bucket.value : bucket.units), 0);
      if (otherValue > 0) {
        topBuckets.push({
          category: 'Other',
          units: metric === 'units' ? otherValue : 0,
          value: metric === 'value' ? otherValue : 0
        });
      }
    }

    res.json({
      success: true,
      total: parseFloat(total.toFixed(2)),
      buckets: topBuckets.map(bucket => ({
        category: bucket.category,
        value: metric === 'value' ? bucket.value : bucket.units,
        percentOfTotal: total > 0 ? parseFloat((((metric === 'value' ? bucket.value : bucket.units) / total * 100).toFixed(2))) : 0
      })),
      meta: {
        metric,
        warehouseId: warehouseId || 'all',
        asOf: snapshotDate.toISOString().split('T')[0],
        topN: parseInt(topN)
      }
    });
  } catch (error) {
    console.error('Stock by category error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/reports/valuation
// @desc    Get stock valuation report
// @access  Private (Manager only)
router.get('/valuation', async (req, res) => {
  try {
    const { warehouseId, asOf } = req.query;
    const snapshotDate = asOf ? new Date(asOf) : new Date();

    const matchCriteria = {
      date: { $lte: snapshotDate }
    };

    if (warehouseId) {
      matchCriteria.warehouse = new mongoose.Types.ObjectId(warehouseId);
    }

    // Get latest snapshot for each product-warehouse
    const pipeline = [
      { $match: matchCriteria },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: {
            product: '$product',
            warehouse: '$warehouse'
          },
          latestSnapshot: { $first: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'latestSnapshot.product',
          foreignField: '_id',
          as: 'productData'
        }
      },
      { $unwind: '$productData' },
      {
        $lookup: {
          from: 'warehouses',
          localField: 'latestSnapshot.warehouse',
          foreignField: '_id',
          as: 'warehouseData'
        }
      },
      { $unwind: '$warehouseData' },
      {
        $project: {
          _id: 0,
          productId: '$latestSnapshot.product',
          productName: '$productData.name',
          sku: '$productData.sku',
          category: '$productData.category',
          warehouseId: '$latestSnapshot.warehouse',
          warehouseName: '$warehouseData.name',
          quantity: '$latestSnapshot.quantity',
          unitPrice: '$latestSnapshot.unitPrice',
          totalValue: { $round: ['$latestSnapshot.value', 2] }
        }
      },
      { $sort: { totalValue: -1 } }
    ];

    const valuation = await StockSnapshot.aggregate(pipeline);

    const totalValue = valuation.reduce((sum, item) => sum + item.totalValue, 0);

    res.json({
      success: true,
      valuation,
      summary: {
        totalItems: valuation.length,
        totalValue: parseFloat(totalValue.toFixed(2)),
        asOf: snapshotDate.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Valuation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/reports/generate
// @desc    Generate report asynchronously
// @access  Private (Manager only)
router.post('/generate', async (req, res) => {
  try {
    const { reportType, format, filters, notifyEmail } = req.body;

    // For now, return a simple job ID (in production, use a job queue like Bull)
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store job status (in production, use Redis or database)
    // For now, we'll process synchronously for small reports
    res.status(202).json({
      success: true,
      jobId,
      message: 'Report generation started',
      status: 'processing'
    });

    // In production, queue the job and process asynchronously
    // For now, this is a placeholder
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/reports/jobs/:jobId
// @desc    Get report generation job status
// @access  Private (Manager only)
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // In production, check job status from queue
    res.json({
      success: true,
      jobId,
      status: 'completed',
      downloadUrl: `/api/reports/download/${jobId}`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

