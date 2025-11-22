const mongoose = require('mongoose');

const adjustmentItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  recordedQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  countedQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  difference: {
    type: Number,
    required: true
  },
  unitPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  reason: {
    type: String,
    trim: true
  }
});

const adjustmentSchema = new mongoose.Schema({
  adjustmentNumber: {
    type: String,
    required: true,
    unique: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  items: [adjustmentItemSchema],
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

adjustmentSchema.index({ adjustmentNumber: 1 });
adjustmentSchema.index({ status: 1 });
adjustmentSchema.index({ warehouse: 1 });
adjustmentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Adjustment', adjustmentSchema);

