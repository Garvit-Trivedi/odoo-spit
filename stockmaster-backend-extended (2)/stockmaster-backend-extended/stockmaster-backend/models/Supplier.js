const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, unique: true, sparse: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String },
    notes: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', supplierSchema);
