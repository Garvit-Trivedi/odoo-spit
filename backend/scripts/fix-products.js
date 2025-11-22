// Script to fix products inserted directly into MongoDB
// Run this with: node scripts/fix-products.js

const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stockmaster', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB Connected');
  
  try {
    // Find all products
    const products = await Product.find({});
    console.log(`Found ${products.length} products`);
    
    // Update products to ensure they match the schema
    for (const product of products) {
      // Ensure unitOfMeasure is valid (convert if needed)
      const validUnits = ['kg', 'g', 'l', 'ml', 'pcs', 'box', 'pack', 'm', 'cm', 'bag', 'pieces', 'meter', 'sheet', 'piece', 'bucket', 'roll', 'pair', 'other'];
      
      let unit = product.unitOfMeasure;
      if (!validUnits.includes(unit)) {
        // Map common variations
        const unitMap = {
          'bag': 'bag',
          'bags': 'bag',
          'pieces': 'pieces',
          'piece': 'piece',
          'meter': 'meter',
          'meters': 'meter',
          'm': 'm',
          'sheet': 'sheet',
          'sheets': 'sheet',
          'bucket': 'bucket',
          'buckets': 'bucket',
          'roll': 'roll',
          'rolls': 'roll',
          'pair': 'pair',
          'pairs': 'pair'
        };
        unit = unitMap[unit?.toLowerCase()] || 'other';
        product.unitOfMeasure = unit;
        console.log(`Updated ${product.name} unitOfMeasure to: ${unit}`);
      }
      
      // Ensure required fields have defaults
      if (!product.reorderLevel) product.reorderLevel = 0;
      if (!product.reorderQuantity) product.reorderQuantity = 0;
      if (!product.initialStock) product.initialStock = 0;
      
      await product.save();
    }
    
    console.log('Products updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});


