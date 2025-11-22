const mongoose = require('mongoose');

const stockSnapshotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  },
  value: {
    type: Number,
    required: true,
    default: 0
  },
  unitPrice: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for fast queries
stockSnapshotSchema.index({ date: 1, warehouse: 1, product: 1 }, { unique: true });
stockSnapshotSchema.index({ date: 1, product: 1 });
stockSnapshotSchema.index({ date: 1, warehouse: 1 });

module.exports = mongoose.model('StockSnapshot', stockSnapshotSchema);

