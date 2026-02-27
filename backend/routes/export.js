const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.get('/excel', isAuthenticated, isAdmin, exportController.excel);

module.exports = router;
