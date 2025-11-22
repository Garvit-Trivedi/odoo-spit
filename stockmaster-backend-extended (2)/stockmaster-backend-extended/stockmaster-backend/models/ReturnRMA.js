const mongoose = require('mongoose');

const rmaLineSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: { type: Number, required: true },
    reason: { type: String }
  },
  { _id: false }
);

const returnRMASchema = new mongoose.Schema(
  {
    rmaNumber: { type: String },
    source: {
      type: String,
      enum: ['CUSTOMER', 'SUPPLIER', 'INTERNAL'],
      default: 'CUSTOMER'
    },
    status: {
      type: String,
      enum: ['Open', 'QC', 'Completed', 'Canceled'],
      default: 'Open'
    },
    lines: [rmaLineSchema],
    qcResult: {
      type: String,
      enum: ['PENDING', 'PASS', 'FAIL'],
      default: 'PENDING'
    },
    disposition: {
      type: String,
      enum: ['RESTOCK', 'REPAIR', 'SCRAP', 'NONE'],
      default: 'NONE'
    },
    restockLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReturnRMA', returnRMASchema);
