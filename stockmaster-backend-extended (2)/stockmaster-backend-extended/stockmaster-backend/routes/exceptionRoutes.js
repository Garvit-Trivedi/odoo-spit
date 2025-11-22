const express = require('express');
const {
  createException,
  getExceptions,
  updateException
} = require('../controllers/exceptionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, createException).get(protect, getExceptions);
router.put('/:id', protect, updateException);

module.exports = router;
