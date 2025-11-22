const mongoose = require('mongoose');

const userTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['PICK', 'RECEIVE', 'COUNT', 'OTHER'],
      default: 'OTHER'
    },
    relatedDocumentType: {
      type: String,
      enum: ['Receipt', 'DeliveryOrder', 'InternalTransfer', 'StockAdjustment', null],
      default: null
    },
    relatedDocumentId: {
      type: mongoose.Schema.Types.ObjectId
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Done', 'Canceled'],
      default: 'Open'
    },
    dueDate: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserTask', userTaskSchema);
