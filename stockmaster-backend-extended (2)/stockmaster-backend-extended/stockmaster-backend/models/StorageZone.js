const mongoose = require('mongoose');

const storageZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StorageZone', storageZoneSchema);
