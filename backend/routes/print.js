'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/printController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Print a bill (any authenticated user — waiter or admin)
router.post('/bill/:sessionId', isAuthenticated, ctrl.printBill);

// Settings (admin only for write)
router.get('/settings', isAuthenticated, ctrl.getSettings);
router.post('/settings', isAuthenticated, isAdmin, ctrl.updateSettings);

// Print log (admin only)
router.get('/log', isAuthenticated, isAdmin, ctrl.getLog);

module.exports = router;
