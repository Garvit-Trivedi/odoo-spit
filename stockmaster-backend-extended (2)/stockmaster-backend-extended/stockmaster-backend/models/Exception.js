const mongoose = require('mongoose');

const exceptionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['STOCK_MISMATCH', 'SCANNING_ISSUE', 'MISSING_ITEM', 'OTHER'],
      default: 'OTHER'
    },
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Canceled'],
      default: 'Open'
    },
    relatedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    relatedLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exception', exceptionSchema);
