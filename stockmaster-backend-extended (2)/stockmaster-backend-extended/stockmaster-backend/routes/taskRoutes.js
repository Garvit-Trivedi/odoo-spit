const express = require('express');
const {
  createTask,
  getTasks,
  updateTask
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, createTask).get(protect, getTasks);
router.put('/:id', protect, updateTask);

module.exports = router;
