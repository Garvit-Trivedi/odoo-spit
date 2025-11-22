const Product = require('../models/Product');
const Bin = require('../models/Bin');

// @desc    Generate product barcode payload (string)
// @route   GET /api/labels/product/:id
// @access  Private
const getProductBarcode = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: 'Product not found' });

    // For hackathon: we just return data to encode as barcode.
    const payload = {
      type: 'PRODUCT',
      sku: product.sku,
      name: product.name,
      id: product._id
    };

    res.json({ payload });
  } catch (error) {
    console.error('Get product barcode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Generate bin QR payload
// @route   GET /api/labels/bin/:id
// @access  Private
const getBinQR = async (req, res) => {
  try {
    const bin = await Bin.findById(req.params.id).populate({
      path: 'rack',
      populate: { path: 'zone' }
    });
    if (!bin) return res.status(404).json({ message: 'Bin not found' });

    const payload = {
      type: 'BIN',
      binId: bin._id,
      binCode: bin.code,
      rackId: bin.rack._id,
      rackCode: bin.rack.code,
      zoneId: bin.rack.zone._id,
      zoneCode: bin.rack.zone.code
    };

    res.json({ payload });
  } catch (error) {
    console.error('Get bin QR error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getProductBarcode, getBinQR };
