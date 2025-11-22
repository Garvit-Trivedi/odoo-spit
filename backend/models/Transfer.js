const mongoose = require('mongoose');

const transferItemSchema = new mongoose.Schema({
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

const transferSchema = new mongoose.Schema({
  transferNumber: {
    type: String,
    required: true,
    unique: true
  },
  fromWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  toWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  items: [transferItemSchema],
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

transferSchema.index({ transferNumber: 1 });
transferSchema.index({ status: 1 });
transferSchema.index({ fromWarehouse: 1, toWarehouse: 1 });
transferSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transfer', transferSchema);

