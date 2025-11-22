const express = require('express');
const {
  createZone,
  getZones,
  createRack,
  getRacks,
  createBin,
  getBins,
  getWarehouseMap,
  assignProductToBin
} = require('../controllers/storageController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/zones', protect, createZone);
router.get('/zones', protect, getZones);

router.post('/racks', protect, createRack);
router.get('/racks', protect, getRacks);

router.post('/bins', protect, createBin);
router.get('/bins', protect, getBins);

router.get('/map', protect, getWarehouseMap);
router.post('/assign-product', protect, assignProductToBin);

module.exports = router;
