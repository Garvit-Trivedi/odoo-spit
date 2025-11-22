const mongoose = require('mongoose');

const poLineSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, default: 0 }
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true
    },
    eta: { type: Date }, // expected delivery date
    status: {
      type: String,
      enum: ['Draft', 'Approved', 'Canceled', 'Completed'],
      default: 'Draft'
    },
    referenceNumber: { type: String },
    lines: [poLineSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
