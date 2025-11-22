const WebhookConfig = require('../models/WebhookConfig');
const { dispatchEvent } = require('../utils/webhookDispatcher');

// @desc    Create webhook config
// @route   POST /api/integrations/webhooks
// @access  Private
const createWebhook = async (req, res) => {
  try {
    const hook = await WebhookConfig.create(req.body);
    res.status(201).json(hook);
  } catch (error) {
    console.error('Create webhook error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    List webhook configs
// @route   GET /api/integrations/webhooks
// @access  Private
const getWebhooks = async (req, res) => {
  try {
    const hooks = await WebhookConfig.find().sort({ createdAt: -1 });
    res.json(hooks);
  } catch (error) {
    console.error('Get webhooks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Test webhook dispatch (manual)
// @route   POST /api/integrations/webhooks/test
// @access  Private
const testWebhook = async (req, res) => {
  try {
    const { eventType, payload } = req.body;
    await dispatchEvent(eventType, payload || { test: true });
    res.json({ message: 'Webhook dispatch simulated (see server logs).' });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    CSV import (simple) for products
// @route   POST /api/integrations/import/products
// @access  Private
const importProductsFromCSV = async (req, res) => {
  try {
    const csv = req.body.csv;
    if (!csv) {
      return res
        .status(400)
        .json({ message: 'Provide CSV content in `csv` field.' });
    }

    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length);
    if (lines.length < 2) {
      return res.status(400).json({ message: 'CSV must include header + rows' });
    }

    const header = lines[0].split(',').map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(',');
      const obj = {};
      header.forEach((h, idx) => {
        obj[h] = cols[idx] ? cols[idx].trim() : null;
      });
      return obj;
    });

    res.json({
      message:
        'CSV parsed successfully. You can now map these rows to actual Product.create calls in a separate step.',
      parsedPreview: rows.slice(0, 10)
    });
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createWebhook,
  getWebhooks,
  testWebhook,
  importProductsFromCSV
};
