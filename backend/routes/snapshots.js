const express = require('express');
const createStockSnapshot = require('../utils/createStockSnapshot');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// All routes are protected and manager-only
router.use(protect);
router.use(authorize('inventory_manager'));

// @route   POST /api/snapshots/create
// @desc    Create stock snapshot for today (or specified date)
// @access  Private (Manager only)
router.post('/create', async (req, res) => {
  try {
    const { date } = req.body;
    const result = await createStockSnapshot(date ? new Date(date) : null);
    res.json({ success: true, message: `Created ${result.count} stock snapshots`, ...result });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

