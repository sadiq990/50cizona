const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { isAuthenticated } = require('../middleware/auth');

router.post('/add', isAuthenticated, orderController.add);
router.post('/remove', isAuthenticated, orderController.remove);
router.get('/:sessionId', isAuthenticated, orderController.getBySession);

module.exports = router;
