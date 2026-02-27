const Expense = require('../models/Expense');

const expenseController = {
    add(req, res) {
        try {
            const { description, category, amount, date } = req.body;
            if (!description || !amount) {
                return res.status(400).json({ error: 'Təsvir və məbləğ tələb olunur' });
            }
            // Save custom category if new
            if (category) Expense.addCategory(category);

            const expense = Expense.add(
                description,
                category || 'Digər',
                parseFloat(amount),
                date,
                req.session.user.id,
                req.session.user.username
            );
            res.status(201).json(expense);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    getAll(req, res) {
        try {
            const expenses = Expense.getAll();
            res.json(expenses);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    update(req, res) {
        try {
            const { id } = req.params;
            const expense = Expense.update(id, req.body);
            res.json(expense);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    delete(req, res) {
        try {
            const { id } = req.params;
            Expense.delete(id);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    daily(req, res) {
        try {
            res.json(Expense.getDaily());
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    weekly(req, res) {
        try {
            res.json(Expense.getWeekly());
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    monthly(req, res) {
        try {
            res.json(Expense.getMonthly());
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    getCategories(req, res) {
        try {
            const categories = Expense.getCategories();
            res.json(categories);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = expenseController;
