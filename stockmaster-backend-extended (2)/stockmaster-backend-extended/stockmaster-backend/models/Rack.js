const mongoose = require('mongoose');

const rackSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StorageZone',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Rack', rackSchema);
