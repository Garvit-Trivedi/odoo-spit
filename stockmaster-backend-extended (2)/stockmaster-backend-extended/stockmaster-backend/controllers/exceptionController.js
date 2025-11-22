const Exception = require('../models/Exception');

// @desc    Create exception
// @route   POST /api/exceptions
// @access  Private
const createException = async (req, res) => {
  try {
    const exception = await Exception.create({
      ...req.body,
      createdBy: req.user._id
    });
    res.status(201).json(exception);
  } catch (error) {
    console.error('Create exception error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    List exceptions
// @route   GET /api/exceptions
// @access  Private
const getExceptions = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    const list = await Exception.find(query)
      .populate('relatedProduct')
      .populate('relatedLocation')
      .populate('createdBy')
      .populate('resolvedBy')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    console.error('Get exceptions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Resolve / update exception
// @route   PUT /api/exceptions/:id
// @access  Private
const updateException = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.status === 'Resolved') {
      updates.resolvedBy = req.user._id;
    }
    const ex = await Exception.findByIdAndUpdate(req.params.id, updates, {
      new: true
    });
    if (!ex) return res.status(404).json({ message: 'Exception not found' });
    res.json(ex);
  } catch (error) {
    console.error('Update exception error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createException, getExceptions, updateException };
