const express = require('express');
const {
  createTransfer,
  getTransfers,
  validateTransfer
} = require('../controllers/transferController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, createTransfer).get(protect, getTransfers);
router.post('/:id/validate', protect, validateTransfer);

module.exports = router;
