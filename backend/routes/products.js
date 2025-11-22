const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Stock = require('../models/Stock');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   GET /api/products
// @desc    Get all products with stock information
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { category, search, warehouse } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    let products = await Product.find(query).sort({ createdAt: -1 });

    // If warehouse is specified, only show products that have stock in that warehouse
    if (warehouse) {
      const stocksInWarehouse = await Stock.find({ warehouse: warehouse }).distinct('product');
      products = products.filter(product => stocksInWarehouse.some(stockProductId => 
        stockProductId.toString() === product._id.toString()
      ));
    }

    // Always include stock information
    // If warehouse is specified, show stock for that warehouse, otherwise show total stock across all warehouses
    const productsWithStock = await Promise.all(
      products.map(async (product) => {
        if (warehouse) {
          // Show stock for specific warehouse
          const stock = await Stock.findOne({
            product: product._id,
            warehouse: warehouse
          });
          return {
            ...product.toObject(),
            stock: stock ? stock.quantity : 0,
            reservedQuantity: stock ? stock.reservedQuantity : 0
          };
        } else {
          // Show total stock across all warehouses with breakdown
          const stocks = await Stock.find({ product: product._id })
            .populate('warehouse', 'name');
          const totalStock = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
          const totalReserved = stocks.reduce((sum, stock) => sum + stock.reservedQuantity, 0);
          
          // Create warehouse breakdown
          const warehouseBreakdown = stocks.map(stock => ({
            warehouseId: stock.warehouse._id,
            warehouseName: stock.warehouse.name,
            quantity: stock.quantity,
            reservedQuantity: stock.reservedQuantity
          }));
          
          return {
            ...product.toObject(),
            stock: totalStock,
            reservedQuantity: totalReserved,
            warehouseBreakdown: warehouseBreakdown
          };
        }
      })
    );
    
    return res.json({ success: true, products: productsWithStock });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/products/categories/list
// @desc    Get all product categories
// @access  Private
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json({ success: true, categories: categories.sort() });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product with stock per warehouse
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const stocks = await Stock.find({ product: req.params.id })
      .populate('warehouse', 'name location');

    res.json({
      success: true,
      product: {
        ...product.toObject(),
        stocks: stocks
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/products
// @desc    Create a new product
// @access  Private (Manager only)
router.post('/',
  authorize('inventory_manager'), [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('unitOfMeasure').notEmpty().withMessage('Unit of measure is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, sku, category, unitOfMeasure, description, reorderLevel, reorderQuantity, initialStock, costPrice, sellingPrice } = req.body;

    // Check if SKU already exists
    const skuExists = await Product.findOne({ sku: sku.toUpperCase() });
    if (skuExists) {
      return res.status(400).json({ message: 'SKU already exists' });
    }

    const product = await Product.create({
      name,
      sku: sku.toUpperCase(),
      category,
      unitOfMeasure,
      description,
      reorderLevel: reorderLevel || 0,
      reorderQuantity: reorderQuantity || 0,
      initialStock: initialStock || 0,
      costPrice: costPrice || 0,
      sellingPrice: sellingPrice || 0
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private (Manager only)
router.put('/:id',
  authorize('inventory_manager'), [
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check SKU uniqueness if being updated
    if (req.body.sku && req.body.sku !== product.sku) {
      const skuExists = await Product.findOne({ sku: req.body.sku.toUpperCase() });
      if (skuExists) {
        return res.status(400).json({ message: 'SKU already exists' });
      }
      req.body.sku = req.body.sku.toUpperCase();
    }

    Object.assign(product, req.body);
    product.updatedAt = new Date();
    await product.save();

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private (Manager only)
router.delete('/:id',
  authorize('inventory_manager'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if product has stock
    const stocks = await Stock.find({ product: req.params.id });
    const hasStock = stocks.some(s => s.quantity > 0);

    if (hasStock) {
      return res.status(400).json({ message: 'Cannot delete product with existing stock' });
    }

    await product.deleteOne();
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/products/categories/list
// @desc    Get all categories
// @access  Private
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

