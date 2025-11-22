const express = require('express');
const {
  createPO,
  updatePO,
  approvePO,
  cancelPO,
  getPOs,
  getPOReceipts
} = require('../controllers/poController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, createPO).get(protect, getPOs);
router.put('/:id', protect, updatePO);
router.post('/:id/approve', protect, approvePO);
router.post('/:id/cancel', protect, cancelPO);
router.get('/:id/receipts', protect, getPOReceipts);

module.exports = router;
