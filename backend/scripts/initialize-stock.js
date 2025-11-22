// Script to initialize stock for products
// Usage: node scripts/initialize-stock.js [warehouse-id]
// If no warehouse-id is provided, it will use the first warehouse found

const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Stock = require('../models/Stock');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stockmaster', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB Connected');
  
  try {
    // Get warehouse (use provided ID or first warehouse)
    const warehouseId = process.argv[2];
    let warehouse;
    
    if (warehouseId) {
      warehouse = await Warehouse.findById(warehouseId);
      if (!warehouse) {
        console.error('Warehouse not found with ID:', warehouseId);
        process.exit(1);
      }
    } else {
      warehouse = await Warehouse.findOne();
      if (!warehouse) {
        console.error('No warehouse found. Please create a warehouse first.');
        process.exit(1);
      }
    }
    
    console.log(`Using warehouse: ${warehouse.name} (${warehouse._id})`);
    
    // Get all products
    const products = await Product.find({});
    console.log(`Found ${products.length} products`);
    
    let created = 0;
    let updated = 0;
    
    for (const product of products) {
      // Check if stock record exists
      let stock = await Stock.findOne({
        product: product._id,
        warehouse: warehouse._id
      });
      
      // Use totalStock from product if available, otherwise use initialStock
      const initialQuantity = product.totalStock || product.initialStock || 0;
      
      if (stock) {
        // Update existing stock
        stock.quantity = initialQuantity;
        stock.lastUpdated = new Date();
        await stock.save();
        updated++;
        console.log(`Updated stock for ${product.name}: ${initialQuantity}`);
      } else {
        // Create new stock record
        stock = new Stock({
          product: product._id,
          warehouse: warehouse._id,
          quantity: initialQuantity,
          reservedQuantity: 0
        });
        await stock.save();
        created++;
        console.log(`Created stock for ${product.name}: ${initialQuantity}`);
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`- Created: ${created} stock records`);
    console.log(`- Updated: ${updated} stock records`);
    console.log(`- Total products: ${products.length}`);
    console.log('\nStock initialization complete!');
    
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


