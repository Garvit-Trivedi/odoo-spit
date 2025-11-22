const express = require('express');
const {
  createCycleCountTask,
  getCycleCountTasks,
  submitCycleCount
} = require('../controllers/cycleCountController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router
  .route('/')
  .post(protect, createCycleCountTask)
  .get(protect, getCycleCountTasks);

router.post('/:id/submit', protect, submitCycleCount);

module.exports = router;
