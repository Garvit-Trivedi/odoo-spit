const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.get('/', (req, res) => {
  res.json({ message: 'StockMaster API is running' });
});

// Auth & profile
app.use('/api/auth', require('./routes/authRoutes'));

// Master data & settings
app.use('/api/warehouses', require('./routes/warehouseRoutes'));
app.use('/api/locations', require('./routes/locationRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/pos', require('./routes/poRoutes'));

// Operations
app.use('/api/receipts', require('./routes/receiptRoutes'));
app.use('/api/deliveries', require('./routes/deliveryRoutes'));
app.use('/api/transfers', require('./routes/transferRoutes'));
app.use('/api/adjustments', require('./routes/adjustmentRoutes'));
app.use('/api/returns', require('./routes/returnsRoutes'));
app.use('/api/cycle-counts', require('./routes/cycleCountRoutes'));

// Tasks & storage
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/storage', require('./routes/storageRoutes'));

// Stock, ledger, dashboard, analytics
app.use('/api/stock', require('./routes/stockRoutes'));
app.use('/api/ledger', require('./routes/ledgerRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/reports', require('./routes/analyticsRoutes'));
app.use('/api/forecast', require('./routes/forecastRoutes'));

// Exceptions & integrations
app.use('/api/exceptions', require('./routes/exceptionRoutes'));
app.use('/api/integrations', require('./routes/integrationRoutes'));

// Labels / barcode
app.use('/api/labels', require('./routes/labelRoutes'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`StockMaster backend running on port ${PORT}`);
});
