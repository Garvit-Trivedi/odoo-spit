const mongoose = require('mongoose');

const cycleCountLineSchema = new mongoose.Schema(
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
    expectedQuantity: { type: Number },
    countedQuantity: { type: Number },
    difference: { type: Number }
  },
  { _id: false }
);

const cycleCountTaskSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Completed', 'Canceled'],
      default: 'Open'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lines: [cycleCountLineSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('CycleCountTask', cycleCountTaskSchema);
