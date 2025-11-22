const mongoose = require('mongoose');

const transferLineSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: { type: Number, required: true }
  },
  { _id: false }
);

const internalTransferSchema = new mongoose.Schema(
  {
    fromLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true
    },
    toLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true
    },
    status: {
      type: String,
      enum: ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'],
      default: 'Draft'
    },
    lines: [transferLineSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('InternalTransfer', internalTransferSchema);
