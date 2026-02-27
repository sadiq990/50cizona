const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/', isAuthenticated, tableController.getAll);
router.put('/:id/status', isAuthenticated, tableController.updateStatus);

module.exports = router;
