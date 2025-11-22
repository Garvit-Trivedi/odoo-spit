const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  unitOfMeasure: {
    type: String,
    required: [true, 'Unit of measure is required'],
    enum: ['kg', 'g', 'l', 'ml', 'pcs', 'box', 'pack', 'm', 'cm', 'bag', 'pieces', 'meter', 'sheet', 'piece', 'bucket', 'roll', 'pair', 'other'],
    default: 'pcs'
  },
  description: {
    type: String,
    trim: true
  },
  reorderLevel: {
    type: Number,
    default: 0,
    min: 0
  },
  reorderQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  costPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  sellingPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  initialStock: {
    type: Number,
    default: 0,
    min: 0
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

productSchema.index({ sku: 1 });
productSchema.index({ category: 1 });
productSchema.index({ name: 'text' });

module.exports = mongoose.model('Product', productSchema);

