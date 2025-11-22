const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const StockLedger = require('../models/StockLedger');

const updateStock = async (productId, warehouseId, quantity, documentType, documentNumber, documentId, userId, reference = '') => {
  try {
    // Ensure productId and warehouseId are ObjectIds
    const productObjectId = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;
    const warehouseObjectId = typeof warehouseId === 'string' ? new mongoose.Types.ObjectId(warehouseId) : warehouseId;

    // Find or create stock record
    let stock = await Stock.findOne({ product: productObjectId, warehouse: warehouseObjectId });

    if (!stock) {
      stock = new Stock({
        product: productObjectId,
        warehouse: warehouseObjectId,
        quantity: 0
      });
    }

    // Update stock quantity
    const oldQuantity = stock.quantity;
    stock.quantity += quantity;
    
    if (stock.quantity < 0) {
      throw new Error('Insufficient stock');
    }

    stock.lastUpdated = new Date();
    await stock.save();

    // Create ledger entry
    const ledgerEntry = new StockLedger({
      product: productObjectId,
      warehouse: warehouseObjectId,
      documentType,
      documentNumber,
      documentId,
      quantity,
      balance: stock.quantity,
      reference,
      createdBy: userId
    });

    await ledgerEntry.save();

    return {
      oldQuantity,
      newQuantity: stock.quantity,
      stock
    };
  } catch (error) {
    console.error('Error in updateStock:', error);
    throw error;
  }
};

module.exports = updateStock;
