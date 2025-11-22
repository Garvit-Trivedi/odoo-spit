const express = require('express');
const {
  createInvoice,
  getInvoices,
  reconcileInvoice
} = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, createInvoice).get(protect, getInvoices);
router.post('/:id/reconcile', protect, reconcileInvoice);

module.exports = router;
