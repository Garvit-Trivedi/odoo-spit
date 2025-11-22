const UserTask = require('../models/UserTask');

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    const task = await UserTask.create(req.body);
    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    List tasks (optionally by assignedTo)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    const { assignedTo, status } = req.query;
    const query = {};
    if (assignedTo) query.assignedTo = assignedTo;
    if (status) query.status = status;

    const tasks = await UserTask.find(query)
      .populate('assignedTo')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update task (mark done etc.)
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const task = await UserTask.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createTask, getTasks, updateTask };
