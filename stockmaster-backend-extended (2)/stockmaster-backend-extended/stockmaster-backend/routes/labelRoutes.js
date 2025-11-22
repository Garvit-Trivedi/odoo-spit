const express = require('express');
const {
  getProductBarcode,
  getBinQR
} = require('../controllers/labelController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/product/:id', protect, getProductBarcode);
router.get('/bin/:id', protect, getBinQR);

module.exports = router;
