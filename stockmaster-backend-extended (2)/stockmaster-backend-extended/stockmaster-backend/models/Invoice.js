const mongoose = require('mongoose');

const invoiceLineSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    description: { type: String },
    quantity: { type: Number },
    unitPrice: { type: Number }
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier'
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder'
    },
    number: { type: String },
    date: { type: Date },
    totalAmount: { type: Number },
    lines: [invoiceLineSchema],
    rawData: { type: Object }, // OCR/raw payload
    reconciliationStatus: {
      type: String,
      enum: ['Pending', 'Match', 'Mismatch', 'Resolved'],
      default: 'Pending'
    },
    reconciliationNotes: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
