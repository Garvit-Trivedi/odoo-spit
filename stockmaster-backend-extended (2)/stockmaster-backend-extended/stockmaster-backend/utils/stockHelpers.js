const mongoose = require('mongoose');
const StockLedgerEntry = require('../models/StockLedgerEntry');

/**
 * Get current stock aggregated by product.
 * Optional filters: productId, locationId, warehouseId
 */
const getStock = async ({ productId, locationId, warehouseId } = {}) => {
  const match = {};
  if (productId) {
    match.product = new mongoose.Types.ObjectId(productId);
  }

  // If we want to filter by location or warehouse, we need to resolve via aggregation
  const pipeline = [{ $match: match }];

  if (locationId || warehouseId) {
    pipeline.push({
      $addFields: {
        effectiveLocation: {
          $ifNull: ['$toLocation', '$fromLocation']
        }
      }
    });

    if (locationId) {
      pipeline.push({
        $match: {
          effectiveLocation: new mongoose.Types.ObjectId(locationId)
        }
      });
    }

    if (warehouseId) {
      // Join with locations to filter by warehouse
      pipeline.push(
        {
          $lookup: {
            from: 'locations',
            localField: 'effectiveLocation',
            foreignField: '_id',
            as: 'loc'
          }
        },
        { $unwind: '$loc' },
        {
          $match: {
            'loc.warehouse': new mongoose.Types.ObjectId(warehouseId)
          }
        }
      );
    }
  }

  pipeline.push({
    $group: {
      _id: '$product',
      quantity: { $sum: '$quantityChange' }
    }
  });

  const rows = await StockLedgerEntry.aggregate(pipeline);
  const map = {};
  rows.forEach((r) => {
    map[r._id.toString()] = r.quantity;
  });
  return map;
};

/**
 * Get stock grouped by product and location.
 * Optional filters: productId, warehouseId, locationId
 */
const getStockByLocation = async ({ productId, warehouseId, locationId } = {}) => {
  const match = {};
  if (productId) {
    match.product = new mongoose.Types.ObjectId(productId);
  }

  const pipeline = [
    { $match: match },
    {
      $addFields: {
        effectiveLocation: {
          $ifNull: ['$toLocation', '$fromLocation']
        }
      }
    },
    {
      $match: {
        effectiveLocation: { $ne: null }
      }
    }
  ];

  if (locationId) {
    pipeline.push({
      $match: {
        effectiveLocation: new mongoose.Types.ObjectId(locationId)
      }
    });
  }

  // Join with locations for warehouse filtering and richer info
  pipeline.push(
    {
      $lookup: {
        from: 'locations',
        localField: 'effectiveLocation',
        foreignField: '_id',
        as: 'loc'
      }
    },
    { $unwind: '$loc' }
  );

  if (warehouseId) {
    pipeline.push({
      $match: {
        'loc.warehouse': new mongoose.Types.ObjectId(warehouseId)
      }
    });
  }

  pipeline.push({
    $group: {
      _id: {
        product: '$product',
        location: '$effectiveLocation'
      },
      quantity: { $sum: '$quantityChange' },
      locationName: { $first: '$loc.name' },
      warehouseId: { $first: '$loc.warehouse' }
    }
  });

  return StockLedgerEntry.aggregate(pipeline);
};

module.exports = { getStock, getStockByLocation };
