const DeliveryOrder = require('../models/DeliveryOrder');
const StockLedgerEntry = require('../models/StockLedgerEntry');

// @desc    Create delivery order
// @route   POST /api/deliveries
// @access  Private
const createDeliveryOrder = async (req, res) => {
  try {
    const { customerName, referenceNumber, lines, status } = req.body;

    const delivery = await DeliveryOrder.create({
      customerName,
      referenceNumber,
      lines,
      status: status || 'Draft',
      createdBy: req.user._id
    });

    res.status(201).json(delivery);
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get delivery orders with filters (status, warehouse, location, product, category)
// @route   GET /api/deliveries
// @access  Private
const getDeliveryOrders = async (req, res) => {
  try {
    const { status, warehouseId, locationId, productId, category } = req.query;
    const query = {};
    if (status) query.status = status;

    let deliveries = await DeliveryOrder.find(query)
      .populate({
        path: 'lines.product',
        select: 'name sku category'
      })
      .populate({
        path: 'lines.location',
        populate: { path: 'warehouse' }
      })
      .sort({ createdAt: -1 });

    if (warehouseId) {
      deliveries = deliveries.filter((d) =>
        d.lines.some(
          (line) =>
            line.location &&
            line.location.warehouse &&
            line.location.warehouse._id.toString() === warehouseId
        )
      );
    }

    if (locationId) {
      deliveries = deliveries.filter((d) =>
        d.lines.some(
          (line) =>
            line.location && line.location._id.toString() === locationId
        )
      );
    }

    if (productId) {
      deliveries = deliveries.filter((d) =>
        d.lines.some(
          (line) =>
            line.product && line.product._id.toString() === productId
        )
      );
    }

    if (category) {
      deliveries = deliveries.filter((d) =>
        d.lines.some(
          (line) =>
            line.product &&
            line.product.category &&
            line.product.category.toLowerCase() === category.toLowerCase()
        )
      );
    }

    res.json(deliveries);
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Validate delivery -> decrease stock and mark Done
// @route   POST /api/deliveries/:id/validate
// @access  Private
const validateDeliveryOrder = async (req, res) => {
  try {
    const delivery = await DeliveryOrder.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery order not found' });
    }
    if (delivery.status === 'Done') {
      return res.status(400).json({ message: 'Delivery already validated' });
    }

    const ledgerEntries = delivery.lines.map((line) => ({
      product: line.product,
      quantityChange: -Math.abs(line.quantity),
      fromLocation: line.location,
      toLocation: null,
      type: 'DELIVERY',
      referenceDocType: 'DeliveryOrder',
      referenceDocId: delivery._id,
      note: `Delivery to ${delivery.customerName}`
    }));

    await StockLedgerEntry.insertMany(ledgerEntries);
    delivery.status = 'Done';
    await delivery.save();

    res.json({ message: 'Delivery validated', delivery });
  } catch (error) {
    console.error('Validate delivery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createDeliveryOrder,
  getDeliveryOrders,
  validateDeliveryOrder
};
