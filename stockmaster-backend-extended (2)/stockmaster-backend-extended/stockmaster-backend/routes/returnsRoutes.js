const express = require('express');
const {
  createRMA,
  getRMAs,
  updateRMA,
  completeRMA
} = require('../controllers/returnsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, createRMA).get(protect, getRMAs);
router.put('/:id', protect, updateRMA);
router.post('/:id/complete', protect, completeRMA);

module.exports = router;
