const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true },
    category: { type: String, trim: true },
    unitOfMeasure: { type: String, default: 'unit' },
    initialStock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 }, // for valuation
    batchNumber: { type: String },
    expiryDate: { type: Date },
    defaultBin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bin'
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
