# StockMaster Backend (Node + Express + MongoDB)

Hackathon-ready backend for **StockMaster** – a modular Inventory Management System.

## Tech Stack

- Node.js
- Express
- MongoDB + Mongoose
- JWT Auth

## Major Domains Implemented

- Authentication & Users (signup, login, OTP reset, profile)
- Products, Warehouses, Locations, Bins/Racks/Zones
- Suppliers & Purchase Orders
- Receipts, Deliveries, Internal Transfers
- Stock Adjustments, Cycle Counting
- Returns / RMA
- Stock Ledger & Move History
- Dashboard KPIs & Alerts
- Demand Forecasting & Inventory Health
- User Task Assignment
- Exceptions/Issues
- Integrations (webhooks stub + CSV parsing)
- Analytics & valuation
- Label / barcode payloads (product & bin)

Full details are in the route files inside `routes/` and controller files inside `controllers/`.

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment file:

   ```bash
   cp .env.example .env
   ```

   Update:

   - `MONGO_URI`
   - `JWT_SECRET`
   - `CLIENT_URL` (for CORS)

3. Run the app:

   ```bash
   npm run dev
   ```

The API will run on **http://localhost:5000** by default.

Use Postman/Insomnia or your React frontend to explore all modules.
