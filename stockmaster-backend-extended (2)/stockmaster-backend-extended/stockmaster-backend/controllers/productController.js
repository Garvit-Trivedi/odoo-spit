const Product = require('../models/Product');
const { getStock } = require('../utils/stockHelpers');

// @desc    Create product
// @route   POST /api/products
// @access  Private (inventory_manager/admin)
const createProduct = async (req, res) => {
  try {
    const { name, sku, category, unitOfMeasure, initialStock, reorderLevel } =
      req.body;

    const exists = await Product.findOne({ sku });
    if (exists) {
      return res.status(400).json({ message: 'SKU already exists' });
    }

    const product = await Product.create({
      name,
      sku,
      category,
      unitOfMeasure,
      initialStock: initialStock || 0,
      reorderLevel: reorderLevel || 0
    });

    // Note: initialStock is *not* pushed to ledger automatically here.
    // You can create an opening balance adjustment if you want.

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res) => {
  try {
    const updates = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all products with stock per product
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    const stockMap = await getStock({});
    const result = products.map((p) => ({
      ...p.toObject(),
      currentStock: stockMap[p._id.toString()] || 0
    }));
    res.json(result);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: 'Product not found' });

    const stockMap = await getStock({ productId: product._id });
    const currentStock = stockMap[product._id.toString()] || 0;

    res.json({ ...product.toObject(), currentStock });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Search products by SKU / name
// @route   GET /api/products/search
// @access  Private
const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    const regex = new RegExp(q, 'i');
    const products = await Product.find({
      $or: [{ name: regex }, { sku: regex }]
    }).limit(20);
    res.json(products);
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  getProducts,
  getProduct,
  searchProducts
};
