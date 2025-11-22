const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const Receipt = require('../models/Receipt');

// @desc    Upload invoice (JSON + optional rawData)
// @route   POST /api/invoices
// @access  Private
const createInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.create(req.body);
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    List invoices
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate('supplier')
      .populate('purchaseOrder')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reconcile PO vs Invoice vs GRN (Receipts)
// @route   POST /api/invoices/:id/reconcile
// @access  Private
const reconcileInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate(
      'purchaseOrder'
    );
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const po = invoice.purchaseOrder;
    if (!po) {
      invoice.reconciliationStatus = 'Mismatch';
      invoice.reconciliationNotes = 'No linked purchase order.';
      await invoice.save();
      return res.json(invoice);
    }

    const receipts = await Receipt.find({ purchaseOrder: po._id });

    // Very basic reconciliation: compare total quantities per product.
    const poTotals = {};
    po.lines.forEach((line) => {
      poTotals[line.product.toString()] =
        (poTotals[line.product.toString()] || 0) + line.quantity;
    });

    const receiptTotals = {};
    receipts.forEach((r) => {
      r.lines.forEach((line) => {
        receiptTotals[line.product.toString()] =
          (receiptTotals[line.product.toString()] || 0) +
          (line.quantityReceived || line.quantityOrdered);
      });
    });

    const mismatches = [];

    Object.keys(poTotals).forEach((pid) => {
      const ordered = poTotals[pid];
      const received = receiptTotals[pid] || 0;
      if (ordered !== received) {
        mismatches.push({ productId: pid, ordered, received });
      }
    });

    invoice.reconciliationStatus = mismatches.length ? 'Mismatch' : 'Match';
    invoice.reconciliationNotes = mismatches.length
      ? 'Quantity mismatches found.'
      : 'PO, receipts look consistent.';
    await invoice.save();

    res.json({ invoice, mismatches });
  } catch (error) {
    console.error('Reconcile invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createInvoice, getInvoices, reconcileInvoice };
