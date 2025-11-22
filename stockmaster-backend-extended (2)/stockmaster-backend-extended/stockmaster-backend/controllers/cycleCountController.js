const CycleCountTask = require('../models/CycleCountTask');
const StockAdjustment = require('../models/StockAdjustment');
const StockLedgerEntry = require('../models/StockLedgerEntry');

// @desc    Create cycle count task
// @route   POST /api/cycle-counts
// @access  Private
const createCycleCountTask = async (req, res) => {
  try {
    const task = await CycleCountTask.create(req.body);
    res.status(201).json(task);
  } catch (error) {
    console.error('Create cycle count task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    List cycle count tasks
// @route   GET /api/cycle-counts
// @access  Private
const getCycleCountTasks = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    const tasks = await CycleCountTask.find(query)
      .populate('assignedTo')
      .populate('lines.product')
      .populate('lines.location')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error('Get cycle count tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Submit counts for a task line & reconcile
// @route   POST /api/cycle-counts/:id/submit
// @access  Private
const submitCycleCount = async (req, res) => {
  try {
    const task = await CycleCountTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const { lineIndex, countedQuantity, systemQuantity } = req.body;
    if (
      lineIndex == null ||
      lineIndex < 0 ||
      lineIndex >= task.lines.length
    ) {
      return res.status(400).json({ message: 'Invalid line index' });
    }

    const line = task.lines[lineIndex];
    line.countedQuantity = countedQuantity;
    line.expectedQuantity = systemQuantity;
    line.difference = countedQuantity - systemQuantity;

    // Create adjustment & ledger entry
    if (line.difference !== 0) {
      const adjustment = await StockAdjustment.create({
        product: line.product,
        location: line.location,
        systemQuantity,
        countedQuantity,
        difference: line.difference,
        reason: `Cycle count task ${task._id}`,
        status: 'Done',
        createdBy: req.user._id
      });

      await StockLedgerEntry.create({
        product: adjustment.product,
        quantityChange: adjustment.difference,
        fromLocation:
          adjustment.difference < 0 ? adjustment.location : null,
        toLocation:
          adjustment.difference > 0 ? adjustment.location : null,
        type: 'ADJUSTMENT',
        referenceDocType: 'StockAdjustment',
        referenceDocId: adjustment._id,
        note: adjustment.reason
      });
    }

    // If all lines have countedQuantity, mark task completed
    const allCounted = task.lines.every(
      (l) => typeof l.countedQuantity === 'number'
    );
    if (allCounted) {
      task.status = 'Completed';
    }

    await task.save();
    res.json(task);
  } catch (error) {
    console.error('Submit cycle count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createCycleCountTask,
  getCycleCountTasks,
  submitCycleCount
};
