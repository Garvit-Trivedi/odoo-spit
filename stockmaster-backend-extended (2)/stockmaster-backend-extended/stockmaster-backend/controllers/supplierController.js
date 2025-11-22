const Supplier = require('../models/Supplier');
const Receipt = require('../models/Receipt');
const PurchaseOrder = require('../models/PurchaseOrder');

// @desc    Create supplier
// @route   POST /api/suppliers
// @access  Private
const createSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private
const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Vendor performance metrics (very simple)
// @route   GET /api/suppliers/:id/performance
// @access  Private
const getSupplierPerformance = async (req, res) => {
  try {
    const supplierId = req.params.id;

    const [poList, receipts] = await Promise.all([
      PurchaseOrder.find({ supplier: supplierId }),
      Receipt.find({ supplier: supplierId })
    ]);

    const totalPOs = poList.length;
    const totalReceipts = receipts.length;

    // Simple on-time metric based on PO.eta vs receipt.createdAt
    let onTime = 0;
    let withEta = 0;

    poList.forEach((po) => {
      if (!po.eta) return;
      withEta += 1;
      const relatedReceipt = receipts.find(
        (r) => r.referenceNumber && r.referenceNumber === po.referenceNumber
      );
      if (relatedReceipt && relatedReceipt.createdAt <= po.eta) {
        onTime += 1;
      }
    });

    const onTimeRate = withEta ? Math.round((onTime / withEta) * 100) : null;

    res.json({
      totalPOs,
      totalReceipts,
      onTimeRate,
      etaTracked: withEta
    });
  } catch (error) {
    console.error('Supplier performance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createSupplier,
  getSuppliers,
  updateSupplier,
  getSupplierPerformance
};
