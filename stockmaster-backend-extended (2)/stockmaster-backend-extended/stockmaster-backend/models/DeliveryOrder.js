const mongoose = require('mongoose');

const deliveryLineSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: { type: Number, required: true },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true
    }
  },
  { _id: false }
);

const deliveryOrderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    referenceNumber: { type: String },
    status: {
      type: String,
      enum: ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'],
      default: 'Draft'
    },
    lines: [deliveryLineSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryOrder', deliveryOrderSchema);
