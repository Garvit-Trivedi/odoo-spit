const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true
    },
    systemQuantity: { type: Number, required: true },
    countedQuantity: { type: Number, required: true },
    difference: { type: Number, required: true },
    reason: { type: String },
    status: {
      type: String,
      enum: ['Draft', 'Done', 'Canceled'],
      default: 'Draft'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema);
