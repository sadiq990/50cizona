const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Both admin and waiter can add and view expenses
router.post('/add', isAuthenticated, expenseController.add);
router.get('/', isAuthenticated, expenseController.getAll);
router.get('/categories', isAuthenticated, expenseController.getCategories);
router.get('/daily', isAuthenticated, expenseController.daily);
router.get('/weekly', isAuthenticated, expenseController.weekly);
router.get('/monthly', isAuthenticated, expenseController.monthly);

// Only admin can edit/delete
router.put('/:id', isAuthenticated, isAdmin, expenseController.update);
router.delete('/:id', isAuthenticated, isAdmin, expenseController.delete);

module.exports = router;
