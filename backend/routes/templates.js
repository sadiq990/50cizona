const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/', isAuthenticated, templateController.list);
router.post('/add', isAuthenticated, templateController.create);
router.delete('/:id', isAuthenticated, templateController.delete);

module.exports = router;
