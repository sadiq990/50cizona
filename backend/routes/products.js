const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.get('/', isAuthenticated, productController.getAll);
router.get('/active', isAuthenticated, productController.getActive);
router.post('/', isAuthenticated, isAdmin, productController.create);
router.put('/:id', isAuthenticated, isAdmin, productController.update);
router.patch('/:id/deactivate', isAuthenticated, isAdmin, productController.deactivate);

module.exports = router;
