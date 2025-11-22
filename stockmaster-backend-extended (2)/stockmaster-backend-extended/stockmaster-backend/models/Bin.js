const mongoose = require('mongoose');

const binSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    rack: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rack',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bin', binSchema);
