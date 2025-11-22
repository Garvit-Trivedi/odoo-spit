const express = require('express');
const {
  createReceipt,
  getReceipts,
  validateReceipt
} = require('../controllers/receiptController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, createReceipt).get(protect, getReceipts);
router.post('/:id/validate', protect, validateReceipt);

module.exports = router;
