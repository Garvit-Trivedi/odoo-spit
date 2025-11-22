const PurchaseOrder = require('../models/PurchaseOrder');
const Receipt = require('../models/Receipt');

// @desc    Create Purchase Order
// @route   POST /api/pos
// @access  Private
const createPO = async (req, res) => {
  try {
    const po = await PurchaseOrder.create(req.body);
    res.status(201).json(po);
  } catch (error) {
    console.error('Create PO error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update Purchase Order (quantities, dates, etc.)
// @route   PUT /api/pos/:id
// @access  Private
const updatePO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!po) return res.status(404).json({ message: 'PO not found' });
    res.json(po);
  } catch (error) {
    console.error('Update PO error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Approve PO
// @route   POST /api/pos/:id/approve
// @access  Private
const approvePO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'PO not found' });
    po.status = 'Approved';
    await po.save();
    res.json(po);
  } catch (error) {
    console.error('Approve PO error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Cancel PO
// @route   POST /api/pos/:id/cancel
// @access  Private
const cancelPO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'PO not found' });
    po.status = 'Canceled';
    await po.save();
    res.json(po);
  } catch (error) {
    console.error('Cancel PO error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    List POs with basic filters
// @route   GET /api/pos
// @access  Private
const getPOs = async (req, res) => {
  try {
    const { status, supplierId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (supplierId) query.supplier = supplierId;
    const pos = await PurchaseOrder.find(query)
      .populate('supplier')
      .populate('lines.product')
      .sort({ createdAt: -1 });
    res.json(pos);
  } catch (error) {
    console.error('Get POs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Map PO -> Receipts
// @route   GET /api/pos/:id/receipts
// @access  Private
const getPOReceipts = async (req, res) => {
  try {
    const receipts = await Receipt.find({ purchaseOrder: req.params.id }).sort({
      createdAt: -1
    });
    res.json(receipts);
  } catch (error) {
    console.error('PO receipts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createPO,
  updatePO,
  approvePO,
  cancelPO,
  getPOs,
  getPOReceipts
};
