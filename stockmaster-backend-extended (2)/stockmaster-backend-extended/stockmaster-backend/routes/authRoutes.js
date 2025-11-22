const express = require('express');
const {
  register,
  login,
  requestReset,
  resetPassword,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/request-reset', requestReset);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
