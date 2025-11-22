const Stock = require('../models/Stock');
const StockSnapshot = require('../models/StockSnapshot');
const Product = require('../models/Product');

/**
 * Create daily stock snapshots for trend analysis
 * Should be run daily via cron job
 */
const createStockSnapshot = async (date = null) => {
  try {
    const snapshotDate = date || new Date();
    snapshotDate.setHours(0, 0, 0, 0);

    // Get all stocks with product details
    const stocks = await Stock.find()
      .populate('product')
      .populate('warehouse');

    const snapshots = [];

    for (const stock of stocks) {
      if (!stock.product) continue;

      const unitPrice = stock.product.costPrice || 0;
      const value = (stock.quantity || 0) * unitPrice;

      snapshots.push({
        date: snapshotDate,
        product: stock.product._id,
        warehouse: stock.warehouse._id,
        quantity: stock.quantity || 0,
        value: value,
        unitPrice: unitPrice
      });
    }

    // Use bulk write with upsert to avoid duplicates
    if (snapshots.length > 0) {
      const bulkOps = snapshots.map(snapshot => ({
        updateOne: {
          filter: {
            date: snapshot.date,
            product: snapshot.product,
            warehouse: snapshot.warehouse
          },
          update: { $set: snapshot },
          upsert: true
        }
      }));

      await StockSnapshot.bulkWrite(bulkOps);
    }

    console.log(`Created ${snapshots.length} stock snapshots for ${snapshotDate.toISOString().split('T')[0]}`);
    return { success: true, count: snapshots.length };
  } catch (error) {
    console.error('Error creating stock snapshot:', error);
    throw error;
  }
};

module.exports = createStockSnapshot;

