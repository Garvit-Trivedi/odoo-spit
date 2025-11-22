const mongoose = require('mongoose');

const deliveryItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  pickedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  packedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  unitPrice: {
    type: Number,
    default: 0,
    min: 0
  }
});

const deliverySchema = new mongoose.Schema({
  deliveryNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  items: [deliveryItemSchema],
  status: {
    type: String,
    enum: ['draft', 'waiting', 'ready', 'done', 'canceled'],
    default: 'draft'
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  validatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  validatedAt: {
    type: Date
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

deliverySchema.index({ deliveryNumber: 1 });
deliverySchema.index({ status: 1 });
deliverySchema.index({ warehouse: 1 });
deliverySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Delivery', deliverySchema);

