const express = require('express');
const router = express.Router();
const archiveController = require('../controllers/archiveController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// GET /api/archive/months
router.get('/months', isAuthenticated, isAdmin, archiveController.getMonths);

// GET /api/archive/2026-02
router.get('/:month', isAuthenticated, isAdmin, archiveController.getMonth);

module.exports = router;
