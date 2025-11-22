const mongoose = require('mongoose');

const stockLedgerEntrySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantityChange: {
      type: Number,
      required: true
    },
    fromLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    },
    toLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    },
    type: {
      type: String,
      enum: ['RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT'],
      required: true
    },
    referenceDocType: {
      type: String,
      enum: ['Receipt', 'DeliveryOrder', 'InternalTransfer', 'StockAdjustment']
    },
    referenceDocId: {
      type: mongoose.Schema.Types.ObjectId
    },
    note: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockLedgerEntry', stockLedgerEntrySchema);
