const express = require('express');
const router = express.Router();
const historyController = require('../controllers/sessionHistoryController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.get('/', isAuthenticated, isAdmin, historyController.getHistory);

module.exports = router;
