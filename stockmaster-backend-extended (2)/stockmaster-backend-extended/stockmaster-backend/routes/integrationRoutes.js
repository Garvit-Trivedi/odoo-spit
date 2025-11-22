const express = require('express');
const {
  createWebhook,
  getWebhooks,
  testWebhook,
  importProductsFromCSV
} = require('../controllers/integrationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router
  .route('/webhooks')
  .post(protect, createWebhook)
  .get(protect, getWebhooks);

router.post('/webhooks/test', protect, testWebhook);

router.post('/import/products', protect, importProductsFromCSV);

module.exports = router;
