const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.get('/daily', isAuthenticated, reportController.daily);
router.get('/weekly', isAuthenticated, reportController.weekly);
router.get('/monthly', isAuthenticated, reportController.monthly);

module.exports = router;
