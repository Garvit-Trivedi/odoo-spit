const mongoose = require('mongoose');

const receiptItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    default: 0,
    min: 0
  }
});

const receiptSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  supplier: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  items: [receiptItemSchema],
  status: {
    type: String,
    enum: ['draft', 'waiting', 'ready', 'done', 'canceled'],
    default: 'draft'
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  validatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  validatedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

receiptSchema.index({ receiptNumber: 1 });
receiptSchema.index({ status: 1 });
receiptSchema.index({ warehouse: 1 });
receiptSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Receipt', receiptSchema);

