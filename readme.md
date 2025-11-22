# odoo spit

# StockMaster - Inventory Management System

# backend deployment link : https://odoo-spit-1.onrender.com

A comprehensive Inventory Management System built with the MERN stack (MongoDB, Express, React, Node.js) that digitizes and streamlines all stock-related operations within a business.

## Features

### Authentication
- User signup and login
- OTP-based password reset
- Role-based access (Inventory Manager / Warehouse Staff)

### Dashboard
- Real-time KPIs (Total Products, Low Stock, Out of Stock, Pending Receipts/Deliveries, Scheduled Transfers)
- Dynamic filters by document type, status, and warehouse
- Recent activities overview

### Product Management
- Create, update, and delete products
- Product categories
- SKU management
- Stock availability per location
- Reordering rules (reorder level and quantity)

### Operations
1. **Receipts (Incoming Stock)**
   - Create receipts from suppliers
   - Add multiple products with quantities
   - Validate receipts to automatically increase stock

2. **Delivery Orders (Outgoing Stock)**
   - Create delivery orders for customers
   - Pick and pack items
   - Validate deliveries to automatically decrease stock

3. **Internal Transfers**
   - Move stock between warehouses
   - Track transfers from source to destination
   - Automatic stock updates in both warehouses

4. **Stock Adjustments**
   - Fix stock discrepancies
   - Compare recorded vs. counted quantities
   - Automatic stock correction

5. **Stock Ledger**
   - Complete movement history
   - Filter by product, warehouse, document type, and date range
   - Track all stock transactions

### Settings
- Warehouse management (create, update, delete)
- Multi-warehouse support

### Profile
- User profile information
- Account details

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Nodemailer for OTP emails
- bcryptjs for password hashing

### Frontend
- React
- React Router for navigation
- Axios for API calls
- React Icons
- React Toastify for notifications

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Backend Setup

1. Navigate to the root directory:
```bash
cd .
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/stockmaster
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development

# Email Configuration for OTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

4. Start the backend server:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage

1. **Register/Login**: Create an account or login with existing credentials
2. **Create Warehouses**: Go to Settings and add warehouses
3. **Add Products**: Navigate to Products and create products with initial stock
4. **Receive Stock**: Create receipts when goods arrive from suppliers
5. **Deliver Stock**: Create delivery orders when stock leaves for customers
6. **Transfer Stock**: Move stock between warehouses using Internal Transfers
7. **Adjust Stock**: Fix discrepancies using Stock Adjustments
8. **View History**: Check the Stock Ledger for complete movement history

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/forgot-password` - Send OTP for password reset
- `POST /api/auth/reset-password` - Reset password with OTP
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/categories/list` - Get all categories

### Warehouses
- `GET /api/warehouses` - Get all warehouses
- `GET /api/warehouses/:id` - Get single warehouse
- `POST /api/warehouses` - Create warehouse
- `PUT /api/warehouses/:id` - Update warehouse
- `DELETE /api/warehouses/:id` - Delete warehouse

### Receipts
- `GET /api/receipts` - Get all receipts
- `GET /api/receipts/:id` - Get single receipt
- `POST /api/receipts` - Create receipt
- `PUT /api/receipts/:id` - Update receipt
- `POST /api/receipts/:id/validate` - Validate receipt (updates stock)
- `DELETE /api/receipts/:id` - Delete receipt

### Deliveries
- `GET /api/deliveries` - Get all deliveries
- `GET /api/deliveries/:id` - Get single delivery
- `POST /api/deliveries` - Create delivery
- `PUT /api/deliveries/:id` - Update delivery
- `POST /api/deliveries/:id/validate` - Validate delivery (decreases stock)
- `DELETE /api/deliveries/:id` - Delete delivery

### Transfers
- `GET /api/transfers` - Get all transfers
- `GET /api/transfers/:id` - Get single transfer
- `POST /api/transfers` - Create transfer
- `PUT /api/transfers/:id` - Update transfer
- `POST /api/transfers/:id/validate` - Validate transfer (moves stock)
- `DELETE /api/transfers/:id` - Delete transfer

### Adjustments
- `GET /api/adjustments` - Get all adjustments
- `GET /api/adjustments/:id` - Get single adjustment
- `POST /api/adjustments` - Create adjustment
- `PUT /api/adjustments/:id` - Update adjustment
- `POST /api/adjustments/:id/validate` - Validate adjustment (corrects stock)
- `DELETE /api/adjustments/:id` - Delete adjustment

### Dashboard
- `GET /api/dashboard/kpis` - Get dashboard KPIs
- `GET /api/dashboard/recent-activities` - Get recent activities

### Ledger
- `GET /api/ledger` - Get stock ledger
- `GET /api/ledger/product/:productId` - Get ledger for specific product

## Project Structure

```
.
├── client/                 # React frontend
│   ├── public/
│   └── src/
│       ├── components/    # Reusable components
│       ├── context/       # React context
│       ├── pages/         # Page components
│       └── App.js
├── models/                # MongoDB models
├── routes/                # API routes
├── middleware/            # Express middleware
├── utils/                 # Utility functions
├── server.js             # Express server
└── package.json
```

## Notes

- All API routes (except auth) require authentication via JWT token
- Stock is automatically updated when receipts, deliveries, transfers, or adjustments are validated
- The system maintains a complete ledger of all stock movements
- Low stock alerts are shown on the dashboard based on reorder levels

## License

This project is open source and available under the MIT License.

>>>>>>> origin/master
