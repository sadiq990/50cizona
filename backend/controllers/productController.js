const Product = require('../models/Product');

const productController = {
    getAll(req, res) {
        try {
            const products = Product.getAll();
            res.json(products);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    getActive(req, res) {
        try {
            const products = Product.getActive();
            res.json(products);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    create(req, res) {
        try {
            const { name, price, category } = req.body;
            if (!name || !price) {
                return res.status(400).json({ error: 'Ad və qiymət tələb olunur' });
            }
            const product = Product.create(name, parseFloat(price), category);
            res.status(201).json(product);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    update(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            if (data.price) data.price = parseFloat(data.price);
            const product = Product.update(id, data);
            res.json(product);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    deactivate(req, res) {
        try {
            const { id } = req.params;
            const product = Product.deactivate(id);
            res.json(product);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = productController;
