const mongoose = require('mongoose');

const stockLedgerSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  documentType: {
    type: String,
    enum: ['receipt', 'delivery', 'transfer_in', 'transfer_out', 'adjustment', 'initial'],
    required: true
  },
  documentNumber: {
    type: String,
    required: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  balance: {
    type: Number,
    required: true
  },
  reference: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

stockLedgerSchema.index({ product: 1, warehouse: 1, createdAt: -1 });
stockLedgerSchema.index({ documentType: 1, documentId: 1 });
stockLedgerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StockLedger', stockLedgerSchema);

