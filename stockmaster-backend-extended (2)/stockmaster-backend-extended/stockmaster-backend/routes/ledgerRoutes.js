const express = require('express');
const { getLedgerEntries } = require('../controllers/ledgerController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getLedgerEntries);

module.exports = router;
