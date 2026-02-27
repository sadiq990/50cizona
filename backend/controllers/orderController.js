const Order = require('../models/Order');

const orderController = {
    add(req, res) {
        try {
            const { sessionId, productId, quantity } = req.body;
            if (!sessionId || !productId) {
                return res.status(400).json({ error: 'Sessiya ID və məhsul ID tələb olunur' });
            }
            const items = Order.add(sessionId, productId, quantity || 1);
            if (items.error) return res.status(400).json(items);
            res.json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    remove(req, res) {
        try {
            const { sessionId, productId } = req.body;
            if (!sessionId || !productId) {
                return res.status(400).json({ error: 'Sessiya ID və məhsul ID tələb olunur' });
            }
            const items = Order.remove(sessionId, productId);
            res.json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    getBySession(req, res) {
        try {
            const { sessionId } = req.params;
            const items = Order.getBySession(sessionId);
            res.json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = orderController;
