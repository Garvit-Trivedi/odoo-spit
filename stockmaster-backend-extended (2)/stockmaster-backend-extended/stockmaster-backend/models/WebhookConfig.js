const mongoose = require('mongoose');

const webhookConfigSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    eventType: {
      type: String,
      enum: ['RECEIPT_VALIDATED', 'DELIVERY_VALIDATED', 'ADJUSTMENT_VALIDATED'],
      required: true
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('WebhookConfig', webhookConfigSchema);
